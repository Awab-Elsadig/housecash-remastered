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
} from "../controllers/item.controller.js";

const router = express.Router();

router.post("/create-item", createItem);
router.get("/get-items-by-user-id/:userId", getItemsByUserId);
router.get("/get-items", getItems);
router.patch("/update-item/:itemId", updateItem);
router.delete("/delete-item/:houseCode/:userId/:itemId", deleteItem);

// Payment Details actions
router.patch("/get-all", getAllItems);
router.patch("/undo-get-all", undoGetAll);
router.patch("/pay-all", payAll);
router.patch("/undo-pay-all", undoPayAll);
router.patch("/:itemId/payment", updatePaymentStatus);

export default router;
