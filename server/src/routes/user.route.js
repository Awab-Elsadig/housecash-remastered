import express from "express";
import { deleteUser, getUser, getUsersByHouseCode, updateUser } from "../controllers/user.controller.js";
import { addItemToUser } from "../controllers/user.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get current user (works with impersonation)
router.get("/me", jwtAuthMiddleware, authMiddleware, (req, res) => {
	try {
		// Return the current user (which could be impersonated user from middleware)
		const currentUser = { ...req.user.toObject() };
		delete currentUser.password; // Remove password field
		res.json(currentUser);
	} catch (error) {
		res.status(500).json({ error: "Failed to get current user" });
	}
});

router.get("/get-user", getUser);
router.get("/get-users-by-house-code/:houseCode", getUsersByHouseCode);
router.put("/update-user/:userId", updateUser);
router.patch("/:userId/add-item", addItemToUser);
router.delete("/:userId", deleteUser);

export default router;
