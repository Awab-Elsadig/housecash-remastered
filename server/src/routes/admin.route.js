import express from "express";
import { impersonateUser, stopImpersonation, getAllUsers, generateExpensesReport, generateExpensesCSV, migrateItemsRemoveGot } from "../controllers/admin.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

// Protect these routes with authMiddleware and also check admin rights (if desired).
router.use(jwtAuthMiddleware);
router.use(authMiddleware);

// Route to list all users for admin selection.
router.get("/users", getAllUsers);

// Route to impersonate a user. (POST with the userId of the user to impersonate.)
router.post("/impersonate", impersonateUser);

// Route to check impersonation status.
router.get("/impersonation-status", (req, res) => {
	if (req.session.impersonatedUserId) {
		res.json({
			isImpersonating: true,
			impersonatedUserId: req.session.impersonatedUserId,
			originalAdminId: req.session.originalAdminId,
		});
	} else {
		res.json({ isImpersonating: false });
	}
});

// Route to stop impersonation.
router.post("/stop-impersonation", stopImpersonation);

// PDF report of all past expenses
router.get("/reports/expenses.pdf", generateExpensesReport);
router.get("/reports/expenses.csv", generateExpensesCSV);

// Migration endpoint
router.post("/migrate/items/remove-got", migrateItemsRemoveGot);

export default router;
