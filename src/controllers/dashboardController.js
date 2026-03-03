import { db } from "../config/db.js";

// return dashboard summary stats used by owner/superadmin home page
export async function getDashboardStats(req, res) {
  try {
    const role_id = req.user.role_id;
    const branchId = req.user.branch_id;

    const now = new Date();
    const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const startSql = `${fmtDate(now)} 00:00:00`;
    const endSql = `${fmtDate(now)} 23:59:59`;

    // total sales today (completed only)
    let salesQuery = `SELECT IFNULL(SUM(total_amount),0) AS total_sales
      FROM transactions
      WHERE status = 'Completed' AND created_at BETWEEN ? AND ?`;
    let salesParams = [startSql, endSql];

    // transaction counts by status
    let countQuery = `SELECT
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Partial Refunded' THEN 1 ELSE 0 END) AS partial_refunded,
        SUM(CASE WHEN status = 'Refunded' THEN 1 ELSE 0 END) AS refunded,
        SUM(CASE WHEN status = 'Voided' THEN 1 ELSE 0 END) AS voided
      FROM transactions
      WHERE created_at BETWEEN ? AND ?`;
    let countParams = [startSql, endSql];

    if (role_id !== 3) {
      salesQuery += ` AND branch_id = ?`;
      countQuery += ` AND branch_id = ?`;
      salesParams.push(branchId);
      countParams.push(branchId);
    }

    const [[{ total_sales }]] = await db.execute(salesQuery, salesParams);
    const [[status_counts]] = await db.execute(countQuery, countParams);

    // active employees (role 1 or 2)
    let empQuery = `SELECT COUNT(*) AS count FROM users WHERE role_id IN (1,2)`;
    const empParams = [];
    if (role_id !== 3) {
      empQuery += ` AND branch_id = ?`;
      empParams.push(branchId);
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