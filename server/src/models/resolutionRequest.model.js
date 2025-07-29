import mongoose from "mongoose";

const resolutionRequestSchema = new mongoose.Schema(
	{
		requestId: {
			type: String,
			required: true,
			unique: true,
		},
		senderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		senderName: {
			type: String,
			required: true,
		},
		recipientId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		recipientName: {
			type: String,
			required: true,
		},
		houseCode: {
			type: String,
			required: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		netAmount: {
			type: Number,
			required: true,
		},
		owedItems: [
			{
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Item",
					required: true,
				},
				name: {
					type: String,
					required: true,
				},
				share: {
					type: Number,
					required: true,
				},
				type: {
					type: String,
					enum: ["owed"],
					required: true,
				},
			},
		],
		owingItems: [
			{
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Item",
					required: true,
				},
				name: {
					type: String,
					required: true,
				},
				share: {
					type: Number,
					required: true,
				},
				type: {
					type: String,
					enum: ["owing"],
					required: true,
				},
			},
		],
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected", "expired"],
			default: "pending",
		},
		expiresAt: {
			type: Date,
			required: true,
			default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
		},
		respondedAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

// Index for faster queries
resolutionRequestSchema.index({ recipientId: 1, status: 1 });
resolutionRequestSchema.index({ senderId: 1, status: 1 });
resolutionRequestSchema.index({ expiresAt: 1 });

// Auto-expire documents after they expire
resolutionRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ResolutionRequest = mongoose.model("ResolutionRequest", resolutionRequestSchema);

export default ResolutionRequest;
