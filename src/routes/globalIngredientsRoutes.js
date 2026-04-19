import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  createGlobalIngredient,
  getAllGlobalIngredients,
  updateGlobalIngredient,
  deleteGlobalIngredient
} from '../controllers/globalIngredientsController.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Superadmin-only create/update/delete routes
router.post('/', requireRole(3), createGlobalIngredient);
router.get('/', requireRole(2, 3), getAllGlobalIngredients);
router.put('/:id', requireRole(3), updateGlobalIngredient);
router.delete('/:id', requireRole(3), deleteGlobalIngredient);

export default router;