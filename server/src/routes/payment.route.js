import express from "express";
import getPayments, { deletePayment } from "../controllers/payment.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

router.get("/", jwtAuthMiddleware, getPayments);
router.delete("/:id", jwtAuthMiddleware, deletePayment);

export default router;
