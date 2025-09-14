import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
	{
		requestId: {
			type: String,
			required: true,
			unique: true,
		},
		type: {
			type: String,
			enum: ["payment", "settlement"],
			required: true,
		},
		fromUserId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		toUserId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		houseCode: {
			type: String,
			required: true,
		},
		items: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Item",
		}],
		status: {
			type: String,
			enum: ["pending", "approved", "declined", "cancelled", "expired"],
			default: "pending",
		},
		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{ 
		collection: "paymentRequests", 
		timestamps: true,
		indexes: [
			{ fromUserId: 1, status: 1 },
			{ toUserId: 1, status: 1 },
			{ houseCode: 1, status: 1 },
			{ expiresAt: 1 }, // For cleanup
		]
	}
);

// Clean up expired requests
paymentRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PaymentRequest = mongoose.model("PaymentRequest", paymentRequestSchema);
