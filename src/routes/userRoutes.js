import { Router } from "express";
import { updateUser, getActiveEmployeeCount, getUser, getCurrentUser } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { requireRole } from "../middlewares/requireRole.js";
const router = Router();

// fetch profile (self or superadmin)
router.get(
  "/user/:id",
  verifyToken,
  (req, res, next) => {
    if (req.user.role_id === 3 || String(req.user.user_id) === req.params.id) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  },
  getUser
);

// convenience endpoint: return profile of authenticated user
router.get("/user/me", verifyToken, getCurrentUser);

router.patch("/user/:id", verifyToken, requireRole(3), updateUser);

// count of active employees (admin & superadmin)
router.get("/active-count", verifyToken, requireRole(2, 3), getActiveEmployeeCount);

export default router;