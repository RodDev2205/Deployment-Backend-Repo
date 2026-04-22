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

export const createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const [result] = await db.query(
      "INSERT INTO categories (category_name) VALUES (?)",
      [category_name.trim()]
    );

    const [newCategory] = await db.query(
      "SELECT category_id, category_name FROM categories WHERE category_id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Category name already exists" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const [result] = await db.query(
      "UPDATE categories SET category_name = ?, updated_at = NOW() WHERE category_id = ?",
      [category_name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const [updatedCategory] = await db.query(
      "SELECT category_id, category_name FROM categories WHERE category_id = ?",
      [id]
    );

    res.json({
      message: "Category updated successfully",
      data: updatedCategory[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Category name already exists" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM categories WHERE category_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
