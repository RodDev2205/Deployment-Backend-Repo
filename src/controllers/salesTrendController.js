import { db } from "../config/db.js";

// returns aggregated sales based on period grouping (daily, weekly, monthly, quarterly, yearly)
// query params:
//   period - one of daily|weekly|monthly|quarterly|yearly (defaults to daily)
//   startDate, endDate - optional YYYY-MM-DD boundaries (default month-to-date)
//   branchId - optional branch filter (use 'all' or omit for no filter)
export async function getSalesTrend(req, res) {
  // ensure clients always fetch up-to-date trend data
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    let { branchId } = req.query; // may be overwritten for admins
    const role_id = req.user.role_id;
    const userBranch = req.user.branch_id;

    console.log('getSalesTrend called', { period, startDate, endDate, branchId, role_id });

    // if caller is admin (role 2), force branchId to their branch
    if (role_id === 2) {
      branchId = userBranch;
    }

    // default date window same as KPI logic (month-to-date)
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = now;

    const parseDate = (d) => {
      if (!d) return null;
      return new Date(d + 'T00:00:00');
    };

    const start = startDate ? parseDate(startDate) : defaultStart;
    const end = endDate ? parseDate(endDate) : defaultEnd;

    const startSql = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')} 00:00:00`;
    const endSql = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')} 23:59:59`;

    // determine grouping expression
    let groupExpr;
    switch (period) {
      case 'hourly':
        // group by hour within the date range; include date for multi‑day requests
        groupExpr = "DATE_FORMAT(t.created_at, '%Y-%m-%d %H:00:00')";
        break;
      case 'weekly':
        // ISO week number (1-53)
        groupExpr = `CONCAT(YEAR(t.created_at), '-', LPAD(WEEK(t.created_at,1),2,'0'))`;
        break;
      case 'monthly':
        groupExpr = `CONCAT(YEAR(t.created_at), '-', LPAD(MONTH(t.created_at),2,'0'))`;
        break;
      case 'quarterly':
        // group by calendar quarter
        groupExpr = `CONCAT(YEAR(t.created_at), '-Q', QUARTER(t.created_at))`;
        break;
      case 'yearly':
        groupExpr = `YEAR(t.created_at)`;
        break;
      case 'daily':
      default:
        groupExpr = `DATE(t.created_at)`;
        break;
    }

    // build where clause; always filter completed and date range
    let where = `t.status = 'Completed' AND t.created_at BETWEEN ? AND ?`;
    const params = [startSql, endSql];
    if (branchId && branchId !== 'all') {
      where += ` AND t.branch_id = ?`;
      params.push(parseInt(branchId));
    }

    const sql = `
      SELECT
        ${groupExpr} AS period_key,
        COALESCE(SUM(ti.quantity * ti.price), 0) AS total_sales,
        COUNT(DISTINCT t.transaction_id) AS transaction_count
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      WHERE ${where}
      GROUP BY ${groupExpr}
      ORDER BY ${groupExpr} ASC
    `;

    const [rows] = await db.execute(sql, params);
    return res.json(rows || []);
  } catch (err) {
    console.error('getSalesTrend error', err);
    return res.status(500).json({ message: 'Failed to fetch sales trend', error: err.message });
  }
}

export default {
  getSalesTrend,
};
