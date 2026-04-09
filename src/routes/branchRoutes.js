import { Router } from "express";
import { createBranch, updateBranch, createLocation, getBranches, getAllBranches, getBranchLocations, getBranchAdmins, toggleBranchStatus, getBranchTaxRate, updateBranchTaxRate, getBranchesWithTax, getCurrentBranchTaxRate } from "../controllers/branchController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// Only SuperAdmin (role_id = 3)
router.post(
  "/",
  verifyToken,
  requireRole(3),
  createBranch
);
router.put(
  "/:id",
  verifyToken,
  requireRole(3),
  updateBranch
);
router.patch(
  "/:id/toggle-status",
  verifyToken,
  requireRole(3),
  toggleBranchStatus
);

// Get branches with tax rates for tax management
router.get('/getBranchesWithTax', verifyToken, requireRole(3), getBranchesWithTax);

// Get current user's branch tax rate (for POS display)
router.get('/current/tax-rate', verifyToken, getCurrentBranchTaxRate);

// Tax rate management - SuperAdmin only
router.get('/:branchId/tax-rate', verifyToken, requireRole(3), getBranchTaxRate);
router.put('/:branchId/tax-rate', verifyToken, requireRole(3), updateBranchTaxRate);

// Regular branch fetching
router.get("/getBranches", verifyToken, getBranches);
router.get("/getAll", verifyToken, getAllBranches);
router.get("/:branchId/admins", verifyToken, getBranchAdmins);
router.get("/locations", verifyToken, getBranchLocations);
router.post("/locations", verifyToken, requireRole(3), createLocation);

export default router;
