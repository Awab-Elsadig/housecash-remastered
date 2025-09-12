import { v4 as uuid } from "uuid";
import AblyService from "../services/ablyService.js";
import { Item } from "../models/item.model.js";
import Payment from "../models/payment.model.js";

// In-memory request store: requestId -> { type, fromUserId, toUserId, houseCode, items, createdAt }
const requests = new Map();

export const requestPaymentApproval = async (req, res) => {
  try {
    const fromUserId = req.user._id.toString();
    const houseCode = req.user.houseCode;
    const { toUserId, itemIds } = req.body;

    if (!toUserId || toUserId === fromUserId) return res.status(400).json({ error: "Invalid target user" });
    if (!Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ error: "itemIds required" });

    // Optionally validate that items belong to same house and toUserId is author of those items
    const items = await Item.find({ _id: { $in: itemIds }, houseCode });
    if (items.length !== itemIds.length) return res.status(400).json({ error: "Invalid items" });
    const allToUserAuthor = items.every((it) => it.author.toString() === toUserId.toString());
    if (!allToUserAuthor) return res.status(400).json({ error: "Items must belong to the recipient as author" });

    const id = uuid();
    const record = { id, type: "payment", fromUserId, toUserId, houseCode, items: itemIds, createdAt: Date.now() };
    requests.set(id, record);

    // Notify both users via personal channels
    const ably = (await import("../utils/ablyConfig.js")).default;
    await ably.channels.get(`user:payment:${fromUserId}`).publish("payment:request", record);
    await ably.channels.get(`user:payment:${toUserId}`).publish("payment:request", record);
    await AblyService.sendToHouse(houseCode, "_log", { action: "paymentRequest", requestId: id });

    res.json({ success: true, requestId: id });
  } catch (e) {
    console.error("requestPaymentApproval error", e);
    res.status(500).json({ error: "Failed to create payment approval request" });
  }
};

export const respondPaymentApproval = async (req, res) => {
  try {
    const { requestId, accept } = req.body;
    const record = requests.get(requestId);
    if (!record) return res.status(404).json({ error: "Request not found" });

    const userId = req.user._id.toString();
    if (userId !== record.toUserId) return res.status(403).json({ error: "Only recipient can respond" });

    let processed = false;
    if (accept) {
      // Mark items as paid for the requester user
      const memberUserId = record.fromUserId;
      const update = await Item.updateMany(
        { _id: { $in: record.items }, houseCode: record.houseCode },
        { $set: { "members.$[m].paid": true, "members.$[m].got": true } },
        { arrayFilters: [{ "m.userID": memberUserId }] }
      );

      // Calculate total amount and create a Payment record of type single or bulk
      const updatedItems = await Item.find({ _id: { $in: record.items } });
      const total = updatedItems.reduce((sum, it) => sum + it.price / (it.members.length || 1), 0);
      const payment = new Payment({
        houseCode: record.houseCode,
        type: record.items.length === 1 ? "single" : "bulk",
        fromUser: record.fromUserId,
        toUser: record.toUserId,
        amount: total,
        settledItemIds: record.items,
        settledItemId: record.items.length === 1 ? record.items[0] : undefined,
      });
      await payment.save();
      processed = update.modifiedCount > 0;
    }

    // Notify both users and refresh house
    const ably = (await import("../utils/ablyConfig.js")).default;
    const channelFrom = ably.channels.get(`user:payment:${record.fromUserId}`);
    const channelTo = ably.channels.get(`user:payment:${record.toUserId}`);
    await channelFrom.publish(accept ? "payment:approved" : "payment:declined", { otherUserId: record.toUserId, items: record.items });
    await channelTo.publish(accept ? "payment:approved" : "payment:declined", { otherUserId: record.fromUserId, items: record.items });
    await AblyService.sendFetchUpdate(record.houseCode);

    requests.delete(requestId);
    res.json({ success: true, processed });
  } catch (e) {
    console.error("respondPaymentApproval error", e);
    res.status(500).json({ error: "Failed to respond to payment approval" });
  }
};

export const cancelPaymentApproval = async (req, res) => {
  try {
    const { requestId } = req.body;
    const record = requests.get(requestId);
    if (!record) return res.status(404).json({ error: "Request not found" });
    const userId = req.user._id.toString();
    if (userId !== record.fromUserId) return res.status(403).json({ error: "Only sender can cancel" });

    const ably = (await import("../utils/ablyConfig.js")).default;
    await ably.channels.get(`user:payment:${record.fromUserId}`).publish("payment:cancelled", { otherUserId: record.toUserId, items: record.items });
    await ably.channels.get(`user:payment:${record.toUserId}`).publish("payment:cancelled", { otherUserId: record.fromUserId, items: record.items });
    requests.delete(requestId);
    res.json({ success: true });
  } catch (e) {
    console.error("cancelPaymentApproval error", e);
    res.status(500).json({ error: "Failed to cancel payment approval" });
  }
};


