// controllers/activityController.js
import { db } from "../config/db.js";

// GET /api/activity-logs
export const getActivityLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.log_id, u.username AS user, al.activity_type, al.description AS action,
              al.reference_id, al.created_at AS timestamp, b.branch_name AS branch
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       LEFT JOIN branches b ON al.branch_id = b.branch_id
       ORDER BY al.created_at DESC
       LIMIT 500` // optional limit
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

// GET /api/activity/login-logs
export const getLoginLogs = async (req, res) => {
  try {
    const { branch_id, role_id } = req.user;
    let query = `
      SELECT ll.login_log_id AS log_id, ll.username_attempted AS user, 'Security' AS type, 
             CASE WHEN ll.status = 'SUCCESS' THEN 'Login Success' ELSE 'Login Failed' END AS action,
             ll.reason AS details, ll.ip_address, ll.created_at AS timestamp,
             CASE WHEN ll.status = 'SUCCESS' THEN 'Info' ELSE 'Warning' END AS severity
      FROM login_logs ll
    `;
    const params = [];

    if (role_id === 2) {
      query += ` WHERE ll.branch_id = ?`;
      params.push(branch_id);
    }

    query += ` ORDER BY timestamp DESC LIMIT 500`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch login logs" });
  }
};
