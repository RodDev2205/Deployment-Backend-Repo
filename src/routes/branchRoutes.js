import { Router } from "express";
import { createBranch, updateBranch } from "../controllers/branchController.js";
import { getBranches, getAllBranches } from "../controllers/branchController.js";
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
router.get("/getBranches", verifyToken, getBranches);
router.get("/getAll", verifyToken, getAllBranches);

export default router;
