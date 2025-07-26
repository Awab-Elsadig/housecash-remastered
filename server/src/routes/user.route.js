import express from "express";
import { deleteUser, getUser, getUsersByHouseCode, updateUser } from "../controllers/user.controller.js";
import { addItemToUser } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/get-user", getUser);
router.get("/get-users-by-house-code/:houseCode", getUsersByHouseCode);
router.put("/update-user/:userId", updateUser);
router.patch("/:userId/add-item", addItemToUser);
router.delete("/:userId", deleteUser);

export default router;
