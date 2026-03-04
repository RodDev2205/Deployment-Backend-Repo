import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import menuRoutes from "./routes/menuRoutes.js"; // <-- import menu routes
import categoryRoutes from "./routes/categoryRoutes.js";
import rawItemsRoutes from "./routes/rawItemRoutes.js";
import portionRoutes from "./routes/portionRoutes.js";
import posRoutes from "./routes/posRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import menu_superadmin_Routes from "./routes/menu_superadmin_Routes.js";
import chatRoutes from "./routes/chatRoutes.js";
import activityRoutes from "./routes/activityRoutes.js"; // <-- import activity routes
import salesAdminRoutes from "./routes/salesAdminRoutes.js"; // <-- import sales admin routes
import salesSuperAdminRoutes from "./routes/salesSuperAdminRoutes.js"; // <-- import sales superadmin routes
import inventoryRoutes from "./routes/inventoryRoutes.js"; // <-- import inventory routes 

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://deployment-frontend-repo.vercel.app"
}));
app.use(express.json());
// serve uploaded files from configurable directory (Railway volume mounted at /app/uploads)
const uploadDir = process.env.UPLOAD_DIR || path.join(path.resolve(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Register routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes); // <-- register menu routes
app.use("/api/categories", categoryRoutes);
app.use("/api/raw-items", rawItemsRoutes);
app.use("/api/portions", portionRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/menu-superadmin", menu_superadmin_Routes);
app.use("/api/chat", chatRoutes); // <-- register chat routes
app.use("/api/inventory", inventoryRoutes); // <-- register inventory routes
app.use("/api/sales-admin", salesAdminRoutes); // <-- register sales admin routes
app.use("/api/sales-superadmin", salesSuperAdminRoutes); // register sales superadmin routes
app.use("/api/activity-logs", activityRoutes);
// Print route

app.post("/api/print-receipt", async (req, res) => {
  const data = req.body;

  try {
    // Dynamically import CJS module
    const printModule = await import("../usb-test-print.cjs");
    const { printReceipt } = printModule;

    printReceipt(data); // Send data to printer

    res.json({ success: true, message: "Printing started!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default app;
