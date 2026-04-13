import { db } from "../config/db.js";
import bcrypt from "bcrypt";

// Helper function to log admin activities
async function logAdminActivity({ userId, branchId, activityType, description, referenceId }) {
  try {
    console.log(`📝 Attempting to log admin activity: ${activityType}`);
    await db.query(
      `INSERT INTO activity_logs
        (user_id, branch_id, activity_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, branchId, activityType, referenceId, description]
    );
    console.log(`✅ Logged admin activity: ${activityType}`);
  } catch (err) {
    console.error('❌ Failed to log admin activity:', err);
    // Don't throw - just log the error. The main operation should still succeed
  }
}

export const createCashier = async (req, res) => {
  try {
    console.log("🔍 createCashier called");
    console.log("req.user:", req.user);
    
    if (!req.user || !req.user.user_id) {
      console.error("❌ Missing or invalid user authentication");
      return res.status(401).json({ error: "Unauthorized - invalid token" });
    }

    const adminId = req.user.user_id; // from JWT
    const branchId = req.user.branch_id; // from JWT
    const { first_name, last_name, username, password, contact_number } = req.body;

    console.log("📋 Input validation...");
    if (!first_name || !last_name || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    console.log("🔍 Checking if username exists...");
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("💾 Inserting cashier into database...");
    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, username, password, role_id, status, branch_id, contact_number, created_by)
       VALUES (?, ?, ?, ?, 1, 'Activate', ?, ?, ?)`,
      [first_name, last_name, username, hashedPassword, branchId, contact_number || null, adminId]
    );

    console.log("✅ Cashier inserted, ID:", result.insertId);

    // Log the activity
    await logAdminActivity({
      userId: adminId,
      branchId: branchId,
      activityType: 'cashier_created',
      description: `Created new cashier: ${first_name} ${last_name} (${username})`,
      referenceId: result.insertId
    });

    console.log("✅ Cashier created successfully");
    res.json({ message: "Cashier created successfully" });

  } catch (err) {
    console.error("❌ Error in createCashier:", err);
    res.status(500).json({ error: "Error creating cashier", details: err.message });
  }
};


export const getCashiers = async (req, res) => {
  try {
    const branchId = req.user.branch_id;   // from JWT
    const creatorId = req.user.user_id;    // logged-in user

    const [rows] = await db.query(`
      SELECT 
        u.user_id as id,
        u.first_name,
        u.last_name,
        u.username,
        u.role_id,
        r.role_name,
        u.status,
        u.contact_number
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.role_id = 1 
        AND u.branch_id = ?
        AND u.created_by = ?
      ORDER BY u.user_id DESC
    `, [branchId, creatorId]);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ 
      error: "Failed to load cashiers", 
      details: err.message 
    });
  }
};

export const toggleCashierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id; // from JWT

    // Get current status (ensure cashier belongs to this branch)
    const [rows] = await db.query(
      "SELECT status FROM users WHERE user_id = ? AND role_id = 1 AND branch_id = ?",
      [id, branchId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cashier not found or access denied" });
    }

    const currentStatus = rows[0].status;
    const newStatus = currentStatus === "Activate" ? "Deactivate" : "Activate";

    // Update status
    await db.query(
      "UPDATE users SET status = ? WHERE user_id = ? AND branch_id = ?",
      [newStatus, id, branchId]
    );

    // Log the activity
    const actionType = newStatus === 'Activate' ? 'cashier_activated' : 'cashier_deactivated';
    const actionDesc = newStatus === 'Activate' ? 'Activated' : 'Deactivated';
    await logAdminActivity({
      userId: req.user.user_id,
      branchId: branchId,
      activityType: actionType,
      description: `${actionDesc} cashier ID: ${id}`,
      referenceId: id
    });

    res.json({ message: "Status updated successfully", status: newStatus });

  } catch (err) {
    res.status(500).json({ error: "Failed to update status", details: err.message });
  }
};

// Update cashier first_name, last_name, username, and contact_number
export const updateCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id; // from JWT
    const { first_name, last_name, username, contact_number } = req.body;

    if (!first_name || !last_name || !username) {
      return res.status(400).json({ error: "First name, last name, and username are required" });
    }

    // Check if username is already taken by another user
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
      [username, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Combine first_name and last_name into full_name for database compatibility
    const fullName = `${first_name} ${last_name}`.trim();

    // Update user (ensure cashier belongs to this branch)
    const [result] = await db.query(
      "UPDATE users SET full_name = ?, first_name = ?, last_name = ?, username = ?, contact_number = ? WHERE user_id = ? AND role_id = 1 AND branch_id = ?",
      [fullName, first_name, last_name, username, contact_number || null, id, branchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cashier not found or access denied" });
    }

    // Log the activity
    await logAdminActivity({
      userId: req.user.user_id,
      branchId: branchId,
      activityType: 'cashier_updated',
      description: `Updated cashier credentials: ${first_name} ${last_name} (${username})`,
      referenceId: id
    });

    res.json({ message: "Cashier updated successfully", first_name, last_name, username, contact_number, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to update cashier", details: err.message });
  }
};

export const updateCashierPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch_id; // from JWT
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE user_id = ? AND role_id = 1 AND branch_id = ?",
      [hashedPassword, id, branchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cashier not found or access denied" });
    }

    // Log the activity
    await logAdminActivity({
      userId: req.user.user_id,
      branchId: branchId,
      activityType: 'cashier_password_reset',
      description: `Reset password for cashier ID: ${id}`,
      referenceId: id
    });

    res.json({ message: "Password updated successfully", id });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password", details: err.message });
  }
};

