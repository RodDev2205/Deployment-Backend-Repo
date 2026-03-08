// routes/activityRoutes.js
import { Router } from "express";
import { getActivityLogs, getLoginLogs } from "../controllers/activityController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, getActivityLogs); // protected route
router.get("/login-logs", verifyToken, getLoginLogs); // protected route

export default router;
