import express from "express";
import { checkEmail, checkHouseCode } from "../controllers/validation.controller.js";

const router = express.Router();

router.post("/check-email", checkEmail);
router.post("/check-house-code", checkHouseCode);

export default router;
