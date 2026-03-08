import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";
import {
  getDailySalesByBranch,
  getSalesTodayByBranch,
  getSalesByPeriod,
  getPaymentMethodBreakdown,
  getTopProductsByBranch,
  getVoidTracking
} from "../controllers/salesAdminController.js";
import { getSalesTrend } from "../controllers/salesTrendController.js";import { getBranchComparison } from "../controllers/salesBranchComparisonController.js";
const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get sales by period (daily, weekly, monthly) (admin/superadmin only)
router.get("/sales", requireRole(2, 3), getSalesByPeriod);
router.get("/sales-trend", requireRole(2, 3), getSalesTrend);
router.get("/branch-comparison", requireRole(2, 3), getBranchComparison);

// Get payment method breakdown (admin/superadmin only)
router.get("/payment-methods", requireRole(2, 3), getPaymentMethodBreakdown);

// Get top selling products (admin/superadmin only)
router.get("/top-products", requireRole(2, 3), getTopProductsByBranch);

// Get daily sales (admin/superadmin only)
router.get("/daily-sales", requireRole(2, 3), getDailySalesByBranch);

// Get today's sales summary (admin/superadmin only)
router.get("/today-sales", requireRole(2, 3), getSalesTodayByBranch);

// Get void tracking (admin/superadmin only)
router.get("/void-tracking", requireRole(2, 3), getVoidTracking);

export default router;
