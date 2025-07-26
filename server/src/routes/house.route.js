import express from "express";
import { createHouse, checkHouseCode, getHouse } from "../controllers/house.controller.js";
import { addItemToHouse } from "../controllers/house.controller.js";

const router = express.Router();

router.get("/:houseCode", getHouse);
router.post("/check-house-code", checkHouseCode);
router.post("/create-house", createHouse);
router.patch("/:houseCode/add-item", addItemToHouse);

export default router;
