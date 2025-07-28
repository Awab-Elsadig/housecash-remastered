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
			enum: ["single_payment", "bulk_payment", "settlement"],
			required: true,
		},
		// For regular payments (single/bulk)
		paidTo: {
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
			name: {
				type: String,
			},
		},
		// For settlements
		settlementWith: {
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
			name: {
				type: String,
			},
		},
		settlementDirection: {
			type: String,
			enum: ["paying", "collecting"],
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
				// For settlements: indicate if this item was owed to you or by you
				itemType: {
					type: String,
					enum: ["owed", "owing"], // owed = they owed you, owing = you owed them
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
			enum: ["Individual Payment", "Bulk Payment", "Settlement"],
			required: true,
		},
		notes: {
			type: String,
			default: "",
		},
		// Settlement specific fields
		netAmount: {
			type: Number, // The net amount settled (positive = you received, negative = you paid)
		},
		owedItemsTotal: {
			type: Number, // Total amount that was owed to you
			default: 0,
		},
		owingItemsTotal: {
			type: Number, // Total amount that you owed
			default: 0,
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
