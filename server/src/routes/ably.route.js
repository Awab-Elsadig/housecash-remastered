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
		console.error("Error generating Ably token request:", error);
		res.status(500).json({
			error: "Failed to generate Ably token",
		});
	}
});

export default router;

