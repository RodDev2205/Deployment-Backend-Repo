import express from "express";
import { getTaxRate, updateTaxRate } from "../controllers/taxController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

// Get current tax rate (accessible by all authenticated users)
router.get("/", getTaxRate);

// Update tax rate (Admin and SuperAdmin only)
// Frontend sends { rate: value }, controller handles mapping to tax_rate
router.put(
  "/",
  verifyToken,
  requireRole(2, 3),
  updateTaxRate
);

export default router;
