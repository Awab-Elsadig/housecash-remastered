import express from "express";
import { impersonateUser, stopImpersonation, getAllUsers } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// Protect these routes with authMiddleware and also check admin rights (if desired).
router.use(jwtAuthMiddleware);
router.use(authMiddleware);

// Route to list all users for admin selection.
router.get("/users", getAllUsers);

// Route to impersonate a user. (POST with the userId of the user to impersonate.)
router.post("/impersonate", impersonateUser);

// Route to stop impersonation.
router.post("/stop-impersonation", stopImpersonation);

export default router;
