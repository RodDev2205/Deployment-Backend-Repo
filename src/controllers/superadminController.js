import { db } from "../config/db.js"
import bcrypt from "bcrypt";

export const getAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.user_id AS id,
        u.full_name AS name,
        b.branch_name AS branch,
        u.username,
        u.status
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      WHERE u.role_id = 2
      ORDER BY u.user_id DESC
    `);

    res.json(rows);
  } catch (err) {
     console.error("GET ADMIN ERROR ❌:", err);
    res.status(500).json({ error: "Failed to load admins" });
  }
};

export const getCashiers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.user_id AS id,
        u.full_name AS name,
        b.branch_name AS branch,
        u.username,
        u.status
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      WHERE u.role_id = 1
      ORDER BY u.user_id DESC
    `);

    res.json(rows);
  } catch (err) {
     console.error("GET ADMIN ERROR ❌:", err);
    res.status(500).json({ error: "Failed to load admins" });
  }
};

export const createAdmin = async (req, res) => {
  try {
    // token payload uses user_id field, not id
    const superadminId = req.user.user_id;
    const { full_name, username, password, branch_id } = req.body; // match frontend
    if (!full_name || !username || !password || !branch_id) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [existing] = await db.query(
        "SELECT user_id FROM users WHERE username = ?",
        [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (full_name, username, password, role_id, branch_id, status, created_by)
       VALUES (?, ?, ?, 2, ?, 'Activate', ?)`,
      [full_name, username, hashedPassword, branch_id, superadminId]
    );

    // generate 4-digit pin code for the newly created admin using SQL expression
    const newUserId = result.insertId;
    await db.query(
      `UPDATE users
       SET pin_code = LPAD(FLOOR(RAND() * 10000), 4, '0')
       WHERE user_id = ?`,
      [newUserId]
    );

    res.json({ message: "Admin created successfully", userId: newUserId });
    } catch (err) {
    res.status(500).json({ error: "Error creating admin", details: err.message });
  }
};

export const createCashier = async (req, res) => {
  try {
    const superadminId = req.user.user_id; 
    const { full_name, username, password, branch_id } = req.body; // match frontend
    if (!full_name || !username || !password || !branch_id) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [existing] = await db.query(
        "SELECT user_id FROM users WHERE username = ?",
        [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (full_name, username, password, role_id, branch_id, status, created_by)
       VALUES (?, ?, ?, 1, ?, 'Activate', ?)`,
      [full_name, username, hashedPassword, branch_id, superadminId]
    );
    res.json({ message: "Cashier created successfully" });
    } catch (err) {
    res.status(500).json({ error: "Error creating cashier", details: err.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log("Updating User ID:", id, "to Status:", status);

  if (!["Activate", "Deactivate"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optional: return updated user
    const [rows] = await db.query(
      "SELECT user_id, full_name, username, status FROM users WHERE user_id = ?",
      [id]
    );

    res.json({
      message: "Status updated successfully",
      user: rows[0],
    });
  } catch (error) {
    console.error("Database Error Detail:", error); 
    res.status(500).json({ message: "Internal Server Error", detail: error.message });
  }
};

export const getStaffByBranch = async (req, res) => {
  const { branch_id } = req.params;

  console.log("Branch ID received:", branch_id);

  if (!branch_id) {
    return res.status(400).json({ error: "branch_id is required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT 
          u.user_id, 
          u.full_name AS name, 
          u.role_id,
          r.role_name,
          u.status
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.branch_id = ?`,
      [branch_id]
    );

    res.json({ staff: rows });

  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    // return every admin/cashier regardless of branch
    const [rows] = await db.execute(
      `SELECT 
          u.user_id, 
          u.full_name AS name,
          u.role_id,
          r.role_name,
          u.status,
          u.branch_id,
          b.branch_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE u.role_id IN (1,2)`
    );

    res.json({ staff: rows });
  } catch (err) {
    console.error("Error fetching all staff:", err);
    res.status(500).json({ error: "Failed to fetch all staff" });
  }
};