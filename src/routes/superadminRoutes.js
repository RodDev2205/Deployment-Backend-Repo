import { Router } from "express";
import { getAdmin, toggleUserStatus, getAllStaff } from "../controllers/superadminController.js";
import { getCashiers } from "../controllers/superadminController.js";
import { createAdmin } from "../controllers/superadminController.js";
import { getStaffByBranch } from "../controllers/superadminController.js";
import { createCashier } from "../controllers/superadminController.js"
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";
const router = Router();

router.get("/getAdmin", verifyToken, requireRole(3), getAdmin);
router.get("/getCashier", verifyToken, requireRole(3), getCashiers);
router.patch("/users/:id/status", verifyToken, requireRole(3), toggleUserStatus);
router.post("/createAdmin", verifyToken, requireRole(3), createAdmin);
router.post("/createCashier", verifyToken, requireRole(3), createCashier);
router.get("/staff", verifyToken, requireRole(3), getAllStaff);
router.get("/:branch_id/staff", verifyToken, requireRole(3), getStaffByBranch);


export default router;