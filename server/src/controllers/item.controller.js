import { Item } from "../models/item.model.js";
import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import AblyService from "../services/ablyService.js";
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";

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
			// Force houseCode to be set from auth user to avoid missing houseCode
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
		console.log("=== GET ITEMS ENDPOINT HIT ===");
		console.log("Request user:", req.user);
		
		// Get house code from the authenticated user
		const houseCode = req.user?.houseCode;
		console.log("House code from user:", houseCode);
		
		if (!houseCode) {
			console.log("ERROR: No house code found for user");
			return res.status(400).json({ error: "User must belong to a house to view items" });
		}

		console.log("Searching for items with houseCode:", houseCode);
		
		// Filter items by house code
		const items = await Item.find({ houseCode }).sort({ createdAt: -1 }).exec();
		
		console.log("=== ITEMS QUERY RESULTS ===");
		console.log("Total items found:", items.length);
		console.log("Items:", items.map(item => ({
			id: item._id,
			name: item.name,
			price: item.price,
			houseCode: item.houseCode,
			author: item.author,
			membersCount: item.members?.length || 0,
			createdAt: item.createdAt
		})));
		console.log("=== END ITEMS QUERY RESULTS ===");
		
		return res.status(200).json({ items });
	} catch (error) {
		console.error("Error fetching items:", error);
		return res.status(500).json({ error: error.message || "Error fetching items" });
	}
};

// Diagnostic: summarize items returned for the current user's house and flag potential data issues
export const getItemsDebugSummary = async (req, res) => {
	try {
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house to view items" });
		}

		const items = await Item.find({ houseCode }).lean().exec();
		const total = items.length;

		const invalidAuthors = [];
		const invalidMembers = [];

		for (const it of items) {
			// Author should be a valid ObjectId
			const authorValid = mongoose.Types.ObjectId.isValid(String(it.author || ""));
			if (!authorValid) {
				invalidAuthors.push({ id: it._id, author: it.author });
			}

			// Members should be non-empty array with valid userID ObjectIds
			if (!Array.isArray(it.members) || it.members.length === 0) {
				invalidMembers.push({ id: it._id, reason: "no_members" });
			} else {
				const bad = it.members.filter((m) => !m || !mongoose.Types.ObjectId.isValid(String(m.userID || "")));
				if (bad.length) {
					invalidMembers.push({ id: it._id, badCount: bad.length });
				}
			}
		}

		return res.status(200).json({
			houseCode,
			total,
			invalidAuthorCount: invalidAuthors.length,
			invalidMemberCount: invalidMembers.length,
			sampleInvalidAuthors: invalidAuthors.slice(0, 10),
			sampleInvalidMembers: invalidMembers.slice(0, 10),
		});
	} catch (error) {
		console.error("Error in getItemsDebugSummary:", error);
		return res.status(500).json({ error: error.message || "Error building items summary" });
	}
};

// Deep diagnostics: return all items with validation flags to spot mismatches
export const getItemsDiagnostics = async (req, res) => {
	try {
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house to view items" });
		}

		// Get all users in the same house for membership checks
		const houseUsers = await User.find({ houseCode }).select("_id").lean();
		const houseUserIds = new Set(houseUsers.map((u) => String(u._id)));

		const items = await Item.find({ houseCode }).sort({ createdAt: -1 }).lean();

		const diagnostics = [];
		let invalidAuthorCount = 0;
		let authorNotInHouseCount = 0;
		let invalidMembersCount = 0;
		let membersNotInHouseCount = 0;
		let houseCodeMismatchCount = 0;

		for (const it of items) {
			const authorStr = String(it.author || "");
			const authorValid = mongoose.Types.ObjectId.isValid(authorStr);
			const authorIsMember = houseUserIds.has(authorStr);

			const members = Array.isArray(it.members) ? it.members : [];
			const invalidMemberIds = members
				.filter((m) => !m || !mongoose.Types.ObjectId.isValid(String(m.userID || "")))
				.map((m) => (m ? m.userID : null));
			const membersNotInHouse = members
				.filter((m) => m && mongoose.Types.ObjectId.isValid(String(m.userID)) && !houseUserIds.has(String(m.userID)))
				.map((m) => String(m.userID));

			const houseCodeMismatch = it.houseCode !== houseCode;

			if (!authorValid) invalidAuthorCount++;
			if (authorValid && !authorIsMember) authorNotInHouseCount++;
			if (invalidMemberIds.length) invalidMembersCount += invalidMemberIds.length;
			if (membersNotInHouse.length) membersNotInHouseCount += membersNotInHouse.length;
			if (houseCodeMismatch) houseCodeMismatchCount++;

			diagnostics.push({
				id: it._id,
				name: it.name,
				price: it.price,
				createdAt: it.createdAt,
				updatedAt: it.updatedAt,
				houseCode: it.houseCode,
				author: it.author,
				authorStr,
				authorValid,
				authorIsMember,
				membersCount: members.length,
				invalidMemberIds,
				membersNotInHouse,
				houseCodeMismatch,
			});
		}

		return res.status(200).json({
			houseCode,
			total: items.length,
			invalidAuthorCount,
			authorNotInHouseCount,
			invalidMembersCount,
			membersNotInHouseCount,
			houseCodeMismatchCount,
			items: diagnostics,
		});
	} catch (error) {
		console.error("Error in getItemsDiagnostics:", error);
		return res.status(500).json({ error: error.message || "Error building items diagnostics" });
	}
};

// Investigation endpoint: find items likely excluded from house fetch
export const getItemsInvestigation = async (req, res) => {
	try {
		const houseCode = req.user?.houseCode;
		if (!houseCode) {
			return res.status(400).json({ error: "User must belong to a house to view items" });
		}

		const houseUsers = await User.find({ houseCode }).select("_id").lean();
		const houseUserIds = houseUsers.map((u) => u._id);

		// Items returned by normal fetch (ground truth baseline)
		const itemsForHouse = await Item.find({ houseCode }).select("_id createdAt name").lean();

		// Counts by houseCode to spot typos/casing issues
		const countsByHouse = await Item.aggregate([
			{ $group: { _id: "$houseCode", count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		]);

		// Items that involve house users but have a different houseCode (strays)
		const strayByAuthor = await Item.find({
			author: { $in: houseUserIds },
			houseCode: { $ne: houseCode },
		})
			.select("_id houseCode author createdAt name")
			.sort({ createdAt: -1 })
			.lean();

		const strayByMember = await Item.find({
			"members.userID": { $in: houseUserIds },
			houseCode: { $ne: houseCode },
		})
			.select("_id houseCode author createdAt name members.userID")
			.sort({ createdAt: -1 })
			.lean();

		// Items with missing/empty houseCode
		const missingHouseCode = await Item.find({
			$or: [{ houseCode: { $exists: false } }, { houseCode: null }, { houseCode: "" }],
		})
			.select("_id author createdAt name members.userID")
			.sort({ createdAt: -1 })
			.lean();

		// Totals
		const baselineCount = itemsForHouse.length;
		const strayUniqueIds = new Set([
			...strayByAuthor.map((i) => String(i._id)),
			...strayByMember.map((i) => String(i._id)),
			...missingHouseCode.map((i) => String(i._id)),
		]);

		return res.status(200).json({
			houseCode,
			baselineCount, // what GET /get-items would return
			countsByHouse, // distribution across all houseCodes
			strayByAuthorCount: strayByAuthor.length,
			strayByMemberCount: strayByMember.length,
			missingHouseCodeCount: missingHouseCode.length,
			estimatedMissingTotal: strayUniqueIds.size,
			strayByAuthor: strayByAuthor.slice(0, 50), // cap payload
			strayByMember: strayByMember.slice(0, 50),
			missingHouseCode: missingHouseCode.slice(0, 50),
		});
	} catch (error) {
		console.error("Error in getItemsInvestigation:", error);
		return res.status(500).json({ error: error.message || "Error running items investigation" });
	}
};

// List items missing houseCode
export const listItemsMissingHouseCode = async (req, res) => {
	try {
		const items = await Item.find({
			$or: [{ houseCode: { $exists: false } }, { houseCode: null }, { houseCode: "" }],
		})
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({ total: items.length, items });
	} catch (error) {
		console.error("Error in listItemsMissingHouseCode:", error);
		return res.status(500).json({ error: error.message || "Error listing items with missing houseCode" });
	}
};

// Backfill missing houseCode using author -> createdBy -> members
export const backfillItemsHouseCode = async (req, res) => {
	try {
		// Find all items with missing/empty houseCode
		const missing = await Item.find({
			$or: [{ houseCode: { $exists: false } }, { houseCode: null }, { houseCode: "" }],
		})
			.select("_id author createdBy members houseCode")
			.lean();

		let updated = 0;
		let failed = 0;
		const failures = [];
		const updatedIds = [];
		const updatedHouseCodes = new Set();

		for (const it of missing) {
			let houseCode = null;

			// Try author
			if (it.author && mongoose.Types.ObjectId.isValid(String(it.author))) {
				const u = await User.findById(it.author).select("houseCode").lean();
				if (u?.houseCode) houseCode = u.houseCode;
			}

			// Try createdBy
			if (!houseCode && it.createdBy && mongoose.Types.ObjectId.isValid(String(it.createdBy))) {
				const u = await User.findById(it.createdBy).select("houseCode").lean();
				if (u?.houseCode) houseCode = u.houseCode;
			}

			// Try members consensus
			if (!houseCode && Array.isArray(it.members) && it.members.length) {
				const memberIds = it.members
					.map((m) => (m && mongoose.Types.ObjectId.isValid(String(m.userID)) ? String(m.userID) : null))
					.filter(Boolean);
				if (memberIds.length) {
					const memberUsers = await User.find({ _id: { $in: memberIds } })
						.select("houseCode")
						.lean();
					const codes = Array.from(new Set(memberUsers.map((m) => m.houseCode).filter(Boolean)));
					if (codes.length === 1) houseCode = codes[0];
				}
			}

			if (houseCode) {
				const result = await Item.updateOne({ _id: it._id }, { $set: { houseCode } }).exec();
				if (result.modifiedCount === 1) {
					updated++;
					updatedIds.push(it._id);
					updatedHouseCodes.add(houseCode);
				} else {
					failed++;
					failures.push({ id: it._id, reason: "update_failed" });
				}
			} else {
				failed++;
				failures.push({ id: it._id, reason: "could_not_derive_houseCode" });
			}
		}

		// Notify houses to refresh
		for (const code of updatedHouseCodes) {
			try {
				await AblyService.sendFetchUpdate(code);
			} catch (_) {
				// ignore notification errors
			}
		}

		return res.status(200).json({
			totalMissing: missing.length,
			updated,
			failed,
			updatedIds,
			failures: failures.slice(0, 100),
		});
	} catch (error) {
		console.error("Error in backfillItemsHouseCode:", error);
		return res.status(500).json({ error: error.message || "Error backfilling items houseCode" });
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
					const payingUser = await User.findById(newMember.userID);
					const paidToUser = await User.findById(updatedItem.author);

					if (payingUser && paidToUser && payingUser.houseCode === paidToUser.houseCode) {
						const payment = new Payment({
							houseCode: payingUser.houseCode,
							type: "single",
							fromUser: newMember.userID,
							toUser: updatedItem.author,
							amount: updatedItem.price / updatedItem.members.length,
							settledItemId: updatedItem._id,
						});
						await payment.save();
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
		// Since we removed 'got', this endpoint is no longer needed
		// Items are automatically marked as paid when payment is confirmed
		return res.status(200).json({ message: "This endpoint is deprecated. Items are automatically marked as paid when payment is confirmed." });
	} catch (error) {
		console.error("Error in get-all:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const undoGetAll = async (req, res) => {
	// Expects { memberId, userId } in the request body
	const { memberId, userId } = req.body;
	try {
		// Since we removed 'got', this endpoint is no longer needed
		// Items are automatically marked as paid when payment is confirmed
		return res.status(200).json({ message: "This endpoint is deprecated. Items are automatically marked as paid when payment is confirmed." });
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
			const paidToUser = await User.findById(memberId);
			const payingUser = await User.findById(userId);

			if (paidToUser && payingUser && paidToUser.houseCode === payingUser.houseCode) {
				const totalAmount = unpaidItems.reduce((sum, item) => sum + item.price / item.members.length, 0);

				const payment = new Payment({
					houseCode: payingUser.houseCode,
					type: "bulk",
					fromUser: userId,
					toUser: memberId,
					amount: totalAmount,
					settledItemIds: unpaidItems.map((item) => item._id),
				});
				await payment.save();
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
					const payment = new Payment({
						houseCode: payingUser.houseCode,
						type: "single",
						fromUser: userId,
						toUser: updatedItem.author,
						amount: updatedItem.price / updatedItem.members.length,
						settledItemId: updatedItem._id,
					});
					await payment.save();
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
	const { items, userIds, settlementId } = req.body;

	console.log("resolveBalanceBatch called with:", { items, userIds, settlementId });
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

		if (!userIds || userIds.length !== 2) {
			return res.status(400).json({ error: "Exactly two user IDs must be provided for settlement" });
		}

		// Validate that the authenticated user is one of the users involved
		if (!userIds.includes(req.user._id.toString())) {
			return res.status(403).json({ error: "Unauthorized: You must be involved in this settlement" });
		}

		let successfulUpdates = 0;
		const updatePromises = [];

		// Extract item IDs
		const itemIds = items.map((item) => item.id || item._id);
		console.log("Processing item IDs:", itemIds);

		for (const itemId of itemIds) {
			console.log(`Processing item ${itemId} for settlement between users: ${userIds.join(", ")}`);

			// Get the item to determine author and members
			const item = await Item.findById(itemId);
			if (!item) {
				console.log(`Item ${itemId} not found, skipping`);
				continue;
			}

			console.log(`Item ${itemId} details:`, {
				author: item.author,
				members: item.members.map((m) => ({ userID: m.userID, paid: m.paid })),
			});

			// For settlement, mark unpaid members as paid (this clears the debt)
			for (const userId of userIds) {
				const memberIndex = item.members.findIndex((m) => m.userID.toString() === userId);
				if (memberIndex !== -1 && !item.members[memberIndex].paid) {
					console.log(`Marking user ${userId} as paid for item ${itemId} (settlement)`);

					const updatePromise = Item.findOneAndUpdate(
						{
							_id: itemId,
							houseCode,
							"members.userID": userId,
						},
						{
							$set: { "members.$.paid": true },
						},
						{ new: true }
					).then((result) => {
						if (result) {
							console.log(`Successfully updated item ${itemId} for user ${userId} - marked as paid`);
							return result;
						} else {
							console.log(`Failed to update item ${itemId} for user ${userId}`);
							return null;
						}
					});

					updatePromises.push(updatePromise);
				} else {
					console.log(`User ${userId} already paid for item ${itemId} or not found`);
				}
			}
		}

		const results = await Promise.all(updatePromises);
		successfulUpdates = results.filter((result) => result !== null).length;

		console.log("Batch settlement update completed:", {
			totalItems: items.length,
			successfulUpdates,
			settlementId,
		});

		if (successfulUpdates === 0) {
			return res.status(404).json({ error: "No items were successfully updated in settlement" });
		}

		// Send Ably notification to update all house members
		await AblyService.sendFetchUpdate(houseCode);

		return res.status(200).json({
			success: true,
			message: `Successfully resolved ${successfulUpdates} items in settlement`,
			totalProcessed: items.length,
			successfulUpdates,
			settlementId,
		});
	} catch (error) {
		console.error("Error in batch resolve balance:", error);
		return res.status(500).json({ error: error.message || "Error resolving balance batch" });
	}
};

// Debug endpoint to check all items in database
export const getAllItemsDebug = async (req, res) => {
	try {
		console.log("=== GET ALL ITEMS DEBUG ENDPOINT HIT ===");
		
		// Get all items from database
		const allItems = await Item.find({}).sort({ createdAt: -1 }).exec();
		
		console.log("=== ALL ITEMS IN DATABASE ===");
		console.log("Total items in database:", allItems.length);
		console.log("Items:", allItems.map(item => ({
			id: item._id,
			name: item.name,
			price: item.price,
			houseCode: item.houseCode,
			author: item.author,
			membersCount: item.members?.length || 0,
			createdAt: item.createdAt
		})));
		console.log("=== END ALL ITEMS IN DATABASE ===");
		
		// Get all users
		const allUsers = await User.find({}).select('_id email houseCode').exec();
		console.log("=== ALL USERS IN DATABASE ===");
		console.log("Total users:", allUsers.length);
		console.log("Users:", allUsers.map(user => ({
			id: user._id,
			email: user.email,
			houseCode: user.houseCode
		})));
		console.log("=== END ALL USERS IN DATABASE ===");
		
		return res.status(200).json({ 
			allItems: allItems.length,
			allUsers: allUsers.length,
			items: allItems,
			users: allUsers
		});
	} catch (error) {
		console.error("Error in getAllItemsDebug:", error);
		return res.status(500).json({ error: error.message || "Error getting all items debug" });
	}
};
