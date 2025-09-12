import express from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";
import {
  requestPaymentApproval,
  respondPaymentApproval,
  cancelPaymentApproval,
} from "../controllers/paymentApproval.controller.js";

const router = express.Router();

router.post("/request", jwtAuthMiddleware, requestPaymentApproval);
router.post("/respond", jwtAuthMiddleware, respondPaymentApproval);
router.post("/cancel", jwtAuthMiddleware, cancelPaymentApproval);

export default router;


