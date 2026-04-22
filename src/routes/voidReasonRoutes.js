import express from "express";
import { getAllVoidReasons, createVoidReason, updateVoidReason, deleteVoidReason } from "../controllers/voidReasonController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

// Get all void reasons
router.get("/", getAllVoidReasons);

// Create void reason (Admin and SuperAdmin only)
router.post(
  "/",
  verifyToken,
  requireRole(2, 3),
  createVoidReason
);

// Update void reason (Admin and SuperAdmin only)
router.put(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  updateVoidReason
);

// Delete void reason (Admin and SuperAdmin only)
router.delete(
  "/:id",
  verifyToken,
  requireRole(2, 3),
  deleteVoidReason
);

export default router;
