import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";

const isAdmin = (req) => {
	// Use req.originalUser if available, otherwise use req.user
	const adminUser = req.originalUser || req.user;
	return adminUser && adminUser.role === "admin";
};

export const getAllUsers = async (req, res) => {
	// Only allow admin (or impersonating admin) to list all users.
	if (!isAdmin(req)) {
		return res.status(403).json({ error: "Access denied" });
	}
	try {
		const users = await User.find().select("-password").exec();
		res.status(200).json({ users });
	} catch (error) {
		res.status(500).json({ error: error.message || "Error fetching users" });
	}
};

export const impersonateUser = async (req, res) => {
	// Only allow admin users to impersonate.
	if (!isAdmin(req)) {
		return res.status(403).json({ error: "Access denied" });
	}
	const { targetUserId } = req.body;
	try {
		const userToImpersonate = await User.findById(targetUserId);
		if (!userToImpersonate) {
			return res.status(404).json({ error: "User not found" });
		}

		console.log("=== STARTING IMPERSONATION ===");
		console.log("Admin user:", req.user.name, "ID:", req.user._id);
		console.log("Target user:", userToImpersonate.name, "ID:", userToImpersonate._id);
		console.log("Target user house code:", userToImpersonate.houseCode);

		// Store the original admin's ID if not already stored.
		if (!req.session.originalUserId) {
			req.session.originalUserId = req.user._id;
			console.log("Stored original admin in session:", req.session.originalUserId);
		}

		// Optionally, fetch house members for context.
		const houseCode = userToImpersonate.houseCode;
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// Set impersonation flag in the session.
		req.session.impersonatedUserId = targetUserId;
		console.log("Session after setting impersonatedUserId:", req.session);
		console.log("Session ID:", req.sessionID);

		// Save the session so that the impersonation flag and original admin are persisted.
		req.session.save((err) => {
			if (err) {
				console.error("Error saving session during impersonation:", err);
				return res.status(500).json({ error: "Error saving session" });
			}
			console.log("Session saved successfully. Session ID:", req.sessionID);
			console.log("=== IMPERSONATION STARTED ===");
			return res.status(200).json({
				message: `Now impersonating user ${userToImpersonate.username}`,
				user: userToImpersonate,
				houseMembers,
			});
		});
	} catch (error) {
		console.error("Impersonation error:", error);
		return res.status(500).json({ error: error.message || "Error impersonating user" });
	}
};

// Endpoint to stop impersonation.
export const stopImpersonation = async (req, res) => {
	console.log("Stop impersonation request received. Session ID:", req.sessionID);
	console.log("Session before stopping impersonation:", req.session);

	if (!req.session.impersonatedUserId) {
		console.error("No impersonation active in session.");
		return res.status(400).json({ error: "No impersonation active" });
	}

	try {
		// Optionally, fetch house members from the impersonated user's house.
		const impersonatedUser = await User.findById(req.session.impersonatedUserId);
		if (!impersonatedUser) {
			return res.status(404).json({ error: "Impersonated user not found" });
		}
		const houseCode = impersonatedUser.houseCode;
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// Clear the impersonation flag.
		req.session.impersonatedUserId = null;
		console.log("After clearing impersonatedUserId:", req.session);

		// Retrieve the original admin's user ID from the session.
		const originalUserId = req.session.originalUserId;
		console.log("Original admin ID in session:", originalUserId);

		// Remove the original admin from session for cleanliness.
		req.session.originalUserId = null;

		// Save the session so that changes are persisted.
		req.session.save(async (err) => {
			if (err) {
				console.error("Error saving session after stopping impersonation:", err);
				return res.status(500).json({ error: "Error saving session" });
			}
			console.log("Session saved after stopping impersonation. Session ID:", req.sessionID);
			console.log("Session after saving:", req.session);

			// Fetch the original admin from the database.
			let originalAdmin = null;
			if (originalUserId) {
				try {
					originalAdmin = await User.findById(originalUserId).select("-password");
					console.log("Original admin fetched:", originalAdmin);
				} catch (fetchError) {
					console.error("Error fetching original admin:", fetchError);
					return res.status(500).json({ error: "Error fetching original admin" });
				}
			}
			return res.status(200).json({
				message: "Impersonation stopped",
				originalAdmin,
				houseMembers,
			});
		});
	} catch (error) {
		console.error("Error during stop impersonation:", error);
		return res.status(500).json({ error: error.message || "Error stopping impersonation" });
	}
};
