import express from "express";
import { getAllRawItems, addRawItem, updateRawItem } from "../controllers/rawItemController.js";

const router = express.Router();

router.get("/", getAllRawItems);
router.post("/", addRawItem);
router.put("/:id", updateRawItem);

export default router;
