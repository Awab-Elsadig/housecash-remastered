import mongoose from "mongoose";
const Schema = mongoose.Schema;

const PaymentSchema = new Schema(
	{
		houseCode: { type: String, required: true, ref: "House" },
		type: {
			type: String,
			required: true,
			enum: ["settlement", "single", "bulk"],
		},
		// The user initiating the payment/settlement acceptance
		fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
		// The user receiving the payment/settlement request
		toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
		amount: { type: Number, required: true },
		// For settlements and bulk payments
		settledItemIds: [{ type: Schema.Types.ObjectId, ref: "Item" }],
		// For single payments
		settledItemId: { type: Schema.Types.ObjectId, ref: "Item" },
		// Snapshot of the bilateral balance at the time of settlement
		settlementSnapshot: {
			theyOwe: Number,
			youOwe: Number,
			net: Number,
		},
	},
	{ timestamps: true }
);

const Payment = mongoose.model("Payment", PaymentSchema);

export default Payment;
