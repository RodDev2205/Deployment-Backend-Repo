// controllers/authController.js
import { db } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Helper function to log both login_logs and activity_logs
async function logLoginActivity({ userId, branchId, username, status, reason, ipAddress }) {
  // Insert into login_logs
  const [loginResult] = await db.query(
    `INSERT INTO login_logs 
      (user_id, branch_id, username_attempted, status, reason, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, branchId, username, status, reason, ipAddress]
  );

  // Insert into activity_logs
  await db.query(
    `INSERT INTO activity_logs 
      (user_id, branch_id, activity_type, reference_id, description)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      branchId,
      status === "SUCCESS" ? "login" : "login_failed",
      loginResult.insertId,
      status === "SUCCESS"
        ? `${username} logged in successfully`
        : `Failed login attempt: ${reason}`
    ]
  );

  return loginResult.insertId;
}

export const login = async (req, res) => {
  try {
    const { username, password, platform } = req.body;

    // Get client IP
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)
      .split(',')[0]
      .trim();

    // STEP 1: Check if user exists
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ?", 
      [username]
    );

    if (rows.length === 0) {
      await logLoginActivity({
        userId: null,
        branchId: null,
        username,
        status: "FAILED",
        reason: "User not found",
        ipAddress
      });
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const user = rows[0];

    // STEP 2: Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logLoginActivity({
        userId: user.user_id,
        branchId: user.branch_id,
        username,
        status: "FAILED",
        reason: "Wrong password",
        ipAddress
      });
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // STEP 3: Check if account is deactivated
    if (user.status !== 'Activate') {
      await logLoginActivity({
        userId: user.user_id,
        branchId: user.branch_id,
        username,
        status: "FAILED",
        reason: "Account deactivated",
        ipAddress
      });
      return res.status(403).json({ 
        error: "Deactivated",
        message: "Your account is deactivated.\nPlease contact the Branch Admin or Super Admin."
      });
    }

    // STEP 4: Platform restriction
    if (platform === "mobile" && user.role_id !== 3) {
      await logLoginActivity({
        userId: user.user_id,
        branchId: user.branch_id,
        username,
        status: "FAILED",
        reason: "Platform restriction",
        ipAddress
      });
      return res.status(403).json({
        error: "Access denied. Only Superadmin can login via mobile."
      });
    }

    // STEP 5: Successful login → log
    await logLoginActivity({
      userId: user.user_id,
      branchId: user.branch_id,
      username,
      status: "SUCCESS",
      reason: "Login successful",
      ipAddress
    });

    // STEP 6: Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // STEP 7: Return user info along with token
    // include values the frontend relies on so auth.user is properly populated
    return res.json({
      message: "Login successful",
      token,
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role_id: user.role_id,
      role_name: user.role_name || null,
      branch_id: user.branch_id,
      status: user.status
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}; 

export const signup = async (req, res) => {
  try {
    const { full_name, username, password, role_id } = req.body;
    if (!full_name || !username || !password || !role_id) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    // Check if username already exists
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE username = ?", 
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (full_name, username, password, role_id, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, username, hashedPassword, 3, "Activate"]
    );

    return res.json({
      message: "User created successfully",
      user_id: result.insertId
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};