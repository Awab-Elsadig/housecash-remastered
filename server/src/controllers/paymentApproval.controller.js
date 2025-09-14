import { v4 as uuid } from "uuid";
import AblyService from "../services/ablyService.js";
import { Item } from "../models/item.model.js";
import Payment from "../models/payment.model.js";
import { PaymentRequest } from "../models/paymentRequest.model.js";

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
    const record = new PaymentRequest({
      requestId: id,
      type: "payment",
      fromUserId,
      toUserId,
      houseCode,
      items: itemIds,
      expiresAt: new Date(Date.now() + 60 * 1000), // 60 seconds from now
    });
    await record.save();

    // Notify both users via personal channels
    const ably = (await import("../utils/ablyConfig.js")).default;
    const recordData = {
      id: record.requestId,
      type: record.type,
      fromUserId: record.fromUserId,
      toUserId: record.toUserId,
      houseCode: record.houseCode,
      items: record.items,
      createdAt: record.createdAt.getTime(),
    };
    await ably.channels.get(`user:payment:${fromUserId}`).publish("payment:request", recordData);
    await ably.channels.get(`user:payment:${toUserId}`).publish("payment:request", recordData);
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
    const record = await PaymentRequest.findOne({ requestId, status: "pending" });
    if (!record) return res.status(404).json({ error: "Request not found" });

    const userId = req.user._id.toString();
    if (userId !== record.toUserId.toString()) return res.status(403).json({ error: "Only recipient can respond" });

    let processed = false;
    if (accept) {
      // Mark items as paid for the requester user
      const memberUserId = record.fromUserId.toString();
      const update = await Item.updateMany(
        { _id: { $in: record.items }, houseCode: record.houseCode },
        { $set: { "members.$[m].paid": true } },
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

    // Update request status
    record.status = accept ? "approved" : "declined";
    await record.save();

    // Notify both users and refresh house
    const ably = (await import("../utils/ablyConfig.js")).default;
    const channelFrom = ably.channels.get(`user:payment:${record.fromUserId}`);
    const channelTo = ably.channels.get(`user:payment:${record.toUserId}`);
    await channelFrom.publish(accept ? "payment:approved" : "payment:declined", { otherUserId: record.toUserId.toString(), items: record.items });
    await channelTo.publish(accept ? "payment:approved" : "payment:declined", { otherUserId: record.fromUserId.toString(), items: record.items });
    await AblyService.sendFetchUpdate(record.houseCode);
    res.json({ success: true, processed });
  } catch (e) {
    console.error("respondPaymentApproval error", e);
    res.status(500).json({ error: "Failed to respond to payment approval" });
  }
};

export const cancelPaymentApproval = async (req, res) => {
  try {
    const { requestId } = req.body;
    const record = await PaymentRequest.findOne({ requestId, status: "pending" });
    if (!record) return res.status(404).json({ error: "Request not found" });
    const userId = req.user._id.toString();
    if (userId !== record.fromUserId.toString()) return res.status(403).json({ error: "Only sender can cancel" });

    // Update request status
    record.status = "cancelled";
    await record.save();

    const ably = (await import("../utils/ablyConfig.js")).default;
    await ably.channels.get(`user:payment:${record.fromUserId}`).publish("payment:cancelled", { otherUserId: record.toUserId.toString(), items: record.items });
    await ably.channels.get(`user:payment:${record.toUserId}`).publish("payment:cancelled", { otherUserId: record.fromUserId.toString(), items: record.items });
    res.json({ success: true });
  } catch (e) {
    console.error("cancelPaymentApproval error", e);
    res.status(500).json({ error: "Failed to cancel payment approval" });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const houseCode = req.user.houseCode;

    // Get all pending requests where user is either sender or recipient
    const requests = await PaymentRequest.find({
      houseCode,
      status: "pending",
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    }).populate('fromUserId', 'name username').populate('toUserId', 'name username').populate('items', 'name price');

    // Log request details for debugging
    requests.forEach(req => {
      console.log(`Request ${req.requestId}: createdAt=${req.createdAt}, expiresAt=${req.expiresAt}, remaining=${Math.ceil((req.expiresAt.getTime() - Date.now()) / 1000)}s`);
    });

    // Format the requests for the frontend
    const formattedRequests = requests.map(req => ({
      id: req.requestId,
      type: req.type,
      fromUserId: req.fromUserId._id.toString(),
      toUserId: req.toUserId._id.toString(),
      fromUserName: req.fromUserId.name || req.fromUserId.username,
      toUserName: req.toUserId.name || req.toUserId.username,
      items: req.items.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price
      })),
      createdAt: req.createdAt.getTime(),
      expiresAt: req.expiresAt.getTime(),
      direction: req.fromUserId._id.toString() === userId ? "outgoing" : "incoming"
    }));

    res.json({ requests: formattedRequests });
  } catch (e) {
    console.error("getPendingRequests error", e);
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
};


