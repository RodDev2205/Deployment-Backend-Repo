import express from "express";
import { 
  getAllProducts, 
  getArchivedProducts,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getMenuInventoryByProduct,
  getBranchMenuProducts,
  saveBranchMenuSelection,
  upload 
} from "../controllers/menuController.js";
import { getDeclinedProducts, editDeclinedProduct } from "../controllers/menuController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

router.get("/", verifyToken, requireRole(2, 1), getAllProducts);
router.get("/archived", verifyToken, requireRole(2, 1), getArchivedProducts);
router.get("/branch-menu", verifyToken, requireRole(2, 1), getBranchMenuProducts);
router.post("/branch-menu", verifyToken, requireRole(2, 1), saveBranchMenuSelection);
router.get("/:product_id/inventory", verifyToken, requireRole(2, 1), getMenuInventoryByProduct);
router.post("/", verifyToken, requireRole(2, 1, 3), upload.single("image"), createProduct);
router.put("/:id", verifyToken, requireRole(2, 1), upload.single("image"), updateProduct);
router.delete("/:id", verifyToken, requireRole(2, 1), deleteProduct);
router.get("/declined", verifyToken, requireRole(2), getDeclinedProducts);
router.put("/declined/:id", verifyToken, requireRole(2), upload.single("image"), editDeclinedProduct);

export default router;
