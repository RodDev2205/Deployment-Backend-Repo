import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import { addIngredient,
         getIngredientsByBranch, 
         editIngredientById, 
         getAllInventoryItems, 
         getInventoryCount, 
         getLowStockCount,
         getLowStockItems,
         getMainCategories,
         getSubCategories,
         createMainCategory,
         updateMainCategory,
         deleteMainCategory,
         createSubCategory,
         updateSubCategory,
         deleteSubCategory } from '../controllers/inventoryController.js';

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

// ===== MAIN CATEGORIES ROUTES =====
// Get all main categories
router.get(
  '/main-categories',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  getMainCategories
);

// Create main category
router.post(
  '/main-categories',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  createMainCategory
);

// Update main category
router.put(
  '/main-categories/:id',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  updateMainCategory
);

// Delete main category
router.delete(
  '/main-categories/:id',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  deleteMainCategory
);

// ===== SUB CATEGORIES ROUTES =====
// Get all sub categories (optionally filtered by main_category_id)
router.get(
  '/sub-categories',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  getSubCategories
);

// Create sub category
router.post(
  '/sub-categories',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  createSubCategory
);

// Update sub category
router.put(
  '/sub-categories/:id',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  updateSubCategory
);

// Delete sub category
router.delete(
  '/sub-categories/:id',
  verifyToken,
  requireRole(2, 3), // SuperAdmin and Admin
  deleteSubCategory
);

export default router;