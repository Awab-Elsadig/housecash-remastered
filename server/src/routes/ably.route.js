import express from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";
import { createAblyTokenRequest } from "../utils/ablyConfig.js";

const router = express.Router();

router.get("/token", jwtAuthMiddleware, async (req, res) => {
	try {
		const clientId = req.user?._id?.toString() || `guest:${Date.now()}`;
		const tokenRequest = await createAblyTokenRequest(clientId);
		res.status(200).json(tokenRequest);
	} catch (error) {
		console.error("[Ably] Error generating token request:", error.message);
		console.error("[Ably] Error stack:", error.stack);
		
		// Check if it's a configuration error
		if (error.message.includes("ABLY_API_KEY")) {
			return res.status(503).json({
				error: "Ably service is not configured",
				message: "ABLY_API_KEY is missing on the server",
			});
		}
		
		res.status(500).json({
			error: "Failed to generate Ably token",
			message: error.message,
		});
	}
});

export default router;

