import { Router } from "express";
import { createCashier, getCashiers, toggleCashierStatus, updateCashier, updateCashierPassword } from "../controllers/adminController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// Admin-only route
router.get("/cashiers", verifyToken, requireRole(2), getCashiers);
router.post("/cashiers", verifyToken, requireRole(2), createCashier);
router.patch("/toggle/:id", verifyToken, requireRole(2), toggleCashierStatus);
router.put("/cashiers/:id", verifyToken, requireRole(2), updateCashier);
router.patch("/cashiers/:id/password", verifyToken, requireRole(2), updateCashierPassword);
export default router;
