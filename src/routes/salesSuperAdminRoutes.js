import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import { getKpis, getBranches, getBranchSalesSummary, getTopMenuSalesByBranch, getVoidTransactions, getSalesReport } from '../controllers/salesSuperAdminController.js';
import { getRecentTransactions } from '../controllers/transactionController.js';
import { getSalesTrend } from '../controllers/salesTrendController.js';
import { getBranchComparison } from '../controllers/salesBranchComparisonController.js';
import { getTopMenuItems } from '../controllers/topMenuController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

// all routes require authentication
router.use(verifyToken);

// accessible by admin (2) and superadmin (3)
router.get('/kpis', requireRole(2, 3), getKpis);
router.get('/branches', requireRole(2, 3), getBranches);
// sales trend line chart data endpoint
router.get('/sales-trend', requireRole(2, 3), getSalesTrend);
// branch comparison bar chart data
router.get('/branch-comparison', requireRole(2, 3), getBranchComparison);
// top menu items endpoint
router.get('/top-menu-items', requireRole(2, 3), getTopMenuItems);
// dashboard statistics for owner/superadmin
router.get('/dashboard-stats', requireRole(2, 3), getDashboardStats);
// per-branch sales summary for current day
router.get('/branch-sales-summary', requireRole(2, 3), getBranchSalesSummary);
// top menu sales by branch
router.get('/top-menu-sales', requireRole(2, 3), getTopMenuSalesByBranch);
// void transactions endpoint
router.get('/void-transactions', requireRole(2, 3), getVoidTransactions);
// sales report endpoint (sample query as requested)
router.get('/sales-report', requireRole(2, 3), getSalesReport);
// recent transactions for a branch (query: branchId, limit)
router.get('/recent-transactions', requireRole(2, 3), getRecentTransactions);

export default router;
