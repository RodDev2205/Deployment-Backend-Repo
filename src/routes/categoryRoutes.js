import express from "express";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

// Get all categories
router.get("/", getAllCategories);

// Create category (Admin and SuperAdmin only)
router.post(
  "/",
  verifyToken,
  requireRole(2, 3),
  createCategory
);

// Update category (Admin and SuperAdmin only)
router.put(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  updateCategory
);

// Delete category (Admin and SuperAdmin only)
router.delete(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  deleteCategory
);

export default router;
