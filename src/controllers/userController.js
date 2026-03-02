import { db } from "../config/db.js";
import bcrypt from "bcrypt";
import { io } from "../../server.js"; // realtime notification

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, username, password, branch_id } = req.body;

    if (!full_name || !username || !branch_id) {
      return res.status(400).json({
        error: "Full name, username, and branch are required",
      });
    }

    // ✅ Check if username already taken by another user
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
      [username, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let sql;
    let params;

    if (hashedPassword) {
      sql = `
        UPDATE users 
        SET full_name = ?, username = ?, password = ?, branch_id = ?
        WHERE user_id = ?
      `;
      params = [full_name, username, hashedPassword, branch_id, userId];
    } else {
      sql = `
        UPDATE users 
        SET full_name = ?, username = ?, branch_id = ?
        WHERE user_id = ?
      `;
      params = [full_name, username, branch_id, userId];
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updatedUserRows] = await db.query(
      "SELECT user_id, full_name, username, branch_id FROM users WHERE user_id = ?",
      [userId]
    );

    // notify dashboards for affected branch(s)
    const updated = updatedUserRows[0];
    io.to(`branch_${updated.branch_id}`).emit('dashboardUpdate', { branch_id: updated.branch_id });
    io.emit('dashboardUpdate', { branch_id: updated.branch_id });
    res.json({
      message: "User updated successfully",
      user: updated,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to update user",
      details: err.message,
    });
  }
};

// GET count of active employees (status = 'Activate')
export const getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await db.query(
      `SELECT user_id, full_name, username, role_id, branch_id, status, created_at FROM users WHERE user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('getUser error', err);
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
};

export const getActiveEmployeeCount = async (req, res) => {
  try {
    let query;
    let params = [];
    if (req.user && req.user.role_id === 3) {
      query = `SELECT COUNT(*) as count FROM users WHERE status = 'Activate'`;
    } else {
      const branch_id = req.user.branch_id;
      query = `SELECT COUNT(*) as count FROM users WHERE status = 'Activate' AND branch_id = ?`;
      params = [branch_id];
    }
    const [[{ count }]] = await db.execute(query, params);
    res.json({ count });
  } catch (err) {
    console.error('getActiveEmployeeCount error', err);
    res.status(500).json({ message: 'Failed to fetch active employees', error: err.message });
  }
};
