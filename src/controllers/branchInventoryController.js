import { db } from "../config/db.js";

// Helper function to log branch inventory activities
async function logBranchInventoryActivity({ userId, branchId, activityType, description, referenceId }) {
  try {
    await db.query(
      `INSERT INTO activity_logs
        (user_id, branch_id, activity_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?)` ,
      [userId, branchId, activityType, referenceId, description]
    );
  } catch (err) {
    console.error('Failed to log branch inventory activity:', err);
  }
}

// -------------------
// ADD ingredient to branch inventory
// -------------------
export const addIngredientToBranch = async (req, res) => {
  try {
    const { ingredient_id, stock_units } = req.body;
    const branch_id = req.user.branch_id;
    const added_by = req.user.user_id;

    // Check if already exists
    const [existing] = await db.query(
      `SELECT inventory_id FROM branch_inventory WHERE branch_id = ? AND ingredient_id = ?`,
      [branch_id, ingredient_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Ingredient already added to this branch" });
    }

    const [result] = await db.query(
      `INSERT INTO branch_inventory (branch_id, ingredient_id, stock_units) VALUES (?, ?, ?)`,
      [branch_id, ingredient_id, stock_units || 0.00]
    );

    const inventoryId = result.insertId;

    // Log activity
    await logBranchInventoryActivity({
      userId: added_by,
      branchId: branch_id,
      activityType: 'branch_ingredient_added',
      description: `Added ingredient ${ingredient_id} to branch inventory`,
      referenceId: inventoryId
    });

    res.status(201).json({ message: "Ingredient added to branch inventory", inventory_id: inventoryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// GET branch inventory with ingredient details
// -------------------
export const getBranchInventory = async (req, res) => {
  try {
    const branch_id = req.user.branch_id;

    const [rows] = await db.query(`
      SELECT bi.inventory_id, bi.stock_units, bi.created_at,
             i.ingredient_id, i.item_name, i.quantity_per_unit, i.servings_per_unit, i.low_stock_threshold,
             (bi.stock_units * i.servings_per_unit) AS total_servings,
             CASE
               WHEN (bi.stock_units * i.servings_per_unit) = 0 THEN 'out_of_stock'
               WHEN (bi.stock_units * i.servings_per_unit) <= i.low_stock_threshold THEN 'low_stock'
               ELSE 'available'
             END AS status,
             b.branch_name
      FROM branch_inventory bi
      JOIN ingredients i ON bi.ingredient_id = i.ingredient_id
      JOIN branches b ON bi.branch_id = b.branch_id
      WHERE bi.branch_id = ?
      ORDER BY i.item_name
    `, [branch_id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// UPDATE stock for branch ingredient
// -------------------
export const updateBranchStock = async (req, res) => {
  try {
    const { id } = req.params; // inventory_id
    const { stock_units } = req.body;
    const branch_id = req.user.branch_id;
    const updated_by = req.user.user_id;

    const [result] = await db.query(
      `UPDATE branch_inventory SET stock_units = ? WHERE inventory_id = ? AND branch_id = ?`,
      [stock_units, id, branch_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Branch inventory item not found" });
    }

    // Log activity
    await logBranchInventoryActivity({
      userId: updated_by,
      branchId: branch_id,
      activityType: 'branch_stock_updated',
      description: `Updated stock for inventory ID ${id} to ${stock_units} units`,
      referenceId: id
    });

    res.json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// REMOVE ingredient from branch inventory
// -------------------
export const removeIngredientFromBranch = async (req, res) => {
  try {
    const { id } = req.params; // inventory_id
    const branch_id = req.user.branch_id;
    const removed_by = req.user.user_id;

    const [result] = await db.query(
      `DELETE FROM branch_inventory WHERE inventory_id = ? AND branch_id = ?`,
      [id, branch_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Branch inventory item not found" });
    }

    // Log activity
    await logBranchInventoryActivity({
      userId: removed_by,
      branchId: branch_id,
      activityType: 'branch_ingredient_removed',
      description: `Removed ingredient from branch inventory ID ${id}`,
      referenceId: id
    });

    res.json({ message: "Ingredient removed from branch inventory" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// GET all branch inventories (Superadmin only)
// -------------------
export const getAllBranchInventories = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT bi.inventory_id, bi.stock_units, bi.created_at,
             i.ingredient_id, i.item_name, i.quantity_per_unit, i.servings_per_unit, i.low_stock_threshold,
             (bi.stock_units * i.servings_per_unit) AS total_servings,
             CASE
               WHEN (bi.stock_units * i.servings_per_unit) = 0 THEN 'out_of_stock'
               WHEN (bi.stock_units * i.servings_per_unit) <= i.low_stock_threshold THEN 'low_stock'
               ELSE 'available'
             END AS status,
             b.branch_name
      FROM branch_inventory bi
      JOIN ingredients i ON bi.ingredient_id = i.ingredient_id
      JOIN branches b ON bi.branch_id = b.branch_id
      ORDER BY b.branch_name, i.item_name
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};