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

		// Get transactions where user is either the payer, payee, or involved in settlements
		const transactions = await PaymentTransaction.find({
			$or: [
				{ userId: userId }, // User made the payment (payer) or initiated settlement (legacy)
				{ "paidTo.id": userId }, // User received the payment (payee) (legacy)
				{ "users.id": userId }, // User involved in new settlement transaction
			],
		})
			.populate("paidTo.id", "name email")
			.populate("users.id", "name email")
			.populate("userId", "name email")
			.sort(sort)
			.limit(parseInt(limit))
			.skip(skip);

		// Get total count for pagination
		const totalCount = await PaymentTransaction.countDocuments({
			$or: [{ userId: userId }, { "paidTo.id": userId }, { "users.id": userId }],
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

		// Get all transactions where user is either the payer OR the payee OR involved in settlements
		const transactions = await PaymentTransaction.find({
			$or: [{ userId: userId }, { "paidTo.id": userId }, { "users.id": userId }],
		});

		// Count all transactions involving the user
		const paymentsMade = transactions.filter((t) => t.userId?.toString() === userId.toString());
		const paymentsReceived = transactions.filter((t) => t.paidTo?.id?.toString() === userId.toString());
		const settlementsInvolved = transactions.filter(
			(t) =>
				t.transactionType === "settlement" &&
				Array.isArray(t.users) &&
				t.users.some((u) => u.id?.toString() === userId.toString())
		);

		// Calculate statistics
		const stats = {
			totalTransactions: transactions.length,
			totalPaid: paymentsMade.reduce((sum, t) => sum + t.totalAmount, 0),
			bulkPayments: transactions.filter((t) => t.transactionType === "bulk_payment").length,
			singlePayments: transactions.filter((t) => t.transactionType === "single_payment").length,
			settlements: settlementsInvolved.length,
			totalItems: transactions.reduce((sum, t) => sum + (t.itemCount || 0), 0),
		};

		// Get most frequent recipient (for payments made and received)
		const recipientCounts = {};
		transactions.forEach((transaction) => {
			if (transaction.paidTo?.name) {
				recipientCounts[transaction.paidTo.name] = (recipientCounts[transaction.paidTo.name] || 0) + 1;
			}
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

		// Get transactions for this recipient (legacy and new model)
		const transactions = await PaymentTransaction.find({
			$or: [
				{ userId: userId, "paidTo.id": recipientId },
				{ "users.id": userId, "users.id": recipientId },
			],
		})
			.populate("paidTo.id", "name email")
			.populate("users.id", "name email")
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

// Create a settlement transaction
export const createSettlementTransaction = async (req, res) => {
	try {
		const { settlementWithId, settlementWithName, amount, netAmount, items = [], notes = "" } = req.body;

		const userId = req.user._id;
		const userName = req.user.name;
		const houseCode = req.user.houseCode;

		// Validate required fields
		if (!settlementWithId || !settlementWithName) {
			return res.status(400).json({
				success: false,
				message: "Missing required fields for settlement",
			});
		}

		// Ensure we have valid user ID and house code
		if (!userId || !houseCode) {
			return res.status(400).json({
				success: false,
				message: "User ID or House Code is missing",
			});
		}

		// Validate that settlement partner exists and is in the same house
		const settlementPartner = await User.findOne({ _id: settlementWithId, houseCode: houseCode });
		if (!settlementPartner) {
			return res.status(404).json({
				success: false,
				message: "Settlement partner not found or not in the same house",
			});
		}

		// Create one settlement transaction with two users and per-item perspectives
		const users = [
			{ id: userId, name: userName },
			{ id: settlementWithId, name: settlementWithName },
		];

		// Each item should have a perspectives array for both users
		const itemsWithPerspectives = items.map((item) => ({
			id: item.id,
			name: item.name,
			originalPrice: item.originalPrice || 0,
			price: item.price || item.share || 0,
			perspectives: [
				{
					userId: userId,
					itemType: item.itemType, // "owed" or "owing" for user
					amount: item.share || 0,
				},
				{
					userId: settlementWithId,
					itemType: item.itemType === "owed" ? "owing" : "owed", // opposite for other user
					amount: item.share || 0,
				},
			],
		}));

		// Calculate algebraic sum for both users
		let algebraicSum = 0;
		items.forEach((item) => {
			algebraicSum += item.itemType === "owed" ? item.share : -item.share;
		});

		const settlementTransaction = new PaymentTransaction({
			users,
			houseCode,
			transactionType: "settlement",
			items: itemsWithPerspectives,
			totalAmount: amount || 0,
			itemCount: items.length,
			algebraicSum,
			method: "Settlement",
			notes: notes || `Settlement between ${userName} and ${settlementWithName}`,
		});

		await settlementTransaction.save();
		await settlementTransaction.populate("users.id", "name email");

		res.status(201).json({
			success: true,
			message: "Settlement transaction created successfully",
			data: settlementTransaction,
		});
	} catch (error) {
		console.error("Error creating settlement transaction:", error);
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
