import { Router } from "express";
import { getAllProducts, 
         updateApprovalStatus,
         getMenuApprovedByBranch,
         getMenuInventorybyid } from "../controllers/menu_superadmin_Controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/products", verifyToken, requireRole(3), getAllProducts);
router.put("/products/:id/status", verifyToken, requireRole(3), updateApprovalStatus);
router.get("/branches/:branch_id/approved-menu", verifyToken, requireRole(3), getMenuApprovedByBranch);
router.get("/menu-inventory/:product_id", verifyToken, requireRole(3), getMenuInventorybyid);

export default router;