import express from "express";
import { signup, login, logout, verifyPassword } from "../controllers/auth.controller.js";

const router = express.Router();

// Define your authentication routes here
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-password/:userId", verifyPassword);

export default router;
