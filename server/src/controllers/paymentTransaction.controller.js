import PaymentTransaction from "../models/paymentTransaction.model.js";
import { User } from "../models/user.model.js";

// Create a new payment transaction
export const createPaymentTransaction = async (req, res) => {
	try {
		const { transactionType, users, items } = req.body;
		const houseCode = req.user.houseCode;

		// Validate required fields
		if (
			!transactionType ||
			!Array.isArray(users) ||
			users.length !== 2 ||
			!Array.isArray(items) ||
			items.length === 0
		) {
			return res.status(400).json({
				success: false,
				message: "Missing or invalid required fields",
			});
		}

		// Ensure we have valid house code
		if (!houseCode) {
			return res.status(400).json({
				success: false,
				message: "House Code is missing",
			});
		}

		// Create the payment transaction (users array only, items as ObjectId refs)
		const paymentTransaction = new PaymentTransaction({
			houseCode,
			users,
			transactionType,
			items,
		});

		await paymentTransaction.save();

		// Populate the users field for the response
		await paymentTransaction.populate("users.id", "name email");

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

		// Get transactions where user is involved (in users array)
		const transactions = await PaymentTransaction.find({
			"users.id": userId,
		})
			.populate("users.id", "name email")
			.sort(sort)
			.limit(parseInt(limit))
			.skip(skip);

		// Get total count for pagination
		const totalCount = await PaymentTransaction.countDocuments({
			"users.id": userId,
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

		// Get all transactions where user is involved (in users array)
		const transactions = await PaymentTransaction.find({
			"users.id": userId,
		});

		// Calculate statistics
		const stats = {
			totalTransactions: transactions.length,
			bulkPayments: transactions.filter((t) => t.transactionType === "bulk_payment").length,
			singlePayments: transactions.filter((t) => t.transactionType === "single_payment").length,
			settlements: transactions.filter((t) => t.transactionType === "settlement").length,
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

		// Get transactions for this recipient (both users involved)
		const transactions = await PaymentTransaction.find({
			"users.id": { $all: [userId, recipientId] },
		})
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
		const { users, items } = req.body;
		const houseCode = req.user.houseCode;

		// Validate required fields - allow empty items array for general settlements
		if (!Array.isArray(users) || users.length !== 2) {
			return res.status(400).json({
				success: false,
				message: "Missing or invalid users array - exactly 2 users required",
			});
		}

		if (!Array.isArray(items)) {
			return res.status(400).json({
				success: false,
				message: "Items must be an array (can be empty for general settlement)",
			});
		}

		if (!houseCode) {
			return res.status(400).json({
				success: false,
				message: "House Code is missing",
			});
		}

		// Filter out dummy items if any
		const validItems = items.filter((item) => item !== "dummy");

		const settlementTransaction = new PaymentTransaction({
			users,
			houseCode,
			transactionType: "settlement",
			items: validItems, // Use filtered items (can be empty)
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
