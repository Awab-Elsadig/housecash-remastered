import { Item } from "../models/item.model.js";
import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";

export const createItem = async (req, res) => {
	const { name, price, description, members, createdBy, author } = req.body;

	try {
		const item = await Item.create({ name, price, description, members, createdBy, author });
		return res.status(201).json({ item });
	} catch (error) {
		console.error("Error creating item:", error);
		return res.status(500).json({ error: error.message || "Error creating item" });
	}
};

export const getItems = async (req, res) => {
	try {
		const items = await Item.find().exec();
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
		const updatedItem = await Item.findByIdAndUpdate(
			itemId,
			{ name, price, description, members, author },
			{ new: true, runValidators: true }
		).exec();

		if (!updatedItem) {
			return res.status(404).json({ error: "Item not found" });
		}

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
		const updatedItem = await Item.findOneAndUpdate(
			{ _id: itemId, "members.userID": userId },
			{ $set: { "members.$.paid": paid } },
			{ new: true }
		).exec();

		if (!updatedItem) {
			return res.status(404).json({ error: "Item not found or user not a member" });
		}

		return res.status(200).json({ success: true, item: updatedItem });
	} catch (error) {
		console.error("Error updating payment status:", error);
		return res.status(500).json({ error: error.message || "Error updating payment status" });
	}
};
