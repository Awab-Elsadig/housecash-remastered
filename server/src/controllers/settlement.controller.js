import { Item } from "../models/item.model.js";
import AblyService from "../services/ablyService.js";
import { v4 as uuid } from "uuid";
import Payment from "../models/payment.model.js";
import { PaymentRequest } from "../models/paymentRequest.model.js";
import mongoose from "mongoose";

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
		const record = new PaymentRequest({
			requestId,
			type: "settlement",
			fromUserId,
			toUserId: targetUserId,
			houseCode,
			expiresAt: new Date(Date.now() + 60 * 1000), // 60 seconds from now
		});
		await record.save();
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
		const recordData = {
			id: record.requestId,
			type: record.type,
			fromUserId: record.fromUserId,
			toUserId: record.toUserId,
			houseCode: record.houseCode,
			createdAt: record.createdAt.getTime(),
		};
		await ably.channels.get(channelFrom).publish("settlement:request", recordData);
		await ably.channels.get(channelTo).publish("settlement:request", recordData);
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
		const record = await PaymentRequest.findOne({ requestId, status: "pending" });

		if (!record) {
			console.log("Request not found for ID:", requestId);
			return res.status(404).json({ error: "Request not found" });
		}

		const userId = req.user._id.toString();
		if (userId !== record.toUserId.toString()) {
			console.log("User not authorized to respond:", userId, "vs", record.toUserId);
			return res.status(403).json({ error: "Only the recipient can respond to a settlement request." });
		}

		let processed = false;
		if (accept) {
			console.log("Processing settlement acceptance...");
			const ids = itemIds.length
				? itemIds
				: await getBilateralUnpaidItemIds(record.houseCode, record.fromUserId.toString(), record.toUserId.toString());

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

						// Calculate totals and build snapshot from payer perspective (recipient who accepts)
						const items = await Item.find({ _id: { $in: ids } }, null, { session });
						let theyOwe = 0; // what initiator owes payer
						let youOwe = 0;  // what payer owes initiator
						const snapshotItems = [];
						for (const item of items) {
							const shareAmount = item.price / item.members.length;
							const payerId = record.toUserId;
							const otherId = record.fromUserId;
							if (item.author.toString() === payerId.toString()) {
								theyOwe += shareAmount; // other owes payer
								snapshotItems.push({ name: item.name, share: shareAmount, direction: "theyOwe" });
							} else if (item.author.toString() === otherId.toString()) {
								youOwe += shareAmount; // payer owes other
								snapshotItems.push({ name: item.name, share: shareAmount, direction: "youOwe" });
							}
						}
						const net = youOwe - theyOwe;
						const totalAmount = Math.abs(net);
						console.log("Settlement totals:", { totalAmount, theyOwe, youOwe, net });

						// Create payment record
						const payment = new Payment({
							houseCode: record.houseCode,
							type: "settlement",
							fromUser: record.toUserId, // The one accepting and "paying"
							toUser: record.fromUserId, // The one who initiated
							amount: totalAmount,
							settledItemIds: ids,
							description: `Settlement of ${ids.length} items`,
							settlementSnapshot: { theyOwe, youOwe, net },
							settlementItems: snapshotItems,
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

		// Update request status
		record.status = accept ? "approved" : "declined";
		await record.save();

		const ably = (await import("../utils/ablyConfig.js")).default;
		const channelFrom = ably.channels.get(`user:settlement:${record.fromUserId}`);
		const channelTo = ably.channels.get(`user:settlement:${record.toUserId}`);
		const payload = { otherUserId: accept ? record.fromUserId.toString() : record.toUserId.toString(), processed };

		await channelFrom.publish(accept ? "settlement:completed" : "settlement:cancelled", payload);
		await channelTo.publish(accept ? "settlement:completed" : "settlement:cancelled", {
			...payload,
			otherUserId: record.fromUserId.toString(),
		});
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
		const record = await PaymentRequest.findOne({ requestId, status: "pending" });
		if (!record) return res.status(404).json({ error: "Request not found" });
		if (record.fromUserId.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Only origin can cancel" });
		
		// Update request status
		record.status = "cancelled";
		await record.save();
		
		const ably = (await import("../utils/ablyConfig.js")).default;
		await ably.channels
			.get(`user:settlement:${record.toUserId}`)
			.publish("settlement:cancelled", { otherUserId: record.fromUserId.toString() });
		await ably.channels
			.get(`user:settlement:${record.fromUserId}`)
			.publish("settlement:cancelled", { otherUserId: record.toUserId.toString() });
		res.json({ success: true });
	} catch (e) {
		console.error("cancelSettlement error", e);
		res.status(500).json({ error: "Failed to cancel settlement" });
	}
};
