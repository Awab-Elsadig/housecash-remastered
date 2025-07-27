import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxLength: 32,
		},
		price: {
			type: Number,
			required: true,
		},
		description: {
			type: String,
			trim: true,
			maxLength: 100,
		},
		houseCode: {
			type: String,
			required: true,
		},
		members: [
			{
				userID: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
					required: true,
				},
				paid: {
					type: Boolean,
					default: false,
					required: true,
				},
				got: {
					type: Boolean,
					default: false,
					required: true,
				},
			},
		],
		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{ collection: "items", timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);
