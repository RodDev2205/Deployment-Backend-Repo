import { db } from "../config/db.js";

// Get all portions
export const getAllPortions = async (req, res) => {
    const [rows] = await db.query("SELECT * FROM portions");
    res.json(rows);
};

// Add a portion
export const addPortion = async (req, res) => {
    const { portion_name, formula } = req.body; // formula = { raw_item_id: qty }
    await db.query("INSERT INTO portions (portion_name, formula_json) VALUES (?, ?)", [portion_name, JSON.stringify(formula)]);
    res.json({ message: "Portion added" });
};

export const updatePortion = async (req, res) => {
  try {
    const { portion_id } = req.params;
    const { portion_name, formula } = req.body; // formula = [{ raw_item_id, qty }]
    
    await db.query(
      "UPDATE portions SET portion_name = ?, formula_json = ? WHERE portion_id = ?",
      [portion_name, JSON.stringify(formula), portion_id]
    );

    // Return updated portion
    const [updated] = await db.query("SELECT * FROM portions WHERE portion_id = ?", [portion_id]);
    res.json({
      ...updated[0],
      formula: JSON.parse(updated[0].formula_json || "[]")
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update portion" });
  }
};
