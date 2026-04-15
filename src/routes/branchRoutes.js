import { Router } from "express";
import { createBranch, updateBranch, createLocation, getBranches, getAllBranches, getBranchLocations, getBranchAdmins, toggleBranchStatus } from "../controllers/branchController.js";
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

// Regular branch fetching
router.get("/getBranches", verifyToken, getBranches);
router.get("/getAll", verifyToken, getAllBranches);
router.get("/:branchId/admins", verifyToken, getBranchAdmins);
router.get("/locations", verifyToken, getBranchLocations);
router.post("/locations", verifyToken, requireRole(3), createLocation);

export default router;
