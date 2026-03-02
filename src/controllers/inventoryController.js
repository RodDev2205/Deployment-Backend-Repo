import { db } from "../config/db.js";
import { io } from "../../server.js"; // notify dashboard updates

export const addIngredient = async (req, res) => {
  try {
    console.log("REQ.USER:", req.user);
    console.log("REQ.BODY:", req.body);

    const { item_name, quantity, servings_per_unit, low_stock_threshold, status } = req.body;
    const branch_id = req.user.branch_id;

    const total_servings = quantity * servings_per_unit;

    const query = `
      INSERT INTO inventory 
      (item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    // Determine status based on quantity and threshold
    const effectiveStatus = (Number(quantity) === 0)
      ? 'out_of_stock'
      : (Number(quantity) <= Number(low_stock_threshold) ? 'low_stock' : (status || 'available'));

    const values = [
      item_name,
      quantity,
      servings_per_unit,
      total_servings,
      low_stock_threshold,
      effectiveStatus,
      branch_id,
    ];

    // use promise-based pool (mysql2/promise)
    const [result] = await db.execute(query, values);

    console.log("Ingredient inserted with ID:", result.insertId);
    // notify dashboard
    io.to(`branch_${branch_id}`).emit('dashboardUpdate', { branch_id });
    res.status(201).json({ message: "Ingredient added successfully", id: result.insertId });
  } catch (error) {
    console.error("DB/CATCH ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// GET ingredients for the current user's branch
export const getIngredientsByBranch = async (req, res) => {
  try {
    const branch_id = req.user.branch_id;

    // Get pagination values from query
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;

    // If no pagination → return all (for inventory page)
    if (!page || !limit) {
      const [rows] = await db.execute(
        `SELECT *
         FROM inventory
         WHERE branch_id = ?
         ORDER BY item_name ASC`,
        [branch_id]
      );

      return res.status(200).json(rows);
    }

    // If pagination requested → apply LIMIT + OFFSET
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
      `SELECT *
       FROM inventory
       WHERE branch_id = ?
       ORDER BY item_name ASC
       LIMIT ? OFFSET ?`,
      [branch_id, limit, offset]
    );

    // Also get total count for pagination control
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total
       FROM inventory
       WHERE branch_id = ?`,
      [branch_id]
    );

    res.status(200).json({
      data: rows,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// GET all ingredients across all branches (SuperAdmin only)
export const getAllInventoryItems = async (req, res) => {
  try {
    // Fetch inventory from all branches with branch information
    const [rows] = await db.execute(
      `SELECT i.*, b.branch_name
       FROM inventory i
       LEFT JOIN branches b ON i.branch_id = b.branch_id
       ORDER BY b.branch_name ASC, i.item_name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// GET inventory record count (branch-specific for admin, global for superadmin)
export const getInventoryCount = async (req, res) => {
  try {
    let query;
    let params = [];
    // if the user is superadmin (role 3) return global count
    if (req.user && req.user.role_id === 3) {
      query = `SELECT COUNT(*) as count FROM inventory`;
    } else {
      const branch_id = req.user.branch_id;
      query = `SELECT COUNT(*) as count FROM inventory WHERE branch_id = ?`;
      params = [branch_id];
    }

    const [[{ count }]] = await db.execute(query, params);
    res.status(200).json({ count });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

// GET count of low-stock items (based on total_servings <= low_stock_threshold)
export const getLowStockCount = async (req, res) => {
  try {
    let query;
    let params = [];

    // global count for superadmin
    if (req.user && req.user.role_id === 3) {
      // threshold now applies to quantity/unit rather than servings
      query = `SELECT COUNT(*) as count FROM inventory WHERE quantity <= low_stock_threshold`;
    } else {
      const branch_id = req.user.branch_id;
      query = `SELECT COUNT(*) as count FROM inventory WHERE branch_id = ? AND quantity <= low_stock_threshold`;
      params = [branch_id];
    }

    const [[{ count }]] = await db.execute(query, params);
    res.status(200).json({ count });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

export const editIngredientById = async (req, res) => {
  try {
    const { id } = req.params; // inventory ID from URL
    const branch_id = req.user.branch_id; // ensure user only edits their branch

    const {
      item_name,
      quantity,
      servings_per_unit,
      low_stock_threshold,
      status,
    } = req.body;

    // Recalculate total servings
    const total_servings = quantity * servings_per_unit;

    // Update query, but ensure only inventory from this branch can be edited
    const query = `
      UPDATE inventory
      SET item_name = ?, quantity = ?, servings_per_unit = ?, total_servings = ?, low_stock_threshold = ?, status = ?
      WHERE inventory_id = ? AND branch_id = ?
    `;
    // Recompute status so threshold rules are always enforced
    const effectiveStatus = (Number(quantity) === 0)
      ? 'out_of_stock'
      : (Number(quantity) <= Number(low_stock_threshold) ? 'low_stock' : (status || 'available'));

    const values = [
      item_name,
      quantity,
      servings_per_unit,
      total_servings,
      low_stock_threshold,
      effectiveStatus,
      id,
      branch_id,
    ];

    const [result] = await db.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Ingredient not found or no permission" });
    }

    // notify dashboard for branch
    io.to(`branch_${branch_id}`).emit('dashboardUpdate', { branch_id });
    // also send globally
    io.emit('dashboardUpdate', { branch_id });

    res.status(200).json({
      message: "Ingredient updated successfully",
      updatedItem: { id, item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status },
    });
  } catch (error) {
    console.error("DB/CATCH ERROR:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
};
