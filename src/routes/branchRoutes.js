import { Router } from "express";
import { createBranch } from "../controllers/branchController.js";
import { getBranches, getAllBranches } from "../controllers/branchController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// Only SuperAdmin (role_id = 1)
router.post(
  "/",
  verifyToken,
  requireRole(3),
  createBranch
);
router.get("/getBranches", verifyToken, getBranches);
router.get("/getAll", verifyToken, getAllBranches);

export default router;
