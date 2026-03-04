import { db } from "../config/db.js";
import bcrypt from "bcrypt";
import { io } from "../../server.js"; // realtime notification

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, username, password, branch_id, contact_number } = req.body;

    if (!first_name || !last_name || !username || !branch_id) {
      return res.status(400).json({
        error: "First name, last name, username, and branch are required",
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

    // always update first_name, last_name, username, branch_id
    if (hashedPassword) {
      sql = `
        UPDATE users 
        SET first_name = ?, last_name = ?, username = ?, password = ?, branch_id = ?, contact_number = ?
        WHERE user_id = ?
      `;
      params = [first_name, last_name, username, hashedPassword, branch_id, contact_number || null, userId];
    } else {
      sql = `
        UPDATE users 
        SET first_name = ?, last_name = ?, username = ?, branch_id = ?, contact_number = ?
        WHERE user_id = ?
      `;
      params = [first_name, last_name, username, branch_id, contact_number || null, userId];
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updatedUserRows] = await db.query(
      "SELECT user_id, first_name, last_name, username, branch_id, contact_number FROM users WHERE user_id = ?",
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
      `
      SELECT u.user_id, u.first_name, u.last_name, u.username, u.contact_number, u.role_id, r.role_name,
             u.branch_id, u.status, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
      `,
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

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      `
      SELECT u.user_id, u.first_name, u.last_name, u.username, u.contact_number, u.role_id, r.role_name,
             u.branch_id, u.status, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
      `,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('getCurrentUser error', err);
    res.status(500).json({ error: 'Failed to fetch current user', details: err.message });
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
