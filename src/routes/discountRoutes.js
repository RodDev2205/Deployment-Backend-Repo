import express from "express";
import { getDiscounts, createDiscount, updateDiscount, toggleDiscountStatus, deleteDiscount } from "../controllers/discountController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

// Get all discounts
router.get("/", getDiscounts);

// Create new discount (Admin and SuperAdmin only)
router.post(
  "/",
  verifyToken,
  requireRole(2, 3),
  createDiscount
);

// Update discount (Admin and SuperAdmin only)
router.put(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  updateDiscount
);

// Toggle discount status (Admin and SuperAdmin only)
router.put(
  "/:id/toggle-status",
  verifyToken,
  requireRole(2, 3),
  toggleDiscountStatus
);

// Delete discount (Admin and SuperAdmin only)
router.delete(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  deleteDiscount
);

export default router;
