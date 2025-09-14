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
	console.log("=== SERVER LOGIN DEBUG START ===");
	console.log("Request body:", req.body);
	console.log("Request headers:", req.headers);
	console.log("Request IP:", req.ip);
	console.log("Request method:", req.method);
	console.log("Request URL:", req.url);
	
	const { houseCode, email, password } = req.body || {};
	console.log("Extracted credentials:", { email, houseCode, passwordLength: password?.length });

	try {
		// Check database connection
		console.log("Database connection state:", mongoose.connection.readyState);
		if (mongoose.connection.readyState !== 1) {
			console.error("Database not connected. State:", mongoose.connection.readyState);
			console.log("Attempting to reconnect to database...");
			
			// Try to reconnect
			try {
				await mongoose.connect(process.env.MONGO_URI, { 
					serverSelectionTimeoutMS: 10000,
					connectTimeoutMS: 10000
				});
				console.log("Database reconnected successfully");
			} catch (reconnectError) {
				console.error("Database reconnection failed:", reconnectError.message);
				return res.status(500).json({ error: "Database connection failed" });
			}
		}

		// Validate input
		if (!email || !password || !houseCode) {
			console.log("Missing required fields:", { email: !!email, password: !!password, houseCode: !!houseCode });
			return res.status(400).json({ error: "Email, password, and house code are required" });
		}

		if (houseCode.length !== 6) {
			console.log("Invalid house code length:", houseCode.length);
			return res.status(400).json({ error: "House code must be exactly 6 characters" });
		}

		console.log("Searching for user with email:", email, "and houseCode:", houseCode);
		
		// Get the user
		const user = await User.findOne({ email, houseCode });
		console.log("User found:", !!user);
		if (user) {
			console.log("User details:", { 
				id: user._id, 
				name: user.name, 
				email: user.email, 
				houseCode: user.houseCode,
				hasPassword: !!user.password 
			});
		}

		if (!user) {
			console.log("User not found:", { email, houseCode });
			// Check if user exists with different house code
			const userWithDifferentHouse = await User.findOne({ email });
			if (userWithDifferentHouse) {
				console.log("User exists but with different house code:", userWithDifferentHouse.houseCode);
			}
			return res.status(400).json({ error: "Invalid credentials" });
		}

		console.log("Comparing password...");
		const isPasswordCorrect = await bcrypt.compare(password, user.password);
		console.log("Password comparison result:", isPasswordCorrect);

		if (!isPasswordCorrect) {
			console.log("Invalid password for user:", email);
			return res.status(400).json({ error: "Invalid credentials" });
		}

		// Clear any existing impersonation data from session
		if (req.session) {
			delete req.session.impersonatedUserId;
			delete req.session.originalAdminId;
			console.log("Cleared impersonation data from session");
		}

		console.log("Finding house members for houseCode:", houseCode);
		// Get the same house members
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");
		console.log("House members found:", !!houseMembers);
		if (houseMembers) {
			console.log("House members count:", houseMembers.members?.length || 0);
			console.log("House members structure:", {
				hasMembers: !!houseMembers.members,
				membersType: typeof houseMembers.members,
				membersLength: houseMembers.members?.length,
				membersIsArray: Array.isArray(houseMembers.members)
			});
		} else {
			console.log("No house found for houseCode:", houseCode);
		}

		console.log("Generating JWT token...");
		// JWT
		try {
			generateTokenAndSetCookie(res, user.id);
			console.log("JWT token generated and cookie set");
		} catch (jwtError) {
			console.error("JWT generation error:", jwtError);
			return res.status(500).json({ error: "Token generation failed" });
		}

		console.log("Login successful for user:", email);
		const responseData = {
			success: true,
			message: "User logged in successfully",
			user: { ...user._doc, password: undefined },
			houseMembers,
		};
		console.log("Sending response:", { 
			success: responseData.success, 
			userId: responseData.user._id,
			houseMembersCount: responseData.houseMembers?.members?.length || 0
		});
		
		res.status(200).json(responseData);
	} catch (error) {
		console.log("=== SERVER LOGIN ERROR ===");
		console.error("Login error:", error);
		console.error("Error stack:", error.stack);
		console.error("Error name:", error.name);
		console.error("Error message:", error.message);
		res.status(500).json({ error: error.message || "Login failed" });
	} finally {
		console.log("=== SERVER LOGIN DEBUG END ===");
	}
};

export const logout = async (req, res) => {
	try {
		const isProduction = process.env.NODE_ENV === "production";
		
		req.session.destroy((err) => {
			if (err) {
				return res.status(500).json({ error: "Logout failed" });
			}
			// Clear the session cookie with environment-appropriate settings
			res.clearCookie("token", {
				path: "/",
				httpOnly: true,
				secure: isProduction,
				sameSite: isProduction ? "none" : "lax",
			});
			res.clearCookie("connect.sid", {
				path: "/",
				httpOnly: true,
				secure: isProduction,
				sameSite: isProduction ? "none" : "lax",
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
