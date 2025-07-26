import Notification from "../models/notification.model.js";
import { User } from "../models/user.model.js";

// Get all notifications for the authenticated user
export const getNotifications = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		const notifications = await Notification.find({
			userId: userId,
			houseCode: houseCode,
		})
			.sort({ createdAt: -1 })
			.limit(50);

		res.status(200).json({
			success: true,
			data: notifications,
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Create a new notification
export const createNotification = async (req, res) => {
	try {
		const { userId, type, message, data } = req.body;
		const senderHouseCode = req.user.houseCode;

		// Validate that the target user exists and is in the same house
		const targetUser = await User.findOne({ _id: userId, houseCode: senderHouseCode });
		if (!targetUser) {
			return res.status(404).json({
				success: false,
				message: "User not found or not in the same house",
			});
		}

		const notification = new Notification({
			userId,
			houseCode: senderHouseCode,
			type,
			message,
			data,
		});

		await notification.save();

		res.status(201).json({
			success: true,
			data: notification,
		});
	} catch (error) {
		console.error("Error creating notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Send notification (for dashboard notify action)
export const sendNotification = async (req, res) => {
	try {
		const { userId, message, type = "payment_reminder", data = {} } = req.body;
		const senderHouseCode = req.user.houseCode;
		const senderName = req.user.name;

		// Validate that the target user exists and is in the same house
		const targetUser = await User.findOne({ _id: userId, houseCode: senderHouseCode });
		if (!targetUser) {
			return res.status(404).json({
				success: false,
				message: "User not found or not in the same house",
			});
		}

		const notification = new Notification({
			userId,
			houseCode: senderHouseCode,
			type,
			message: message || `${senderName} sent you a payment reminder`,
			data: {
				...data,
				senderName,
			},
		});

		await notification.save();

		res.status(201).json({
			success: true,
			message: "Notification sent successfully",
			data: notification,
		});
	} catch (error) {
		console.error("Error sending notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
	try {
		const { notificationId } = req.params;
		const userId = req.user._id;

		const notification = await Notification.findOneAndUpdate(
			{
				_id: notificationId,
				userId: userId,
			},
			{ read: true },
			{ new: true }
		);

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found or you do not have permission to modify it",
			});
		}

		res.status(200).json({
			success: true,
			data: notification,
		});
	} catch (error) {
		console.error("Error marking notification as read:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Clear all notifications for the authenticated user
export const clearAllNotifications = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		const result = await Notification.deleteMany({
			userId: userId,
			houseCode: houseCode,
		});

		res.status(200).json({
			success: true,
			message: `${result.deletedCount} notifications cleared successfully`,
		});
	} catch (error) {
		console.error("Error clearing notifications:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		const count = await Notification.countDocuments({
			userId: userId,
			houseCode: houseCode,
			read: false,
		});

		res.status(200).json({
			success: true,
			data: { count },
		});
	} catch (error) {
		console.error("Error fetching unread count:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
