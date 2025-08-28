import express from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";
import { requestSettlement, respondSettlement, cancelSettlement } from "../controllers/settlement.controller.js";

const router = express.Router();
router.use(jwtAuthMiddleware);

router.post("/request", requestSettlement);
router.post("/respond", respondSettlement);
router.post("/cancel", cancelSettlement);

export default router;
