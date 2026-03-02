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
