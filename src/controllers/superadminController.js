import { db } from "../config/db.js"
import bcrypt from "bcrypt";

export const getAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.user_id AS id,
        u.first_name,
        u.last_name,
        b.branch_name AS branch,
        u.username,
        u.contact_number,
        u.status,
        u.created_at,
        created_user.username AS created_by
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      LEFT JOIN users created_user ON u.created_by = created_user.user_id
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
        u.first_name,
        u.last_name,
        b.branch_name AS branch,
        u.username,
        u.contact_number,
        u.status,
        u.created_at,
        created_user.username AS created_by
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      LEFT JOIN users created_user ON u.created_by = created_user.user_id
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
    const { first_name, last_name, username, password, branch_id, contact_number } = req.body; // match frontend
    if (!first_name || !last_name || !username || !password || !branch_id) {
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
      `INSERT INTO users (first_name, last_name, contact_number, username, password, role_id, branch_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, 2, ?, 'Activate', ?)`,
      [first_name, last_name, contact_number, username, hashedPassword, branch_id, superadminId]
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
    const { first_name, last_name, username, password, branch_id, contact_number } = req.body; // match frontend
    if (!first_name || !last_name || !username || !password || !branch_id) {
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
      `INSERT INTO users (first_name, last_name, contact_number, username, password, role_id, branch_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'Activate', ?)`,
      [first_name, last_name, contact_number, username, hashedPassword, branch_id, superadminId]
    );

    // generate 4-digit pin code for the newly created cashier using SQL expression
    const newUserId = result.insertId;
    await db.query(
      `UPDATE users
       SET pin_code = LPAD(FLOOR(RAND() * 10000), 4, '0')
       WHERE user_id = ?`,
      [newUserId]
    );

    res.json({ message: "Cashier created successfully", userId: newUserId });
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
          u.first_name,
          u.last_name,
          u.role_id,
          r.role_name,
          u.contact_number,
          u.status,
          u.created_at,
          created_user.username AS created_by
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN users created_user ON u.created_by = created_user.user_id
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
          u.first_name,
          u.last_name,
          u.role_id,
          r.role_name,
          u.contact_number,
          u.status,
          u.created_at,
          created_user.username AS created_by,
          u.branch_id,
          b.branch_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       LEFT JOIN users created_user ON u.created_by = created_user.user_id
       WHERE u.role_id IN (1,2)`
    );

    res.json({ staff: rows });
  } catch (err) {
    console.error("Error fetching all staff:", err);
    res.status(500).json({ error: "Failed to fetch all staff" });
  }
};

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const superadminId = req.user.user_id;
    const { first_name, last_name, email, username, contact_number } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !username) {
      return res.status(400).json({ error: "First name, last name, and username are required" });
    }

    // Check if username is already taken by another user
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
      [username, superadminId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Build dynamic update query based on available columns
    let updateFields = [];
    let updateValues = [];

    updateFields.push("first_name = ?");
    updateValues.push(first_name);

    updateFields.push("last_name = ?");
    updateValues.push(last_name);

    updateFields.push("username = ?");
    updateValues.push(username);

    updateFields.push("contact_number = ?");
    updateValues.push(contact_number);

    // Check if email column exists
    try {
      const [emailColumn] = await db.query("SHOW COLUMNS FROM users LIKE 'email'");
      if (emailColumn.length > 0) {
        updateFields.push("email = ?");
        updateValues.push(email);
      }
    } catch (err) {
      // Email column doesn't exist, skip it
      console.log("Email column not found, skipping email update");
    }

    updateValues.push(superadminId);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(", ")}
      WHERE user_id = ? AND role_id = 3
    `;

    const [result] = await db.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "SuperAdmin not found or unauthorized" });
    }

    // Return updated user data, including email
    const [updatedUser] = await db.query(
      `SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.contact_number,
        u.role_id,
        r.role_name,
        u.status,
        u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [superadminId]
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedUser[0]
    });

  } catch (err) {
    console.error("UPDATE SUPERADMIN PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};