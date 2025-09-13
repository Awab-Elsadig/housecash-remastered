import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/generateTokenAndSetCookie.js";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";

export const signup = async (req, res) => {
	const { email, name, password, houseCode, username, phone } = req.body || {};

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

		const user = new User({
			email,
			password: hashedPassword,
			name,
			houseCode,
			username,
			phone,
			verificationToken,
			verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
		});

		await user.save();

		try {
			const house = await House.findOne({ houseCode });
			if (house) {
				house.members.push(user._id);
				await house.save();
			}
		} catch (error) {
			console.log("House error:", error);
		}

		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// JWT
		try {
			generateTokenAndSetCookie(res, user._id);
		} catch (error) {
			console.log("JWT error:", error);
		}

		// Send verification email
		try {
			sendVerificationEmail(user.email, verificationToken);
		} catch (error) {
			console.log("Email error:", error);
		}

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user: { ...user._doc, password: undefined },
			houseMembers,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: error.message || "Login failed" });
	}
};

export const login = async (req, res) => {
	const { houseCode, email, password } = req.body || {};

	console.log("Login attempt:", { email, houseCode });

	try {
		// Check database connection
		if (mongoose.connection.readyState !== 1) {
			console.error("Database not connected. State:", mongoose.connection.readyState);
			return res.status(500).json({ error: "Database connection failed" });
		}

		// Get the user
		const user = await User.findOne({ email, houseCode });

		if (!user) {
			console.log("User not found:", { email, houseCode });
			return res.status(400).json({ error: "Invalid credentials" });
		}

		const isPasswordCorrect = await bcrypt.compare(password, user.password);

		if (!isPasswordCorrect) {
			console.log("Invalid password for user:", email);
			return res.status(400).json({ error: "Invalid credentials" });
		}

		// Clear any existing impersonation data from session
		if (req.session) {
			delete req.session.impersonatedUserId;
			delete req.session.originalAdminId;
		}

		// Get the same house members
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// JWT
		generateTokenAndSetCookie(res, user.id);

		console.log("Login successful for user:", email);
		res.status(200).json({
			success: true,
			message: "User logged in successfully",
			user: { ...user._doc, password: undefined },
			houseMembers,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: error.message || "Login failed" });
	}
};

export const logout = async (req, res) => {
	try {
		req.session.destroy((err) => {
			if (err) {
				return res.status(500).json({ error: "Logout failed" });
			}
			// Clear the session cookie.
			res.clearCookie("token", {
				path: "/",
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});
			res.clearCookie("connect.sid", {
				path: "/",
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});
			res.status(200).json({
				success: true,
				message: "User logged out successfully",
			});
		});
	} catch (error) {
		console.error("Logout error:", error);
		res.status(500).json({ error: error.message || "Logout failed" });
	}
};

export const updateUser = async (req, res) => {
	const { _id, ...updateFields } = req.body;

	try {
		// Find the user by ID
		const user = await User.findById(_id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Filter out fields you don't want to update (like password)
		const allowedUpdates = ["houseCode", "name", "username", "phone", "email"]; // Only allow these fields to be updated
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

export const verifyPassword = async (req, res) => {
	const { currentPassword } = req.body;
	const { userId } = req.params;

	try {
		// Get the user
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);

		if (!isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid password" });
		}

		res.status(200).json({ valid: true });
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: error.message || "Login failed" });
	}
};
