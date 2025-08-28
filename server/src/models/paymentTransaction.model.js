import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
	{
		houseCode: {
			type: String,
			required: true,
		},
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
		transactionType: {
			type: String,
			enum: ["single_payment", "bulk_payment", "settlement"],
			required: true,
		},
		items: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Item",
				required: false, // Allow empty items for general settlements
			},
		],
	},
	{
		timestamps: true,
	}
);

// Index for efficient queries
paymentTransactionSchema.index({ houseCode: 1 });
paymentTransactionSchema.index({ "users.id": 1 });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ transactionType: 1 });

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
