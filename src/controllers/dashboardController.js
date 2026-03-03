import { db } from "../config/db.js";

// return dashboard summary stats used by owner/superadmin home page
export async function getDashboardStats(req, res) {
  try {
    const role_id = req.user.role_id;
    const branchId = req.user.branch_id;

    // use Manila timezone for "today" via MySQL CONVERT_TZ
    // this avoids any server-local timezone mismatches
    let salesQuery = `SELECT IFNULL(SUM(total_amount),0) AS total_sales
      FROM transactions
      WHERE status = 'Completed'
        AND DATE(CONVERT_TZ(created_at,'SYSTEM','Asia/Manila')) =
            DATE(CONVERT_TZ(NOW(),'SYSTEM','Asia/Manila'))`;
    let salesParams = [];

    // transaction counts by status filtered to the same Manila "today"
    let countQuery = `SELECT
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Partial Refunded' THEN 1 ELSE 0 END) AS partial_refunded,
        SUM(CASE WHEN status = 'Refunded' THEN 1 ELSE 0 END) AS refunded,
        SUM(CASE WHEN status = 'Voided' THEN 1 ELSE 0 END) AS voided
      FROM transactions
      WHERE DATE(CONVERT_TZ(created_at,'SYSTEM','Asia/Manila')) =
            DATE(CONVERT_TZ(NOW(),'SYSTEM','Asia/Manila'))`;
    let countParams = [];

    if (role_id !== 3) {
      salesQuery += ` AND branch_id = ?`;
      countQuery += ` AND branch_id = ?`;
      salesParams.push(branchId);
      countParams.push(branchId);
    }

    const [[{ total_sales }]] = await db.execute(salesQuery, salesParams);
    const [[status_counts]] = await db.execute(countQuery, countParams);

    // active employees (role 1 or 2) with status 'Activate'.
    // by default count those created by the current user, but
    // superadmins can optionally specify ?creatorId=XYZ to look at
    // someone else's created accounts.  Everyone is still confined
    // to their branch (admins) or all branches (superadmin).
    let empQuery = `SELECT COUNT(*) AS count FROM users WHERE role_id IN (1) AND status = 'Activate'`;
    const empParams = [];
    let creatorFilter = req.user.user_id;

    if (role_id === 3 && req.query.creatorId) {
      // allow superadmin to view another user's creations
      creatorFilter = req.query.creatorId;
    }

    if (role_id !== 3) {
      // restrict to branch and creator
      empQuery += ` AND branch_id = ? AND created_by = ?`;
      empParams.push(branchId, creatorFilter);
    } else {
      // superadmin: no branch restriction, but still filter by creator if provided
      if (creatorFilter) {
        empQuery += ` AND created_by = ?`;
        empParams.push(creatorFilter);
      }
    }
    const [[{ count: active_employees }]] = await db.execute(empQuery, empParams);

    // low stock count
    let lowQuery;
    const lowParams = [];
    if (role_id === 3) {
      lowQuery = `SELECT COUNT(*) AS count FROM inventory WHERE quantity <= low_stock_threshold`;
    } else {
      lowQuery = `SELECT COUNT(*) AS count FROM inventory WHERE branch_id = ? AND quantity <= low_stock_threshold`;
      lowParams.push(branchId);
    }
    const [[{ count: low_stock }]] = await db.execute(lowQuery, lowParams);

    return res.json({
      total_sales: Number(total_sales || 0),
      status_counts,
      active_employees,
      low_stock,
    });
  } catch (err) {
    console.error('getDashboardStats error', err);
    return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
}

export default {
  getDashboardStats,
};