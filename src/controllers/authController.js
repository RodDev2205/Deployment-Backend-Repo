// controllers/authController.js
import { db } from "../config/db.js";
import { generateOTP } from "../utils/generateOTP.js";
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
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name || null,
      branch_id: user.branch_id,
      status: user.status,
      created_at: user.created_at
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}; 

export const signup = async (req, res) => {
  try {
    const { first_name, last_name, username, email, password, role_id } = req.body;
    
    console.log('Signup request body:', req.body);
    console.log('Destructured values:', { first_name, last_name, username, email, password, role_id });
    
    if (!first_name || !last_name || !username || !email || !password || !role_id) {
      console.log('Validation failed - missing fields');
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

    // Check if email already exists
    const [existingEmail] = await db.query(
      "SELECT * FROM users WHERE email = ?", 
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, username, email, password, role_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, username, email, hashedPassword, 3, "Activate"]
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

async function sendOTPViaSendGrid(email, code) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('Missing SENDGRID_API_KEY in environment');
    throw new Error('Email service not configured - missing SENDGRID_API_KEY');
  }

  console.log('Sending OTP email to:', email, 'with code length:', code.length);
  const startTime = Date.now();

  const requestBody = {
    personalizations: [{
      to: [{ email: email }]
    }],
    from: {
      email: 'coderabonline@gmail.com', // Replace with your verified sender email
      name: 'POS System'
    },
    subject: 'Your OTP Code',
    content: [{
      type: 'text/html',
      value: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset OTP</h2>
          <p style="font-size: 16px; line-height: 1.5;">Your OTP code is:</p>
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #007bff;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">This is an automated message from POS System.</p>
        </div>
      `
    }]
  };

  console.log('SendGrid request body prepared, sending...');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const endTime = Date.now();
  console.log('SendGrid response status:', response.status, 'Time taken:', endTime - startTime, 'ms');

  if (!response.ok) {
    let errorMessage = 'Failed to send OTP email';
    try {
      const errorData = await response.json();
      console.error('SendGrid API error response:', errorData);
      if (errorData.errors && errorData.errors.length > 0) {
        errorMessage = errorData.errors[0].message || errorMessage;
      }
    } catch (parseError) {
      // If response is not JSON, get text instead
      const errorText = await response.text();
      console.error('SendGrid API error (non-JSON):', errorText);
      errorMessage = `SendGrid API error (${response.status}): ${errorText || 'Unknown error'}`;
    }
    throw new Error(errorMessage);
  }

  // SendGrid returns empty body on success, so handle gracefully
  let data = null;
  try {
    const responseText = await response.text();
    if (responseText) {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    // Empty response is normal for SendGrid success
    console.log('SendGrid returned empty response (normal for success)');
  }

  return data;
}

async function createOTPandStore(username, email) {
  const [users] = await db.query(
    "SELECT user_id FROM users WHERE username = ? AND email = ?",
    [username, email]
  );

  if (users.length === 0) {
    const err = new Error("User not found with provided username and email");
    err.status = 404;
    throw err;
  }

  const code = generateOTP();

  await db.query(
    `INSERT INTO password_otps (email, code, expires_at, created_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW())`,
    [email, code]
  );

  // Send OTP via SendGrid API
  await sendOTPViaSendGrid(email, code);

  return code;
}

export const sendOTP = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    await createOTPandStore(username, email);
    return res.json({ message: "OTP sent to email successfully" });
  } catch (err) {
    console.error(err);
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.message === 'Email service not configured') return res.status(500).json({ error: err.message });
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    await createOTPandStore(username, email);
    return res.json({ message: "OTP resent to email successfully" });
  } catch (err) {
    console.error(err);
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.message === 'Email service not configured') return res.status(500).json({ error: err.message });
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { username, email, code } = req.body;
    if (!username || !email || !code) {
      return res.status(400).json({ error: "Username, email, and OTP code are required" });
    }

    const [users] = await db.query(
      "SELECT user_id FROM users WHERE username = ? AND email = ?",
      [username, email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found with provided username and email" });
    }

    const [otps] = await db.query(
      `SELECT * FROM password_otps WHERE email = ? AND code = ? AND expires_at >= NOW() ORDER BY id DESC LIMIT 1`,
      [email, code]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    return res.json({ message: "OTP verified", verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export const resetPasswordWithOTP = async (req, res) => {
  try {
    const { username, email, code, newPassword } = req.body;
    if (!username || !email || !code || !newPassword) {
      return res.status(400).json({ error: "Username, email, OTP code and new password are required" });
    }

    const [users] = await db.query(
      "SELECT user_id FROM users WHERE username = ? AND email = ?",
      [username, email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found with provided username and email" });
    }

    const user = users[0];

    const [otps] = await db.query(
      `SELECT * FROM password_otps WHERE email = ? AND code = ? AND expires_at >= NOW() ORDER BY id DESC LIMIT 1`,
      [email, code]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE user_id = ?", [hashedPassword, user.user_id]);

    await db.query("DELETE FROM password_otps WHERE email = ?", [email]);

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};