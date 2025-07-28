import express from "express";
import {
	createPaymentTransaction,
	createSettlementTransaction,
	getUserPaymentTransactions,
	getPaymentStatistics,
	getPaymentTransactionsByRecipient,
	clearAllPaymentTransactions,
} from "../controllers/paymentTransaction.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(jwtAuthMiddleware);

// Create a new payment transaction
router.post("/create", createPaymentTransaction);

// Create a new settlement transaction
router.post("/create-settlement", createSettlementTransaction);

// Get all payment transactions for the authenticated user
router.get("/", getUserPaymentTransactions);

// Get payment statistics for the authenticated user
router.get("/statistics", getPaymentStatistics);

// Get payment transactions by recipient
router.get("/recipient/:recipientId", getPaymentTransactionsByRecipient);

// Admin endpoint to clear ALL payment transactions (for debugging)
router.delete("/admin/clear-all", clearAllPaymentTransactions);

export default router;
