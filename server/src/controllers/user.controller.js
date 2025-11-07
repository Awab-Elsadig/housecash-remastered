import { User } from "../models/user.model.js";

export const updateUser = async (req, res) => {
	const { ...updateFields } = req.body;
	const { userId } = req.params;

	try {
		// Find the user by ID
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Filter out fields you don't want to update (like password)
		const allowedUpdates = [
			"houseCode",
			"name",
			"username",
			"phone",
			"email",
			"items",
			"profilePictureUrl",
		]; // Only allow these fields to be updated
		Object.keys(updateFields).forEach((key) => {
			if (allowedUpdates.includes(key)) {
				user[key] = updateFields[key];
			}
		});

		// Save the updated user to the database
		await user.save();

		// Send the updated user object back, excluding the password
		res.json({ ...user._doc, password: undefined });
	} catch (error) {
		// Handle errors
		res.status(500).json({ error: error.message });
	}
};

export const getUser = async (req, res) => {
	const { _id } = req.body;

	try {
		const user = await User.findById(_id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ ...user._doc, password: undefined });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

export const getUsersByHouseCode = async (req, res) => {
	const { houseCode } = req.params;

	try {
		const users = await User.find({ houseCode });

		if (!users) {
			return res.status(404).json({ message: "No users found" });
		}

		res.json({ users });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

export const addItemToUser = async (req, res) => {
	const { userId } = req.params;
	const { itemId } = req.body;

	try {
		const user = await User.findByIdAndUpdate(userId, { $push: { items: itemId } }, { new: true });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ user });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

export const deleteUser = async (req, res) => {
	const { userId } = req.params;

	try {
		const user = await User.findByIdAndDelete(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ user });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};
