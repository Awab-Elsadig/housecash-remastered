import express from "express";
import {
	createItem,
	deleteItem,
	getItems,
	getItemsByUserId,
	updateItem,
	getAllItems,
	undoGetAll,
	payAll,
	undoPayAll,
	updatePaymentStatus,
	resolveBalance,
} from "../controllers/item.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

router.post("/create-item", jwtAuthMiddleware, createItem);
router.get("/get-items-by-user-id/:userId", jwtAuthMiddleware, getItemsByUserId);
router.get("/get-items", jwtAuthMiddleware, getItems);
router.patch("/update-item/:itemId", jwtAuthMiddleware, updateItem);
router.delete("/delete-item/:houseCode/:userId/:itemId", jwtAuthMiddleware, deleteItem);

// Payment Details actions
router.patch("/get-all", jwtAuthMiddleware, getAllItems);
router.patch("/undo-get-all", jwtAuthMiddleware, undoGetAll);
router.patch("/pay-all", jwtAuthMiddleware, payAll);
router.patch("/undo-pay-all", jwtAuthMiddleware, undoPayAll);
router.patch("/:itemId/payment", jwtAuthMiddleware, updatePaymentStatus);
router.patch(
	"/resolve-balance",
	jwtAuthMiddleware,
	(req, res, next) => {
		console.log("Route hit: /api/items/resolve-balance");
		console.log("Request method:", req.method);
		console.log("Request body:", req.body);
		next();
	},
	resolveBalance
);

export default router;
