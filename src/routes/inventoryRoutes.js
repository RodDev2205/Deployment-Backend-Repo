import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import { addIngredient, getIngredientsByBranch, editIngredientById, getAllInventoryItems, getInventoryCount, getLowStockCount } from '../controllers/inventoryController.js';

const router = Router();

// Add new ingredient (only for SuperAdmin and Admin)
router.post(
  '/add-ingredient',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  addIngredient
);

// Get ingredients for a specific branch (only for SuperAdmin and Admin)
router.get(
  '/get-ingredients',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  getIngredientsByBranch
);

// Get all ingredients across all branches (only for SuperAdmin)
router.get(
  '/all-inventory',
  verifyToken,
  requireRole(3), // SuperAdmin only
  getAllInventoryItems
);

// Edit an existing ingredient (only for SuperAdmin and Admin)
router.put(
  '/edit-ingredient/:id',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  editIngredientById
);

// Get inventory count (SuperAdmin and Admin)
router.get(
  '/count',
  verifyToken,
  requireRole(2, 3),
  getInventoryCount
);

// Get count of low-stock inventory items (SuperAdmin and Admin)
router.get(
  '/low-stock-count',
  verifyToken,
  requireRole(2, 3),
  getLowStockCount
);

// Get list of low-stock inventory items (limited) for overview dashboard
router.get(
  '/low-stock-items',
  verifyToken,
  requireRole(2, 3),
  getLowStockItems
);



export default router;