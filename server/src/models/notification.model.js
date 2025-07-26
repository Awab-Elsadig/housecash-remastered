import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	houseCode: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		enum: ["payment_reminder", "bulk_payment_reminder", "payment_received", "general"],
		default: "general",
	},
	message: {
		type: String,
		required: true,
	},
	data: {
		memberName: String,
		itemName: String,
		itemCount: Number,
		amount: Number,
		totalAmount: Number,
	},
	read: {
		type: Boolean,
		default: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
