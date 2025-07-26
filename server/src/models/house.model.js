import mongoose from "mongoose";

const houseSchema = new mongoose.Schema(
	{
		houseCode: {
			type: String,
			required: true,
			unique: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
			maxLength: 32,
		},
		members: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		items: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Item",
			},
		],
	},
	{ timestamps: true }
);

export const House = mongoose.model("House", houseSchema);
