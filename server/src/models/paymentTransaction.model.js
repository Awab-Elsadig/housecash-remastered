import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		houseCode: {
			type: String,
			required: true,
		},
		transactionType: {
			type: String,
			enum: ["single_payment", "bulk_payment"],
			required: true,
		},
		paidTo: {
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
				yourShare: {
					type: Number,
					required: true,
				},
				paidAmount: {
					type: Number,
					required: true,
				},
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
		status: {
			type: String,
			enum: ["completed", "pending", "failed"],
			default: "completed",
		},
		method: {
			type: String,
			enum: ["Individual Payment", "Bulk Payment"],
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
paymentTransactionSchema.index({ createdAt: -1 });

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
