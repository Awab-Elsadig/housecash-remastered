import PaymentTransaction from "../models/paymentTransaction.model.js";
import { User } from "../models/user.model.js";

// Create a new payment transaction
export const createPaymentTransaction = async (req, res) => {
	try {
		const { transactionType, paidTo, items, totalAmount, itemCount, method, notes } = req.body;
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		// Validate required fields
		if (!transactionType || !paidTo || !items || !totalAmount || !itemCount || !method) {
			return res.status(400).json({
				success: false,
				message: "Missing required fields",
			});
		}

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Validate that paidTo user exists and is in the same house
		const recipientUser = await User.findOne({ _id: paidTo.id, houseCode: houseCode });
		if (!recipientUser) {
			return res.status(404).json({
				success: false,
				message: "Recipient user not found or not in the same house",
			});
		}

		// Create the payment transaction
		const paymentTransaction = new PaymentTransaction({
			userId: userId,
			houseCode: houseCode,
			transactionType,
			paidTo: {
				id: paidTo.id,
				name: paidTo.name,
			},
			items,
			totalAmount,
			itemCount,
			method,
			notes: notes || "",
		});

		await paymentTransaction.save();

		// Populate the paidTo and userId fields for the response
		await paymentTransaction.populate("paidTo.id", "name email");
		await paymentTransaction.populate("userId", "name email");

		res.status(201).json({
			success: true,
			message: "Payment transaction created successfully",
			data: paymentTransaction,
		});
	} catch (error) {
		console.error("Error creating payment transaction:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
// Get all payment transactions for a user
export const getUserPaymentTransactions = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;
		const { limit = 50, page = 1, sortBy = "createdAt", sortOrder = "desc" } = req.query;

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Calculate pagination
		const skip = (parseInt(page) - 1) * parseInt(limit);

		// Build sort object
		const sort = {};
		sort[sortBy] = sortOrder === "desc" ? -1 : 1;

		// Get transactions where user is either the payer OR the payee
		const transactions = await PaymentTransaction.find({
			$or: [
				{ userId: userId }, // User made the payment (payer)
				{ "paidTo.id": userId }, // User received the payment (payee)
			],
		})
			.populate("paidTo.id", "name email")
			.populate("userId", "name email")
			.sort(sort)
			.limit(parseInt(limit))
			.skip(skip);

		// Get total count for pagination
		const totalCount = await PaymentTransaction.countDocuments({
			$or: [
				{ userId: userId }, // User made the payment (payer)
				{ "paidTo.id": userId }, // User received the payment (payee)
			],
		});

		res.status(200).json({
			success: true,
			data: {
				transactions,
				pagination: {
					currentPage: parseInt(page),
					totalPages: Math.ceil(totalCount / parseInt(limit)),
					totalTransactions: totalCount,
					hasNext: skip + transactions.length < totalCount,
					hasPrev: parseInt(page) > 1,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching payment transactions:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Get payment statistics for a user
export const getPaymentStatistics = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Get all transactions where user is either the payer OR the payee
		const transactions = await PaymentTransaction.find({
			$or: [
				{ userId: userId }, // User made the payment (payer)
				{ "paidTo.id": userId }, // User received the payment (payee)
			],
		});

		// Only count statistics for payments made BY the user (not received)
		const paymentsMade = transactions.filter((t) => t.userId.toString() === userId.toString());

		// Calculate statistics
		const stats = {
			totalTransactions: paymentsMade.length,
			totalPaid: paymentsMade.reduce((sum, t) => sum + t.totalAmount, 0),
			bulkPayments: paymentsMade.filter((t) => t.transactionType === "bulk_payment").length,
			singlePayments: paymentsMade.filter((t) => t.transactionType === "single_payment").length,
			totalItems: paymentsMade.reduce((sum, t) => sum + t.itemCount, 0),
		};

		// Get most frequent recipient (only for payments made by user)
		const recipientCounts = {};
		paymentsMade.forEach((transaction) => {
			const recipientName = transaction.paidTo.name;
			recipientCounts[recipientName] = (recipientCounts[recipientName] || 0) + 1;
		});

		const mostFrequentRecipient = Object.keys(recipientCounts).reduce(
			(a, b) => (recipientCounts[a] > recipientCounts[b] ? a : b),
			"None"
		);

		stats.mostFrequentRecipient = mostFrequentRecipient;

		// Get payment trends (last 30 days) - only payments made by user
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const recentTransactions = await PaymentTransaction.find({
			userId: userId,
			createdAt: { $gte: thirtyDaysAgo },
		});

		stats.last30Days = {
			totalTransactions: recentTransactions.length,
			totalPaid: recentTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
		};

		res.status(200).json({
			success: true,
			data: stats,
		});
	} catch (error) {
		console.error("Error fetching payment statistics:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Get payment transactions by recipient
export const getPaymentTransactionsByRecipient = async (req, res) => {
	try {
		const userId = req.user._id;
		const houseCode = req.user.houseCode;
		const { recipientId } = req.params;

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Validate recipient exists and is in the same house
		const recipient = await User.findOne({ _id: recipientId, houseCode: houseCode });
		if (!recipient) {
			return res.status(404).json({
				success: false,
				message: "Recipient not found or not in the same house",
			});
		}

		// Get transactions for this recipient
		const transactions = await PaymentTransaction.find({
			userId: userId,
			"paidTo.id": recipientId,
		})
			.populate("paidTo.id", "name email")
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			data: transactions,
		});
	} catch (error) {
		console.error("Error fetching payment transactions by recipient:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Delete a payment transaction
export const deletePaymentTransaction = async (req, res) => {
	try {
		const { transactionId } = req.params;
		const userId = req.user._id;
		const houseCode = req.user.houseCode;

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Find and delete the transaction (only if it belongs to the user)
		const transaction = await PaymentTransaction.findOneAndDelete({
			_id: transactionId,
			userId: userId,
		});

		if (!transaction) {
			return res.status(404).json({
				success: false,
				message: "Transaction not found or you don't have permission to delete it",
			});
		}

		res.status(200).json({
			success: true,
			message: "Payment transaction deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting payment transaction:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Admin endpoint to clear ALL payment transactions (for debugging)
export const clearAllPaymentTransactions = async (req, res) => {
	try {
		const result = await PaymentTransaction.deleteMany({});

		res.status(200).json({
			success: true,
			message: `All ${result.deletedCount} payment transactions cleared successfully`,
		});
	} catch (error) {
		console.error("Error clearing all payment transactions:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
