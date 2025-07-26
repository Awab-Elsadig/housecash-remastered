import express from "express";
import {
	createPaymentTransaction,
	getUserPaymentTransactions,
	getPaymentStatistics,
	getPaymentTransactionsByRecipient,
	deletePaymentTransaction,
	clearAllPaymentTransactions,
} from "../controllers/paymentTransaction.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(jwtAuthMiddleware);

// Create a new payment transaction
router.post("/create", createPaymentTransaction);

// Get all payment transactions for the authenticated user
router.get("/", getUserPaymentTransactions);

// Get payment statistics for the authenticated user
router.get("/statistics", getPaymentStatistics);

// Get payment transactions by recipient
router.get("/recipient/:recipientId", getPaymentTransactionsByRecipient);

// Delete a specific payment transaction
router.delete("/:transactionId", deletePaymentTransaction);

// Admin endpoint to clear ALL payment transactions (for debugging)
router.delete("/admin/clear-all", clearAllPaymentTransactions);

export default router;
