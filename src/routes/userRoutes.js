import { Router } from "express";
import { updateUser, getActiveEmployeeCount } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";
const router = Router();

router.patch("/user/:id", verifyToken, requireRole(3), updateUser);

// count of active employees (admin & superadmin)
router.get("/active-count", verifyToken, requireRole(2, 3), getActiveEmployeeCount);

export default router;