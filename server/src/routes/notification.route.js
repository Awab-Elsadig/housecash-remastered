import express from "express";
import {
	getNotifications,
	createNotification,
	sendNotification,
	markNotificationAsRead,
	clearAllNotifications,
	getUnreadCount,
} from "../controllers/notification.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(jwtAuthMiddleware);

// Get all notifications for the authenticated user
router.get("/", getNotifications);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

// Create a new notification
router.post("/", createNotification);

// Send notification (for dashboard notify action)
router.post("/send", sendNotification);

// Mark notification as read
router.patch("/:notificationId/read", markNotificationAsRead);

// Clear all notifications for the authenticated user
router.delete("/", clearAllNotifications);

export default router;
