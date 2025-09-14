import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"; // adjust path as needed

export const jwtAuthMiddleware = async (req, res, next) => {
	// Try to get token from cookie (primary and backup) or from the Authorization header.
	const token =
		(req.cookies && req.cookies.token) || 
		(req.cookies && req.cookies.token_backup) || 
		(req.cookies && req.cookies.auth_token) ||
		(req.headers.authorization && req.headers.authorization.split(" ")[1]);

	console.log("JWT Middleware - Available cookies:", req.cookies);
	console.log("JWT Middleware - Token found:", !!token);

	if (!token) {
		return res.status(401).json({ error: "Access denied, no token provided" });
	}

	try {
		// Verify the token using your secret.
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Find the user associated with the token.
		const user = await User.findById(decoded.userID).select("-password");
		if (!user) {
			return res.status(401).json({ error: "User not found" });
		}

		// Store the original user (the one who actually logged in)
		req.originalUser = user;

		// Check if impersonation is active in the session
		if (req.session && req.session.impersonatedUserId) {
			// Find the impersonated user
			const impersonatedUser = await User.findById(req.session.impersonatedUserId).select("-password");
			if (!impersonatedUser) {
				req.user = user;
			} else {
				req.user = impersonatedUser;
			}
		} else {
			// No impersonation, use the original user
			req.user = user;
		}

		next();
	} catch (error) {
		return res.status(400).json({ error: "Invalid token" });
	}
};
