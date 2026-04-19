import { db } from "../config/db.js";
import multer from "multer";
import path from "path";

// Helper function to log menu activities
async function logMenuActivity({ userId, branchId, activityType, description, referenceId }) {
  try {
    await db.query(
      `INSERT INTO activity_logs
        (user_id, branch_id, activity_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, branchId, activityType, referenceId, description]
    );
  } catch (err) {
    console.error('Failed to log menu activity:', err);
    // Don't throw error to avoid breaking the main operation
  }
}

// -------------------
// Multer configuration
// support configurable upload directory (Railway volume mounted at /app/uploads)
// -------------------
const uploadDir = process.env.UPLOAD_DIR || "uploads";

// ensure directory exists when server starts
import fs from "fs";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

export const upload = multer({ storage });

// -------------------
// GET all products
// -------------------
export const getAllProducts = async (req, res) => {
  try {
    const userBranchId = req.user.branch_id; // assuming your JWT sets req.user

    // determine filtering based on query parameters
    // priority: explicit menu_status param > showArchived flag > default active
    const menuStatus = req.query.menu_status; // e.g. 'active' or 'archived'
    const showArchived = req.query.showArchived === '1';

    console.log("getAllProducts - menuStatus param:", menuStatus, "type:", typeof menuStatus);

    // build base query; archived view should not filter by approval_status
    let baseQuery = `SELECT p.product_id, p.product_name, p.price, p.status, p.menu_status, p.approval_status, 
              p.vat_type, p.image_name, p.image_path, p.created_by, p.branch_id,
              c.category_name,
              IF(bm.branch_menu_id IS NULL, 0, bm.is_available) AS is_available,
              bm.custom_price
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN branch_menu bm ON bm.product_id = p.product_id AND bm.branch_id = ?
       WHERE (
         p.branch_id = ?
         OR (bm.branch_menu_id IS NOT NULL AND bm.is_available = 1)
       )`;
    const params = [userBranchId, userBranchId];

    if (menuStatus === 'archived') {
      console.log("ARCHIVED BRANCH - keeping all approval states");
      // keep all approval states for archived items
    } else {
      console.log("NON-ARCHIVED BRANCH - adding approval filter");
      baseQuery += " AND p.approval_status = 'APPROVED'";
    }

    if (menuStatus) {
      console.log("Adding menu_status filter:", menuStatus);
      baseQuery += " AND p.menu_status = ?";
      params.push(menuStatus);
    } else if (!showArchived) {
      console.log("No menuStatus and not showArchived - defaulting to active");
      baseQuery += " AND p.menu_status = 'active'";
    }

    console.log("getAllProducts final query=", baseQuery, "params=", params);
    const [rows] = await db.query(baseQuery, params);
    console.log("getAllProducts returned", rows.length, "rows with menu_status values:", rows.map(r => r.menu_status));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// wrapper for archived tab - directly query without relying on req.query
export const getArchivedProducts = async (req, res) => {
  try {
    const userBranchId = req.user.branch_id;
    
    let baseQuery = `SELECT p.product_id, p.product_name, p.price, p.status, p.menu_status, p.approval_status, 
              p.vat_type, p.image_name, p.image_path, p.created_by, p.branch_id,
              c.category_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       WHERE p.branch_id = ? AND p.menu_status = 'archived'`;
    const params = [userBranchId];

    console.log("getArchivedProducts query=", baseQuery, "params=", params);
    const [rows] = await db.query(baseQuery, params);
    console.log("getArchivedProducts returned", rows.length, "rows with menu_status:", rows.map(r => r.menu_status));

    res.json(rows);
  } catch (err) {
    console.error("getArchivedProducts error:", err);
    res.status(500).json({ error: err.message });
  }
};


// -------------------
// CREATE product
// -------------------
/*export const createProduct = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    if (!req.user?.user_id || !req.user?.branch_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let { product_name, category_id, price, ingredients, vat_type = 'vat' } = req.body;
    const created_by = req.user.user_id;
    const branch_id = req.user.branch_id;
    const role_id = req.user.role_id;

    if (vat_type !== 'non-vat') {
      vat_type = 'vat';
    }

    const approvalStatus = role_id === 3 ? 'APPROVED' : 'PENDING';

    // Parse ingredients if it comes as a JSON string (from FormData)
    if (typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (e) {
        ingredients = [];
      }
    }

    const image_name = req.file ? req.file.originalname : null;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    // 1️⃣ Insert product first
    const [result] = await connection.query(
      `INSERT INTO products 
      (product_name, category_id, price, image_name, image_path, created_by, branch_id, approval_status, vat_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_name, category_id, price, image_name, image_path, created_by, branch_id, approvalStatus, vat_type]
    );

    const productId = result.insertId;

    // 2️⃣ Insert product ingredients (if any)
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        await connection.query(
          `INSERT INTO menu_inventory 
          (product_id, ingredient_id, servings_required)
          VALUES (?, ?, ?)`,
          [productId, ing.id, ing.quantity]
        );
      }
    }

    await connection.commit();

    // Log the menu item creation
    await logMenuActivity({
      userId: created_by,
      branchId: branch_id,
      activityType: 'menu_item_created',
      description: `Created new menu item: ${product_name}`,
      referenceId: productId
    });

    res.status(201).json({ message: "Product created successfully", product_id: productId });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};*/


// -------------------
// UPDATE product
// -------------------
export const updateProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { product_name, category_id, price, status, menu_status, ingredients, vat_type } = req.body;

    // Parse ingredients if sent as JSON string (FormData)
    if (typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (e) {
        ingredients = [];
      }
    }

    // Normalize vat_type values
    if (vat_type !== undefined) {
      vat_type = vat_type === 'non-vat' ? 'non-vat' : 'vat';
    }

    // Build update query
    let query = `UPDATE products SET product_name=?, price=?`;
    const params = [product_name, price];

    // optional fields
    if (typeof status !== 'undefined') {
      query += `, status=?`;
      params.push(status);
    }
    if (typeof menu_status !== 'undefined') {
      query += `, menu_status=?`;
      params.push(menu_status);
    }
    // Only include category_id when it's a valid numeric id (prevents empty string causing FK error)
    if (typeof category_id !== 'undefined' && category_id !== '') {
      const catId = Number(category_id);
      if (!Number.isNaN(catId) && catId > 0) {
        query += `, category_id=?`;
        params.push(catId);
      }
    }

    if (req.file) {
      query += `, image_name=?, image_path=?`;
      params.push(req.file.originalname, `/uploads/${req.file.filename}`);
    }

    if (typeof vat_type !== 'undefined') {
      query += `, vat_type=?`;
      params.push(vat_type);
    }

    query += ` WHERE product_id=?`;
    params.push(id);

    const [result] = await connection.query(query, params);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // Update linked ingredients if provided (replace existing links)
    if (ingredients && Array.isArray(ingredients)) {
      await connection.query(`DELETE FROM menu_inventory WHERE product_id=?`, [id]);
      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          await connection.query(
            `INSERT INTO menu_inventory (product_id, inventory_id, servings_required) VALUES (?, ?, ?)`,
            [id, ing.id, ing.quantity]
          );
        }
      }
    }

    await connection.commit();

    // Log the menu item update
    await logMenuActivity({
      userId: req.user.user_id,
      branchId: req.user.branch_id,
      activityType: 'menu_item_updated',
      description: `Updated menu item: ${product_name}`,
      referenceId: id
    });

    // Return the updated product including category_name
    const [row] = await db.query(
      `SELECT p.product_id, p.product_name, p.price, p.status, p.menu_status, p.approval_status, p.vat_type, p.category_id,
              p.image_name, p.image_path, p.created_by, p.branch_id, c.category_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [id]
    );

    res.json(row[0]);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// -------------------
// DELETE product
// -------------------
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product info before deletion for logging
    const [productInfo] = await db.query(
      'SELECT product_name FROM products WHERE product_id = ?',
      [id]
    );

    const [result] = await db.query("DELETE FROM products WHERE product_id=?", [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });

    // Log the menu item deletion
    if (productInfo.length > 0) {
      await logMenuActivity({
        userId: req.user.user_id,
        branchId: req.user.branch_id,
        activityType: 'menu_item_deleted',
        description: `Deleted menu item: ${productInfo[0].product_name}`,
        referenceId: id
      });
    }

    res.json({ message: "Product deleted successfully", product_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// GET all declined products for the current user & branch
// -------------------
export const getDeclinedProducts = async (req, res) => {
  try {
    // Ensure we have user info
    if (!req.user || !req.user.user_id || !req.user.branch_id) {
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    const userId = req.user.user_id;
    const branchId = req.user.branch_id;

    const [rows] = await db.query(
      `SELECT p.product_id, p.product_name, p.price, p.status, p.approval_status, p.vat_type,
              p.image_name, p.image_path, p.created_by, p.branch_id, p.decline_reason,
              c.category_name, u.username as reviewed_by
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN users u ON p.reviewed_by = u.user_id
       WHERE p.approval_status = 'DECLINED' 
         AND p.branch_id = ? 
         AND p.created_by = ?`,
      [branchId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// UPDATE declined product (resubmit for review)
// -------------------
export const editDeclinedProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params; // product_id
    let { product_name, category_id, price, status, ingredients } = req.body;

    // Validate user
    if (!req.user?.user_id || !req.user?.branch_id) {
      await connection.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.user_id;
    const branchId = req.user.branch_id;

    // Parse ingredients if it comes as a JSON string (from FormData)
    if (typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (e) {
        ingredients = [];
      }
    }

    // Validate category_id
    const catId = Number(category_id);
    if (!catId || isNaN(catId)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid category selected." });
    }

    // Check if product exists and is editable
    const [existing] = await connection.query(
      `SELECT * FROM products WHERE product_id=? AND created_by=? AND branch_id=? AND approval_status='DECLINED'`,
      [id, userId, branchId]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Declined product not found or cannot edit" });
    }

    // Build update query
    let query = `UPDATE products SET product_name=?, price=?, status=?, category_id=?, approval_status='PENDING'`;
    const params = [product_name.trim(), price, status, catId];

    if (req.file) {
      query += `, image_name=?, image_path=?`;
      params.push(req.file.originalname, `/uploads/${req.file.filename}`);
    }

    query += ` WHERE product_id=? AND created_by=? AND branch_id=?`;
    params.push(id, userId, branchId);

    const [result] = await connection.query(query, params);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Failed to update product" });
    }

    // Replace linked ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      await connection.query(`DELETE FROM menu_inventory WHERE product_id=?`, [id]);
      if (ingredients.length > 0) {
        for (const ing of ingredients) {
          await connection.query(
            `INSERT INTO menu_inventory (product_id, inventory_id, servings_required) VALUES (?, ?, ?)`,
            [id, ing.id, ing.quantity]
          );
        }
      }
    }

    await connection.commit();

    // Log the declined product edit
    await logMenuActivity({
      userId: userId,
      branchId: branchId,
      activityType: 'declined_menu_item_edited',
      description: `Edited declined menu item for resubmission: ${product_name}`,
      referenceId: id
    });

    // Return updated product with category name
    const [row] = await db.query(
      `SELECT p.*, c.category_name 
       FROM products p 
       JOIN categories c ON p.category_id = c.category_id 
       WHERE p.product_id=?`,
      [id]
    );

    res.json(row[0]);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// -------------------
// GET linked inventory for a product (for branch admins)
// -------------------
export const getMenuInventoryByProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    // ensure product exists and belongs to user's branch
    const [prodRows] = await db.query(`SELECT branch_id FROM products WHERE product_id = ?`, [product_id]);
    if (!prodRows.length) return res.status(404).json({ message: "Product not found" });

    const productBranch = prodRows[0].branch_id;
    if (req.user && req.user.branch_id && req.user.branch_id !== productBranch) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [rows] = await db.query(
      `SELECT mi.product_id, mi.inventory_id, mi.servings_required, i.item_name, i.quantity_per_unit, i.servings_per_unit
       FROM menu_inventory mi
       JOIN ingredients i ON mi.inventory_id = i.ingredient_id
       WHERE mi.product_id = ?`,
      [product_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// CREATE product
// -------------------
export const createProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let { product_name, category_id, price, vat_type, ingredients } = req.body;
    const created_by = req.user.user_id;
    const branch_id = req.user.branch_id;

    // Parse ingredients if sent as JSON string (FormData)
    if (typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (e) {
        ingredients = [];
      }
    }

    // Normalize vat_type values
    if (vat_type !== undefined) {
      vat_type = vat_type === 'non-vat' ? 'non-vat' : 'vat';
    }

    // Insert product
    let query = `INSERT INTO products (product_name, category_id, price, vat_type, created_by, branch_id, approval_status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`;
    const params = [product_name, category_id, price, vat_type, created_by, branch_id];

    if (req.file) {
      query = `INSERT INTO products (product_name, category_id, price, vat_type, image_name, image_path, created_by, branch_id, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`;
      params.push(req.file.originalname, `/uploads/${req.file.filename}`, created_by, branch_id);
    }

    const [result] = await connection.query(query, params);
    const productId = result.insertId;

    // Insert linked ingredients
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        if (ing.id && ing.quantity > 0) {
          await connection.query(
            `INSERT INTO menu_inventory (product_id, inventory_id, servings_required) VALUES (?, ?, ?)`,
            [productId, ing.id, ing.quantity]
          );
        }
      }
    }

    await connection.commit();

    // Log the menu item creation
    await logMenuActivity({
      userId: created_by,
      branchId: branch_id,
      activityType: 'menu_item_created',
      description: `Created menu item: ${product_name}`,
      referenceId: productId
    });

    res.status(201).json({ message: "Product created successfully", product_id: productId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};
export const getBranchMenuProducts = async (req, res) => {
  try {
    const branchId = req.user?.branch_id;
    if (!branchId) return res.status(401).json({ error: "Unauthorized" });

    const [rows] = await db.query(
      `SELECT p.product_id, p.product_name, p.price, p.status, p.menu_status, p.approval_status,
              p.vat_type, p.image_name, p.image_path, p.branch_id AS origin_branch_id,
              c.category_name,
              IF(bm.branch_menu_id IS NULL, 0, bm.is_available) AS is_available,
              bm.custom_price
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN branch_menu bm ON bm.product_id = p.product_id AND bm.branch_id = ?
       WHERE p.approval_status = 'APPROVED'
         AND p.menu_status = 'active'
         AND p.status = 'available'
       ORDER BY p.product_name`,
      [branchId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const saveBranchMenuSelection = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const branchId = req.user?.branch_id;
    const rawProductIds = req.body.product_ids;
    if (!branchId) {
      await connection.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(rawProductIds)) {
      await connection.rollback();
      return res.status(400).json({ error: "product_ids must be an array" });
    }

    const productIds = rawProductIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    const productIdsForQuery = productIds.length ? productIds : [0];

    const [existingRows] = await connection.query(
      `SELECT product_id FROM branch_menu WHERE branch_id = ? AND product_id IN (?)`,
      [branchId, productIdsForQuery]
    );
    const existingIds = existingRows.map((row) => row.product_id);
    const toInsert = productIds.filter((id) => !existingIds.includes(id));

    if (toInsert.length > 0) {
      const insertValues = toInsert.map(() => "(?, ?, 1, NULL, NOW(), NOW())").join(", ");
      const insertParams = toInsert.flatMap((id) => [branchId, id]);
      await connection.query(
        `INSERT INTO branch_menu (branch_id, product_id, is_available, custom_price, created_at, updated_at) VALUES ${insertValues}`,
        insertParams
      );
    }

    if (existingIds.length > 0) {
      await connection.query(
        `UPDATE branch_menu SET is_available = 1, updated_at = NOW() WHERE branch_id = ? AND product_id IN (?)`,
        [branchId, existingIds]
      );
    }

    if (productIds.length > 0) {
      await connection.query(
        `UPDATE branch_menu SET is_available = 0, updated_at = NOW() WHERE branch_id = ? AND product_id NOT IN (?)`,
        [branchId, productIds]
      );
    } else {
      await connection.query(
        `UPDATE branch_menu SET is_available = 0, updated_at = NOW() WHERE branch_id = ?`,
        [branchId]
      );
    }

    await connection.commit();
    res.json({ message: "Branch menu selection updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};



