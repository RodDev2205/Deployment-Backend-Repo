import { db } from "../config/db.js";

export const getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT category_id, category_name FROM categories");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
