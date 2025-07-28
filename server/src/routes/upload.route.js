import express from "express";
import { getImageKitAuth, updateProfilePicture, deleteImage } from "../controllers/upload.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// Get ImageKit authentication parameters (requires authentication)
router.get("/imagekit-auth", jwtAuthMiddleware, getImageKitAuth);

// Update user profile picture URL (requires authentication)
router.post("/profile-picture", jwtAuthMiddleware, updateProfilePicture);

// Delete image from ImageKit (requires authentication)
router.delete("/image/:fileId", jwtAuthMiddleware, deleteImage);

export default router;
