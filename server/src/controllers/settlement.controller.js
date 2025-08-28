import { Item } from "../models/item.model.js";
import AblyService from "../services/ablyService.js";
import { v4 as uuid } from "uuid";
import Payment from "../models/payment.model.js";
import mongoose from "mongoose";

// In-memory request store (ephemeral). For production use Redis.
const requests = new Map(); // requestId -> { fromUserId, toUserId, houseCode, createdAt }

// Helper to compute bilateral unpaid item IDs between two users
async function getBilateralUnpaidItemIds(houseCode, userA, userB) {
	// Fetch only items where both users are members OR one authored and other member
	const items = await Item.find({ houseCode, $or: [{ author: userA }, { author: userB }] });
	const ids = [];
	for (const it of items) {
		const aMember = it.members.find((m) => m.userID.toString() === userA.toString());
		const bMember = it.members.find((m) => m.userID.toString() === userB.toString());
		if (!aMember || !bMember) continue;
		// If author is A and B unpaid OR author B and A unpaid
		if (it.author.toString() === userA.toString() && !bMember.paid) ids.push(it._id);
		else if (it.author.toString() === userB.toString() && !aMember.paid) ids.push(it._id);
	}
	return ids;
}

export const requestSettlement = async (req, res) => {
	try {
		const fromUserId = req.user._id.toString();
		const houseCode = req.user.houseCode;
		const { targetUserId } = req.body;
		if (!targetUserId || targetUserId === fromUserId) return res.status(400).json({ error: "Invalid target user" });
		const requestId = uuid();
		const record = { id: requestId, fromUserId, toUserId: targetUserId, houseCode, createdAt: Date.now() };
		requests.set(requestId, record);
		// Broadcast to both users
		await Promise.all([
			AblyService.sendToHouse(houseCode, "fetchUpdate", { ts: Date.now() }),
			AblyService.sendToHouse(houseCode, "noop", {}), // placeholder
		]);
		const channelFrom = `user:settlement:${fromUserId}`;
		const channelTo = `user:settlement:${targetUserId}`;
		// Use direct channels for clarity (reusing same ably instance inside service not necessary here)
		// We'll piggy-back AblyService for uniform logging
		await AblyService.sendToHouse(houseCode, "_log", { action: "settlementRequest", requestId });
		// Publish to personal channels (bypass service helper)
		const ably = (await import("../utils/ablyConfig.js")).default;
		await ably.channels.get(channelFrom).publish("settlement:request", record);
		await ably.channels.get(channelTo).publish("settlement:request", record);
		res.json({ success: true, requestId });
	} catch (e) {
		console.error("requestSettlement error", e);
		res.status(500).json({ error: "Failed to create settlement request" });
	}
};

export const respondSettlement = async (req, res) => {
	try {
		console.log("Settlement response request:", req.body);
		const { requestId, accept, itemIds = [] } = req.body;
		const record = requests.get(requestId);

		if (!record) {
			console.log("Request not found for ID:", requestId);
			return res.status(404).json({ error: "Request not found" });
		}

		const userId = req.user._id.toString();
		if (userId !== record.toUserId) {
			console.log("User not authorized to respond:", userId, "vs", record.toUserId);
			return res.status(403).json({ error: "Only the recipient can respond to a settlement request." });
		}

		let processed = false;
		if (accept) {
			console.log("Processing settlement acceptance...");
			const ids = itemIds.length
				? itemIds
				: await getBilateralUnpaidItemIds(record.houseCode, record.fromUserId, record.toUserId);

			console.log("Items to settle:", ids);

			if (ids.length > 0) {
				const session = await mongoose.startSession();
				try {
					await session.withTransaction(async () => {
						// Mark items as paid
						const updateResult = await Item.updateMany(
							{ _id: { $in: ids }, houseCode: record.houseCode },
							{ $set: { "members.$[elem].paid": true } },
							{ arrayFilters: [{ "elem.userID": { $in: [record.fromUserId, record.toUserId] } }], session }
						);
						console.log("Items updated:", updateResult);

						// Calculate the total amount for the settlement
						const items = await Item.find({ _id: { $in: ids } }, null, { session });
						let totalAmount = 0;

						for (const item of items) {
							// Calculate the share amount for this item
							const shareAmount = item.price / item.members.length;
							totalAmount += shareAmount;
						}

						console.log("Settlement total amount:", totalAmount);

						// Create payment record
						const payment = new Payment({
							houseCode: record.houseCode,
							type: "settlement",
							fromUser: record.toUserId, // The one accepting and "paying"
							toUser: record.fromUserId, // The one who initiated
							amount: totalAmount,
							settledItemIds: ids,
							description: `Settlement of ${ids.length} items`,
						});
						const savedPayment = await payment.save({ session });
						console.log("Payment saved:", savedPayment._id);
					});
					processed = true;
					console.log("Settlement transaction completed successfully");
				} catch (error) {
					console.error("Transaction failed:", error);
					throw error;
				} finally {
					await session.endSession();
				}
			} else {
				console.log("No items to settle");
			}
		} else {
			console.log("Settlement declined");
		}

		const ably = (await import("../utils/ablyConfig.js")).default;
		const channelFrom = ably.channels.get(`user:settlement:${record.fromUserId}`);
		const channelTo = ably.channels.get(`user:settlement:${record.toUserId}`);
		const payload = { otherUserId: accept ? record.fromUserId : record.toUserId, processed };

		await channelFrom.publish(accept ? "settlement:completed" : "settlement:cancelled", payload);
		await channelTo.publish(accept ? "settlement:completed" : "settlement:cancelled", {
			...payload,
			otherUserId: record.fromUserId,
		});

		requests.delete(requestId);
		await AblyService.sendFetchUpdate(record.houseCode);
		res.json({ success: true, processed });
	} catch (e) {
		console.error("respondSettlement error", e);
		res.status(500).json({ error: "Failed to respond to settlement" });
	}
};

export const cancelSettlement = async (req, res) => {
	try {
		const { requestId } = req.body;
		const record = requests.get(requestId);
		if (!record) return res.status(404).json({ error: "Request not found" });
		if (record.fromUserId !== req.user._id.toString()) return res.status(403).json({ error: "Only origin can cancel" });
		const ably = (await import("../utils/ablyConfig.js")).default;
		await ably.channels
			.get(`user:settlement:${record.toUserId}`)
			.publish("settlement:cancelled", { otherUserId: record.fromUserId });
		await ably.channels
			.get(`user:settlement:${record.fromUserId}`)
			.publish("settlement:cancelled", { otherUserId: record.toUserId });
		requests.delete(requestId);
		res.json({ success: true });
	} catch (e) {
		console.error("cancelSettlement error", e);
		res.status(500).json({ error: "Failed to cancel settlement" });
	}
};
