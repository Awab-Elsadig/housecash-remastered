import express from "express";
import getPayments from "../controllers/payment.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

router.get("/", jwtAuthMiddleware, getPayments);

export default router;
