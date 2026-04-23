import { db } from "../config/db.js";

// Get all discounts
export const getDiscounts = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT discount_id, discount_name, discount_type, discount_value, is_vatable, is_stackable, status, created_at, updated_at FROM discount_types ORDER BY discount_name ASC"
    );
    res.json({ discounts: rows || [] });
  } catch (err) {
    console.error("Error fetching discounts:", err);
    res.status(500).json({ error: "Failed to fetch discounts", details: err.message });
  }
};

// Create new discount
export const createDiscount = async (req, res) => {
  try {
    const { name, rate, description, discount_type, is_vatable, is_stackable } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Discount name is required" });
    }

    if (rate === undefined || rate === null) {
      return res.status(400).json({ error: "Discount rate is required" });
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({ error: "Discount rate must be a positive number" });
    }

    // Use provided discount_type or default to 'percentage'
    const type = discount_type || 'percentage';
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: "Discount type must be 'percentage' or 'fixed'" });
    }

    const [result] = await db.query(
      "INSERT INTO discount_types (discount_name, discount_type, discount_value, is_vatable, is_stackable, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [
        name.trim(),
        type,
        parsedRate,
        is_vatable ? 1 : 0,
        is_stackable ? 1 : 0
      ]
    );

    const [newDiscount] = await db.query(
      "SELECT discount_id, discount_name, discount_type, discount_value, is_vatable, is_stackable, status, created_at, updated_at FROM discount_types WHERE discount_id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Discount created successfully",
      data: newDiscount[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Discount name already exists" });
    }
    console.error("Error creating discount:", err);
    res.status(500).json({ error: "Failed to create discount", details: err.message });
  }
};

// Update discount
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate, description, discount_type, is_vatable, is_stackable } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Discount name is required" });
    }

    if (rate === undefined || rate === null) {
      return res.status(400).json({ error: "Discount rate is required" });
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({ error: "Discount rate must be a positive number" });
    }

    // Get current discount to preserve discount_type if not provided
    const [currentDiscount] = await db.query(
      "SELECT discount_type FROM discount_types WHERE discount_id = ?",
      [id]
    );

    if (currentDiscount.length === 0) {
      return res.status(404).json({ error: "Discount not found" });
    }

    const type = discount_type || currentDiscount[0].discount_type;
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: "Discount type must be 'percentage' or 'fixed'" });
    }

    const [result] = await db.query(
      "UPDATE discount_types SET discount_name = ?, discount_type = ?, discount_value = ?, is_vatable = ?, is_stackable = ?, updated_at = NOW() WHERE discount_id = ?",
      [
        name.trim(),
        type,
        parsedRate,
        is_vatable ? 1 : 0,
        is_stackable ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Discount not found" });
    }

    const [updatedDiscount] = await db.query(
      "SELECT discount_id, discount_name, discount_type, discount_value, is_vatable, is_stackable, status, created_at, updated_at FROM discount_types WHERE discount_id = ?",
      [id]
    );

    res.json({
      message: "Discount updated successfully",
      data: updatedDiscount[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Discount name already exists" });
    }
    console.error("Error updating discount:", err);
    res.status(500).json({ error: "Failed to update discount", details: err.message });
  }
};

// Toggle discount status (active/inactive)
export const toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
    }

    const [result] = await db.query(
      "UPDATE discount_types SET status = ?, updated_at = NOW() WHERE discount_id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Discount not found" });
    }

    const [updatedDiscount] = await db.query(
      "SELECT discount_id, discount_name, discount_type, discount_value, is_vatable, is_stackable, status, created_at, updated_at FROM discount_types WHERE discount_id = ?",
      [id]
    );

    res.json({
      message: "Discount status updated successfully",
      data: updatedDiscount[0]
    });
  } catch (err) {
    console.error("Error toggling discount status:", err);
    res.status(500).json({ error: "Failed to update discount status", details: err.message });
  }
};

// Delete discount
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM discount_types WHERE discount_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Discount not found" });
    }

    res.json({ message: "Discount deleted successfully" });
  } catch (err) {
    console.error("Error deleting discount:", err);
    res.status(500).json({ error: "Failed to delete discount", details: err.message });
  }
};
