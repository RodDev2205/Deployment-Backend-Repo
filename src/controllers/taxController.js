import { db } from "../config/db.js";

// Get current tax rate
export const getTaxRate = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT tax_id, tax_rate, created_at, updated_at FROM tax_settings ORDER BY tax_id DESC LIMIT 1"
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tax rate not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching tax rate:", err);
    res.status(500).json({ error: "Failed to fetch tax rate", details: err.message });
  }
};

// Update tax rate
export const updateTaxRate = async (req, res) => {
  try {
    const { tax_rate } = req.body;

    if (tax_rate === undefined || tax_rate === null) {
      return res.status(400).json({ error: "Tax rate is required" });
    }

    const parsedRate = parseFloat(tax_rate);

    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      return res.status(400).json({ error: "Tax rate must be a number between 0 and 100" });
    }

    // Get the latest tax record
    const [existingTax] = await db.query(
      "SELECT tax_id FROM tax_settings ORDER BY tax_id DESC LIMIT 1"
    );

    if (existingTax.length === 0) {
      // Create new tax record if none exists
      const [result] = await db.query(
        "INSERT INTO tax_settings (tax_rate) VALUES (?)",
        [parsedRate]
      );

      const [newTax] = await db.query(
        "SELECT tax_id, tax_rate, created_at, updated_at FROM tax_settings WHERE tax_id = ?",
        [result.insertId]
      );

      return res.status(201).json({
        message: "Tax rate created successfully",
        data: newTax[0]
      });
    }

    // Update existing tax record
    const [result] = await db.query(
      "UPDATE tax_settings SET tax_rate = ?, updated_at = NOW() WHERE tax_id = ?",
      [parsedRate, existingTax[0].tax_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tax record not found" });
    }

    const [updatedTax] = await db.query(
      "SELECT tax_id, tax_rate, created_at, updated_at FROM tax_settings WHERE tax_id = ?",
      [existingTax[0].tax_id]
    );

    res.json({
      message: "Tax rate updated successfully",
      data: updatedTax[0]
    });
  } catch (err) {
    console.error("Error updating tax rate:", err);
    res.status(500).json({ error: "Failed to update tax rate", details: err.message });
  }
};
