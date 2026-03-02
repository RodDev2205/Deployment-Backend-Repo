import express from "express";
import { getAllPortions, addPortion, updatePortion } from "../controllers/portionController.js";

const router = express.Router();

router.get("/", getAllPortions);
router.post("/", addPortion);
router.put("/:portion_id", updatePortion);

export default router;
