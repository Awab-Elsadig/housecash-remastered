import { Item } from "../models/item.model.js";
import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import AblyService from "../services/ablyService.js";

// Helper function to check if a payment transaction already exists for a specific item and user
const paymentTransactionExists = async (userId, itemId, transactionType) => {
	const existingTransaction = await PaymentTransaction.findOne({
		userId: userId,
		transactionType: transactionType,
		"items.id": itemId,
	});
	return !!existingTransaction;
};

export const createItem = async (req, res) => {
	const { name, price, description, members, createdBy, author } = req.body;

	try {
		// Get house code from the authenticated user
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house to create items" });
		}

		const item = await Item.create({
			name,
			price,
			description,
			members,
			createdBy,
			author,
			houseCode,
		});

		// Send Ably notification to update all house members
		await AblyService.sendItemUpdate(houseCode, {
			action: "created",
			item: item,
		});

		return res.status(201).json({ item });
	} catch (error) {
		console.error("Error creating item:", error);
		return res.status(500).json({ error: error.message || "Error creating item" });
	}
};

export const getItems = async (req, res) => {
	try {
		// Get house code from the authenticated user
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house to view items" });
		}

		// Filter items by house code
		const items = await Item.find({ houseCode }).exec();
		return res.status(200).json({ items });
	} catch (error) {
		console.error("Error fetching items:", error);
		return res.status(500).json({ error: error.message || "Error fetching items" });
	}
};

export const updateItem = async (req, res) => {
	const { itemId } = req.params;
	const { name, price, description, members, author } = req.body;

	try {
		// Get the original item to detect payment changes
		const originalItem = await Item.findById(itemId).exec();
		if (!originalItem) {
			return res.status(404).json({ error: "Item not found" });
		}

		const updatedItem = await Item.findByIdAndUpdate(
			itemId,
			{ name, price, description, members, author },
			{ new: true, runValidators: true }
		).exec();

		if (!updatedItem) {
			return res.status(404).json({ error: "Item not found" });
		}

		// Check for payment status changes to create payment transactions
		if (members && originalItem.members) {
			for (let i = 0; i < members.length; i++) {
				const newMember = members[i];
				const oldMember = originalItem.members.find((m) => m.userID.toString() === newMember.userID.toString());

				// If someone just marked themselves as paid (was false, now true)
				if (oldMember && !oldMember.paid && newMember.paid) {
					// Check if transaction already exists to prevent duplicates
					const transactionExists = await paymentTransactionExists(newMember.userID, updatedItem._id, "single_payment");

					if (!transactionExists) {
						// Get user information
						const payingUser = await User.findById(newMember.userID);
						const paidToUser = await User.findById(updatedItem.author);

						if (payingUser && paidToUser && payingUser.houseCode === paidToUser.houseCode) {
							// Create individual payment transaction
							const paymentTransaction = new PaymentTransaction({
								userId: newMember.userID,
								houseCode: payingUser.houseCode,
								transactionType: "single_payment",
								paidTo: {
									id: updatedItem.author,
									name: paidToUser.name,
								},
								items: [
									{
										id: updatedItem._id,
										name: updatedItem.name,
										originalPrice: updatedItem.price,
										yourShare: updatedItem.price / updatedItem.members.length,
										paidAmount: updatedItem.price / updatedItem.members.length,
									},
								],
								totalAmount: updatedItem.price / updatedItem.members.length,
								itemCount: 1,
								method: "Individual Payment",
								notes: "",
							});

							await paymentTransaction.save();
						}
					}
				}
			}
		}

		// Send Ably notification to update all house members
		await AblyService.sendItemUpdate(req.user.houseCode, {
			action: "updated",
			item: updatedItem,
		});

		return res.status(200).json({ item: updatedItem });
	} catch (error) {
		console.error("Error updating item:", error);
		return res.status(500).json({ error: error.message || "Error updating item" });
	}
};

export const deleteItem = async (req, res) => {
	const { itemId, userId, houseCode } = req.params; // Ensure these are passed in the URL or request body

	try {
		// Remove the item from the Item collection
		const item = await Item.findByIdAndDelete(itemId).exec();

		if (!item) {
			return res.status(404).json({ error: "Item not found" });
		}

		// Remove the item reference from the User document
		await User.findByIdAndUpdate(userId, { $pull: { items: itemId } }).exec();

		// Remove the item reference from the House document
		await House.findOneAndUpdate({ code: houseCode }, { $pull: { items: itemId } }).exec();

		return res.status(200).json({ item });
	} catch (error) {
		console.error("Error deleting item:", error);
		return res.status(500).json({ error: error.message || "Error deleting item" });
	}
};

export const getItemsByUserId = async (req, res) => {
	const { userId } = req.params;

	try {
		const items = await Item.find({
			$or: [{ members: { $elemMatch: { userID: userId } } }, { author: userId }, { createdBy: userId }],
		}).exec();

		return res.status(200).json({ items });
	} catch (error) {
		console.error("Error fetching items by user id:", error);
		return res.status(500).json({ error: error.message || "Error fetching items by user id" });
	}
};

/*
  New Endpoints for Payment Details Actions:
  
  - getAllItems: For items authored by the current user, mark the specified member’s got field as true
  - undoGetAll: Revert the changes made by getAllItems (set got to false)
  - payAll: For items where the current user is a member and owes money, mark the current user’s paid field as true
  - undoPayAll: Revert the changes made by payAll (set paid to false)
*/

export const getAllItems = async (req, res) => {
	// Expects { memberId, userId } in the request body
	const { memberId, userId } = req.body;
	try {
		const result = await Item.updateMany(
			{ author: userId },
			{ $set: { "members.$[elem].got": true } },
			{ arrayFilters: [{ "elem.userID": memberId, "elem.paid": true, "elem.got": false }] }
		).exec();
		return res.status(200).json({ result });
	} catch (error) {
		console.error("Error in get-all:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const undoGetAll = async (req, res) => {
	// Expects { memberId, userId } in the request body
	const { memberId, userId } = req.body;
	try {
		const result = await Item.updateMany(
			{ author: userId },
			{ $set: { "members.$[elem].got": false } },
			{ arrayFilters: [{ "elem.userID": memberId, "elem.got": true }] }
		).exec();
		return res.status(200).json({ result });
	} catch (error) {
		console.error("Error in undo-get-all:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const payAll = async (req, res) => {
	// Expects { memberId, userId } in the request body
	// Here, memberId represents the user who is the creditor (i.e. the one you owe),
	// and userId is the current user who needs to mark their own payments as true.
	const { memberId, userId } = req.body;
	try {
		// First, get the items that will be updated to create the payment transaction
		const itemsToUpdate = await Item.find({
			author: memberId,
			"members.userID": userId,
			"members.paid": false,
		}).exec();

		// Filter to only get items where this user hasn't paid
		const unpaidItems = itemsToUpdate.filter((item) => {
			const userMember = item.members.find((m) => m.userID.toString() === userId.toString());
			return userMember && !userMember.paid;
		});

		if (unpaidItems.length > 0) {
			// Check if a bulk payment transaction already exists for this user and author
			const existingBulkTransaction = await PaymentTransaction.findOne({
				userId: userId,
				"paidTo.id": memberId,
				transactionType: "bulk_payment",
				createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Within last 5 minutes
			});

			if (!existingBulkTransaction) {
				// Get the payer (who we're paying to) information
				const paidToUser = await User.findById(memberId);
				const payingUser = await User.findById(userId);

				if (paidToUser && payingUser && paidToUser.houseCode === payingUser.houseCode) {
					// Calculate payment details
					const items = unpaidItems.map((item) => ({
						id: item._id,
						name: item.name,
						originalPrice: item.price,
						yourShare: item.price / item.members.length,
						paidAmount: item.price / item.members.length,
					}));

					const totalAmount = items.reduce((sum, item) => sum + item.yourShare, 0);

					// Create payment transaction
					const paymentTransaction = new PaymentTransaction({
						userId: userId,
						houseCode: payingUser.houseCode,
						transactionType: "bulk_payment",
						paidTo: {
							id: memberId,
							name: paidToUser.name,
						},
						items: items,
						totalAmount: totalAmount,
						itemCount: items.length,
						method: "Bulk Payment",
						notes: "",
					});

					await paymentTransaction.save();
				}
			}
		}

		// Now update the payment status
		const result = await Item.updateMany(
			{ author: memberId },
			{ $set: { "members.$[elem].paid": true } },
			{ arrayFilters: [{ "elem.userID": userId, "elem.paid": false }] }
		).exec();

		return res.status(200).json({ result });
	} catch (error) {
		console.error("Error in pay-all:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const undoPayAll = async (req, res) => {
	// Expects { memberId, userId } in the request body.
	const { memberId, userId } = req.body;
	try {
		const result = await Item.updateMany(
			{ author: memberId },
			{ $set: { "members.$[elem].paid": false } },
			{ arrayFilters: [{ "elem.userID": userId, "elem.paid": true }] }
		).exec();
		return res.status(200).json({ result });
	} catch (error) {
		console.error("Error in undo-pay-all:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const updatePaymentStatus = async (req, res) => {
	const { itemId } = req.params;
	const { userId, paid } = req.body;

	try {
		// Get the original item to check current payment status
		const originalItem = await Item.findById(itemId).exec();
		if (!originalItem) {
			return res.status(404).json({ error: "Item not found" });
		}

		const originalMember = originalItem.members.find((m) => m.userID.toString() === userId.toString());
		if (!originalMember) {
			return res.status(404).json({ error: "User not a member of this item" });
		}

		const updatedItem = await Item.findOneAndUpdate(
			{ _id: itemId, "members.userID": userId },
			{ $set: { "members.$.paid": paid } },
			{ new: true }
		).exec();

		if (!updatedItem) {
			return res.status(404).json({ error: "Item not found or user not a member" });
		}

		// If payment status changed from false to true, create payment transaction
		if (!originalMember.paid && paid) {
			// Check if transaction already exists to prevent duplicates
			const transactionExists = await paymentTransactionExists(userId, itemId, "single_payment");

			if (!transactionExists) {
				// Get user information
				const payingUser = await User.findById(userId);
				const paidToUser = await User.findById(updatedItem.author);

				if (payingUser && paidToUser && payingUser.houseCode === paidToUser.houseCode) {
					// Create individual payment transaction
					const paymentTransaction = new PaymentTransaction({
						userId: userId,
						houseCode: payingUser.houseCode,
						transactionType: "single_payment",
						paidTo: {
							id: updatedItem.author,
							name: paidToUser.name,
						},
						items: [
							{
								id: updatedItem._id,
								name: updatedItem.name,
								originalPrice: updatedItem.price,
								yourShare: updatedItem.price / updatedItem.members.length,
								paidAmount: updatedItem.price / updatedItem.members.length,
							},
						],
						totalAmount: updatedItem.price / updatedItem.members.length,
						itemCount: 1,
						method: "Individual Payment",
						notes: "",
					});

					await paymentTransaction.save();
				}
			}
		}

		return res.status(200).json({ success: true, item: updatedItem });
	} catch (error) {
		console.error("Error updating payment status:", error);
		return res.status(500).json({ error: error.message || "Error updating payment status" });
	}
};

export const resolveBalance = async (req, res) => {
	console.log("=== RESOLVE BALANCE ENDPOINT HIT ===");
	const { senderId, recipientId, items, direction } = req.body;

	console.log("resolveBalance called with:", { senderId, recipientId, items, direction });
	console.log("Request user:", req.user);

	try {
		// Get house code from the authenticated user
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house" });
		}

		console.log("House code:", houseCode);
		console.log("Authenticated user:", req.user._id.toString());

		// Validate that the authenticated user is the recipient or sender (for owing items)
		if (req.user._id.toString() !== recipientId && req.user._id.toString() !== senderId) {
			return res.status(403).json({ error: "Unauthorized: You must be involved in this settlement" });
		}

		// Extract item IDs and handle different item structures
		const itemIds = items.map((item) => item.id || item._id);
		console.log("Item IDs to update:", itemIds);
		console.log("Full items data:", JSON.stringify(items, null, 2));

		let updatePromises = [];

		if (direction === "paying") {
			console.log("Processing payment direction - sender paying recipient");
			console.log(`Looking for items where sender ${senderId} is a member and needs to be marked as paid`);

			// Sender is paying recipient: mark sender as paid
			updatePromises = itemIds.map(async (itemId) => {
				console.log(`Trying to update item ${itemId} for sender ${senderId}`);

				// First, let's check if the item exists and what its structure is
				const item = await Item.findById(itemId);
				if (item) {
					console.log(`Found item ${itemId}:`, {
						id: item._id,
						author: item.author,
						houseCode: item.houseCode,
						members: item.members.map((m) => ({ userID: m.userID, paid: m.paid })),
					});
				} else {
					console.log(`Item ${itemId} not found`);
				}

				return Item.findOneAndUpdate(
					{
						_id: itemId,
						houseCode,
						"members.userID": senderId,
					},
					{
						$set: { "members.$.paid": true },
					},
					{ new: true }
				);
			});
		} else if (direction === "collecting") {
			console.log("Processing collecting direction - sender collecting from recipient");
			console.log(`Looking for items authored by ${senderId} where recipient ${recipientId} is a member`);

			// Direction is 'collecting': sender is collecting from recipient
			// This means recipient owes money to sender, so mark recipient as paid
			updatePromises = itemIds.map(async (itemId) => {
				console.log(`Trying to update item ${itemId} for recipient ${recipientId} authored by ${senderId}`);

				// First, let's check if the item exists and what its structure is
				const item = await Item.findById(itemId);
				if (item) {
					console.log(`Found item ${itemId}:`, {
						id: item._id,
						author: item.author,
						houseCode: item.houseCode,
						members: item.members.map((m) => ({ userID: m.userID, paid: m.paid })),
					});
				} else {
					console.log(`Item ${itemId} not found`);
				}

				return Item.findOneAndUpdate(
					{
						_id: itemId,
						houseCode,
						author: senderId,
						"members.userID": recipientId,
					},
					{
						$set: { "members.$.paid": true },
					},
					{ new: true }
				);
			});
		} else {
			console.log("Invalid direction:", direction);
			return res.status(400).json({ error: "Invalid direction specified" });
		}

		const updatedItems = await Promise.all(updatePromises);
		console.log(
			"Update results:",
			updatedItems.map((item) => (item ? item._id : null))
		);

		// Filter out null results (items not found or user not a member)
		const successfulUpdates = updatedItems.filter((item) => item !== null);

		console.log("Successful updates count:", successfulUpdates.length);

		if (successfulUpdates.length === 0) {
			console.log("No successful updates - debugging info:");
			console.log("- House code:", houseCode);
			console.log("- Sender ID:", senderId);
			console.log("- Recipient ID:", recipientId);
			console.log("- Direction:", direction);
			console.log("- Item IDs:", itemIds);

			return res.status(404).json({ error: "No items found or user not a member of specified items" });
		}

		// Send Ably notification to update all house members
		await AblyService.sendFetchUpdate(houseCode);

		return res.status(200).json({
			success: true,
			message: `Successfully resolved ${successfulUpdates.length} items`,
			updatedItems: successfulUpdates,
			direction: direction,
		});
	} catch (error) {
		console.error("Error resolving balance:", error);
		return res.status(500).json({ error: error.message || "Error resolving balance" });
	}
};

// Batch resolve balances for settlement - more efficient than individual calls
export const resolveBalanceBatch = async (req, res) => {
	console.log("=== BATCH RESOLVE BALANCE ENDPOINT HIT ===");
	const { items } = req.body;

	console.log("resolveBalanceBatch called with items:", items);
	console.log("Request user:", req.user);

	try {
		// Get house code from the authenticated user
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house" });
		}

		console.log("House code:", houseCode);
		console.log("Authenticated user:", req.user._id.toString());

		if (!items || items.length === 0) {
			return res.status(400).json({ error: "No items provided for batch resolution" });
		}

		let successfulUpdates = 0;
		const updatePromises = [];

		for (const itemData of items) {
			const { id, senderId, recipientId, direction } = itemData;

			console.log(`Processing item ${id} with direction ${direction}, sender: ${senderId}, recipient: ${recipientId}`);

			// Validate that the authenticated user is involved in this transaction
			if (req.user._id.toString() !== recipientId && req.user._id.toString() !== senderId) {
				console.log(`Skipping item ${id} - user not involved`);
				continue;
			}

			if (direction === "paying") {
				// Sender is paying recipient: mark sender as paid
				const updatePromise = Item.findOneAndUpdate(
					{
						_id: id,
						houseCode,
						"members.userID": senderId,
					},
					{
						$set: { "members.$.paid": true },
					},
					{ new: true }
				).then((result) => {
					if (result) {
						console.log(`Successfully updated item ${id} for sender ${senderId}`);
						return result;
					} else {
						console.log(`Failed to update item ${id} for sender ${senderId}`);
						return null;
					}
				});

				updatePromises.push(updatePromise);
			}
		}

		const results = await Promise.all(updatePromises);
		successfulUpdates = results.filter((result) => result !== null).length;

		console.log("Batch update completed:", { totalItems: items.length, successfulUpdates });

		if (successfulUpdates === 0) {
			return res.status(404).json({ error: "No items were successfully updated" });
		}

		// Send Ably notification to update all house members
		await AblyService.sendFetchUpdate(houseCode);

		return res.status(200).json({
			success: true,
			message: `Successfully resolved ${successfulUpdates} items in batch`,
			totalProcessed: items.length,
			successfulUpdates,
		});
	} catch (error) {
		console.error("Error in batch resolve balance:", error);
		return res.status(500).json({ error: error.message || "Error resolving balance batch" });
	}
};
