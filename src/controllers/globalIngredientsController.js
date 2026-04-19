import { db } from "../config/db.js";

// Helper function to log ingredient activities
async function logIngredientActivity({ userId, branchId, activityType, description, referenceId }) {
  try {
    await db.query(
      `INSERT INTO activity_logs
        (user_id, branch_id, activity_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?)` ,
      [userId, branchId, activityType, referenceId, description]
    );
  } catch (err) {
    console.error('Failed to log ingredient activity:', err);
  }
}

// -------------------
// CREATE global ingredient (Superadmin only)
// -------------------
export const createGlobalIngredient = async (req, res) => {
  try {
    const { item_name, quantity_per_unit, servings_per_unit, low_stock_threshold } = req.body;
    const created_by = req.user.user_id;

    const [result] = await db.query(
      `INSERT INTO ingredients
      (item_name, quantity_per_unit, servings_per_unit, low_stock_threshold)
      VALUES (?, ?, ?, ?)`,
      [item_name, quantity_per_unit || 1.00, servings_per_unit || 1, low_stock_threshold || 10]
    );

    const ingredientId = result.insertId;

    // Log activity
    await logIngredientActivity({
      userId: created_by,
      branchId: null, // global
      activityType: 'global_ingredient_created',
      description: `Created global ingredient: ${item_name}`,
      referenceId: ingredientId
    });

    res.status(201).json({ message: "Global ingredient created successfully", ingredient_id: ingredientId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// GET all global ingredients
// -------------------
export const getAllGlobalIngredients = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM ingredients ORDER BY item_name`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// UPDATE global ingredient
// -------------------
export const updateGlobalIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, quantity_per_unit, servings_per_unit, low_stock_threshold } = req.body;
    const updated_by = req.user.user_id;

    const [result] = await db.query(
      `UPDATE ingredients SET
        item_name = ?, quantity_per_unit = ?, servings_per_unit = ?, low_stock_threshold = ?
       WHERE ingredient_id = ?`,
      [item_name, quantity_per_unit, servings_per_unit, low_stock_threshold, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    // Log activity
    await logIngredientActivity({
      userId: updated_by,
      branchId: null,
      activityType: 'global_ingredient_updated',
      description: `Updated global ingredient: ${item_name}`,
      referenceId: id
    });

    res.json({ message: "Global ingredient updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------
// DELETE global ingredient
// -------------------
export const deleteGlobalIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted_by = req.user.user_id;

    const [result] = await db.query(`DELETE FROM ingredients WHERE ingredient_id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    // Log activity
    await logIngredientActivity({
      userId: deleted_by,
      branchId: null,
      activityType: 'global_ingredient_deleted',
      description: `Deleted global ingredient ID: ${id}`,
      referenceId: id
    });

    res.json({ message: "Global ingredient deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};