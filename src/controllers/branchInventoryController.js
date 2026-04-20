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
    const { item_name, quantity, servings_per_unit, low_stock_threshold } = req.body;
    const branch_id = req.user.branch_id;
    const added_by = req.user.user_id;

    const total_servings = quantity * servings_per_unit;
    const status = total_servings === 0 ? 'out_of_stock' : total_servings <= low_stock_threshold ? 'low_stock' : 'available';

    const [result] = await db.query(
      `INSERT INTO inventory (item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status, branch_id]
    );

    const inventoryId = result.insertId;

    // Log activity
    await logBranchInventoryActivity({
      userId: added_by,
      branchId: branch_id,
      activityType: 'inventory_item_added',
      description: `Added inventory item ${item_name} to branch`,
      referenceId: inventoryId
    });

    res.status(201).json({ message: "Inventory item added to branch", inventory_id: inventoryId });
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
      SELECT inventory_id, item_name, quantity as stock_units, servings_per_unit, total_servings, low_stock_threshold, status
      FROM inventory
      WHERE branch_id = ?
      ORDER BY item_name
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

    // Get current servings_per_unit and low_stock_threshold
    const [current] = await db.query(
      `SELECT servings_per_unit, low_stock_threshold FROM inventory WHERE inventory_id = ? AND branch_id = ?`,
      [id, branch_id]
    );

    if (current.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const { servings_per_unit, low_stock_threshold } = current[0];
    const total_servings = stock_units * servings_per_unit;
    const status = total_servings === 0 ? 'out_of_stock' : total_servings <= low_stock_threshold ? 'low_stock' : 'available';

    const [result] = await db.query(
      `UPDATE inventory SET quantity = ?, total_servings = ?, status = ? WHERE inventory_id = ? AND branch_id = ?`,
      [stock_units, total_servings, status, id, branch_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Log activity
    await logBranchInventoryActivity({
      userId: updated_by,
      branchId: branch_id,
      activityType: 'inventory_stock_updated',
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
      `DELETE FROM inventory WHERE inventory_id = ? AND branch_id = ?`,
      [id, branch_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Log activity
    await logBranchInventoryActivity({
      userId: removed_by,
      branchId: branch_id,
      activityType: 'inventory_item_removed',
      description: `Removed inventory item from branch ID ${id}`,
      referenceId: id
    });

    res.json({ message: "Inventory item removed from branch" });
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
      SELECT i.inventory_id, i.item_name, i.quantity as stock_units, i.servings_per_unit, i.total_servings, i.low_stock_threshold, i.status, i.created_at,
             b.branch_name
      FROM inventory i
      JOIN branches b ON i.branch_id = b.branch_id
      ORDER BY b.branch_name, i.item_name
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};