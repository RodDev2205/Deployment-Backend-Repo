import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  addIngredientToBranch,
  getBranchInventory,
  updateBranchStock,
  removeIngredientFromBranch,
  getAllBranchInventories
} from '../controllers/branchInventoryController.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Branch admin routes (role 2)
router.post('/add', requireRole(2), addIngredientToBranch);
router.get('/', requireRole(2), getBranchInventory);
router.put('/:id/stock', requireRole(2), updateBranchStock);
router.delete('/:id', requireRole(2), removeIngredientFromBranch);

// Superadmin routes (role 3)
router.get('/all', requireRole(3), getAllBranchInventories);

export default router;