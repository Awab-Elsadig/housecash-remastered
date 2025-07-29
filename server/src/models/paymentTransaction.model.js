import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
	{
		users: [
			{
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
					required: true,
				},
				name: {
					type: String,
					required: true,
				},
			},
		],
		// Add userId for legacy and population compatibility
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		// Added paidTo field for legacy and population compatibility
		paidTo: {
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
			name: {
				type: String,
			},
		},
		houseCode: {
			type: String,
			required: true,
		},
		transactionType: {
			type: String,
			enum: ["single_payment", "bulk_payment", "settlement"],
			required: true,
		},
		items: [
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
				originalPrice: {
					type: Number,
					required: true,
				},
				price: {
					type: Number,
					required: true,
				},
				// For each user, show their perspective
				perspectives: [
					{
						userId: {
							type: mongoose.Schema.Types.ObjectId,
							ref: "User",
							required: true,
						},
						itemType: {
							type: String,
							enum: ["owed", "owing"],
							required: true,
						},
						amount: {
							type: Number,
							required: true,
						},
					},
				],
			},
		],
		totalAmount: {
			type: Number,
			required: true,
		},
		itemCount: {
			type: Number,
			required: true,
		},
		algebraicSum: {
			type: Number,
			required: true,
		},
		status: {
			type: String,
			enum: ["completed", "pending", "failed"],
			default: "completed",
		},
		method: {
			type: String,
			enum: ["Individual Payment", "Bulk Payment", "Settlement"],
			required: true,
		},
		notes: {
			type: String,
			default: "",
		},
	},
	{
		timestamps: true,
	}
);

// Index for efficient queries
paymentTransactionSchema.index({ userId: 1, houseCode: 1 });
paymentTransactionSchema.index({ "paidTo.id": 1 });
paymentTransactionSchema.index({ "settlementWith.id": 1 });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ transactionType: 1 });

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
