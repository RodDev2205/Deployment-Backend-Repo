import { db } from "../config/db.js";

export const getAllVoidReasons = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT void_reason_id, reason_name, created_at, updated_at FROM void_reason ORDER BY reason_name ASC"
    );
    res.json(rows || []);
  } catch (err) {
    console.error("Error fetching void reasons:", err);
    res.status(500).json({ error: "Failed to fetch void reasons", details: err.message });
  }
};

export const createVoidReason = async (req, res) => {
  try {
    const { reason_name } = req.body;

    if (!reason_name || !reason_name.trim()) {
      return res.status(400).json({ error: "Reason name is required" });
    }

    const [result] = await db.query(
      "INSERT INTO void_reason (reason_name) VALUES (?)",
      [reason_name.trim()]
    );

    const [newReason] = await db.query(
      "SELECT void_reason_id, reason_name FROM void_reason WHERE void_reason_id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Void reason created successfully",
      data: newReason[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Reason name already exists" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const updateVoidReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason_name } = req.body;

    if (!reason_name || !reason_name.trim()) {
      return res.status(400).json({ error: "Reason name is required" });
    }

    const [result] = await db.query(
      "UPDATE void_reason SET reason_name = ?, updated_at = NOW() WHERE void_reason_id = ?",
      [reason_name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Void reason not found" });
    }

    const [updatedReason] = await db.query(
      "SELECT void_reason_id, reason_name FROM void_reason WHERE void_reason_id = ?",
      [id]
    );

    res.json({
      message: "Void reason updated successfully",
      data: updatedReason[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Reason name already exists" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteVoidReason = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if void reason is in use
    const [usage] = await db.query(
      "SELECT COUNT(*) as count FROM voids WHERE void_reason_id = ?",
      [id]
    );

    if (usage[0].count > 0) {
      return res.status(400).json({ 
        error: "Cannot delete void reason that is in use. It has been referenced in void transactions." 
      });
    }

    const [result] = await db.query(
      "DELETE FROM void_reason WHERE void_reason_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Void reason not found" });
    }

    res.json({ message: "Void reason deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
