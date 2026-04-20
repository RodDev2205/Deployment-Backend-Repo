import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { db } from "./config/db.js";

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
import feedbackRoutes from "./routes/feedbackRoutes.js"; // <-- import feedback route
import globalIngredientsRoutes from "./routes/globalIngredientsRoutes.js";
import branchInventoryRoutes from "./routes/branchInventoryRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://deployment-frontend-repo.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
// serve uploaded files from configurable directory (Railway volume mounted at /app/uploads)
const uploadDir = process.env.UPLOAD_DIR || path.join(path.resolve(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Activity logs table should already exist - no need to create it here
console.log("✅ Using existing activity_logs table");

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
app.use("/api/feedback", feedbackRoutes);
app.use("/api/global-ingredients", globalIngredientsRoutes);
app.use("/api/branch-inventory", branchInventoryRoutes);
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

// Temporary migration endpoint
app.post("/api/migrate-menu-inventory-fk", async (req, res) => {
  try {
    console.log('🔄 Running menu_inventory foreign key migration...');

    // Check current constraints
    const [constraints] = await db.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('Current constraints:', constraints);

    // Check if ingredients table exists and get data
    let ingredientsData = [];
    try {
      const [ingredientsRows] = await db.query('SELECT * FROM ingredients');
      ingredientsData = ingredientsRows;
      console.log(`Found ${ingredientsData.length} ingredients to migrate`);
    } catch (err) {
      console.log('Ingredients table not found or empty, skipping data migration');
    }

    // Drop old constraint
    try {
      await db.query('ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_ingredient');
      console.log('✅ Old constraint dropped');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Constraint not found, continuing...');
      } else {
        throw err;
      }
    }

    // If ingredients table exists, migrate data to inventory table
    if (ingredientsData.length > 0) {
      console.log('📦 Migrating ingredients data to inventory table...');

      for (const ingredient of ingredientsData) {
        // Check if this ingredient already exists in inventory
        const [existing] = await db.query(
          'SELECT inventory_id FROM inventory WHERE item_name = ? AND branch_id IS NULL',
          [ingredient.item_name]
        );

        if (existing.length === 0) {
          // Insert into inventory
          const [result] = await db.query(
            `INSERT INTO inventory
             (item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status, branch_id)
             VALUES (?, ?, ?, ?, ?, 'available', NULL)`,
            [
              ingredient.item_name,
              ingredient.stock_units || 0,
              ingredient.servings_per_unit || 1,
              (ingredient.stock_units || 0) * (ingredient.servings_per_unit || 1),
              ingredient.low_stock_threshold || 5,
            ]
          );
          console.log(`✅ Migrated ingredient ${ingredient.item_name} with new ID ${result.insertId}`);

          // Update menu_inventory to use new inventory_id
          await db.query(
            'UPDATE menu_inventory SET ingredient_id = ? WHERE ingredient_id = ?',
            [result.insertId, ingredient.ingredient_id]
          );
        } else {
          // Update existing inventory and menu_inventory
          await db.query(
            'UPDATE menu_inventory SET ingredient_id = ? WHERE ingredient_id = ?',
            [existing[0].inventory_id, ingredient.ingredient_id]
          );
        }
      }

      console.log('✅ Data migration completed');
    }

    // Add new constraint
    await db.query(`
      ALTER TABLE menu_inventory
      ADD CONSTRAINT fk_menu_inventory_inventory
      FOREIGN KEY (ingredient_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
    `);
    console.log('✅ New constraint added');

    // Verify
    const [newConstraints] = await db.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    res.json({
      success: true,
      message: 'Migration completed successfully',
      migratedIngredients: ingredientsData.length,
      oldConstraints: constraints,
      newConstraints: newConstraints
    });
  } catch (err) {
    console.error('❌ Migration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
