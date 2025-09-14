import mongoose from "mongoose";
import { User } from "./user.model.js";

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

// Ensure houseCode is always present; derive from author/createdBy if missing
itemSchema.pre("validate", async function (next) {
	if (this.houseCode) return next();

	try {
		// Try author
		if (this.author && mongoose.Types.ObjectId.isValid(String(this.author))) {
			const u = await User.findById(this.author).select("houseCode");
			if (u?.houseCode) {
				this.houseCode = u.houseCode;
				return next();
			}
		}
		// Try createdBy
		if (this.createdBy && mongoose.Types.ObjectId.isValid(String(this.createdBy))) {
			const u = await User.findById(this.createdBy).select("houseCode");
			if (u?.houseCode) {
				this.houseCode = u.houseCode;
				return next();
			}
		}
		// Could not derive
		this.invalidate("houseCode", "houseCode is required and could not be derived");
		return next();
	} catch (err) {
		return next(err);
	}
});

export const Item = mongoose.model("Item", itemSchema);
