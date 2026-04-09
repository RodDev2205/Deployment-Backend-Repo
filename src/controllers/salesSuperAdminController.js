import { db } from "../config/db.js";

/*
  Controller: salesSuperAdminController

  Purpose: Provide KPI values for SuperAdmin dashboards.

  Tables used (please confirm these exist in your schema):
  - `transactions` (required): expected columns -> `total_amount` (DECIMAL/NUMERIC), `status` (VARCHAR), `created_at` (DATETIME/TIMESTAMP), `branch_id` (INT)
  - `branches` (optional): for branch metadata if needed (`id`, `name`)
  - `transaction_items` (optional): for item-level KPIs (not used here)

  Endpoint: GET /api/sales-superadmin/kpis
  Query params (optional): `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)
  Defaults: month-to-date when no dates provided
*/

export async function getKpis(req, res) {
  // prevent HTTP caching of KPI responses
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { startDate, endDate, branchId } = req.query;

    // Default to month-to-date
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = now;

    const parseDate = (d) => {
      if (!d) return null;
      // expect YYYY-MM-DD
      return new Date(d + 'T00:00:00');
    };

    const start = startDate ? parseDate(startDate) : defaultStart;
    const end = endDate ? parseDate(endDate) : defaultEnd;

    // normalize bounds for SQL (inclusive)
    const startSql = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')} 00:00:00`;
    const endSql = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')} 23:59:59`;

    // Build WHERE clause for completed/amount queries (KPIs use only completed orders)
    const whereClause = branchId && branchId !== 'all'
      ? `t.status = 'Completed' AND t.created_at BETWEEN ? AND ? AND t.branch_id = ?`
      : `t.status = 'Completed' AND t.created_at BETWEEN ? AND ?`;
    const params = branchId && branchId !== 'all'
      ? [startSql, endSql, parseInt(branchId)]
      : [startSql, endSql];

    // build a second clause for status counts which should include all statuses but still respect date/branch
    const statusClause = branchId && branchId !== 'all'
      ? `created_at BETWEEN ? AND ? AND branch_id = ?`
      : `created_at BETWEEN ? AND ?`;
    const statusParams = branchId && branchId !== 'all'
      ? [startSql, endSql, parseInt(branchId)]
      : [startSql, endSql];

    // 1) Total sales (filtered by branch if selected) - NET SALES (only completed)
    const [totalRows] = await db.execute(
      `SELECT COALESCE(SUM(t.total_amount), 0) AS total_sales
       FROM transactions t
       WHERE ${whereClause}`,
      params
    );

    // 1.5) Gross sales (filtered by branch/date if selected) - ALL SALES (including voided/refunded)
    const grossWhereClause = branchId && branchId !== 'all'
      ? `t.created_at BETWEEN ? AND ? AND t.branch_id = ?`
      : `t.created_at BETWEEN ? AND ?`;
    const grossParams = branchId && branchId !== 'all'
      ? [startSql, endSql, parseInt(branchId)]
      : [startSql, endSql];

    const [grossRows] = await db.execute(
      `SELECT COALESCE(SUM(t.total_amount), 0) AS gross_sales
       FROM transactions t
       WHERE ${grossWhereClause}`,
      grossParams
    );

    // 1.6) Voided sales (filtered by branch/date if selected) - VALUE OF VOIDED PORTIONS
    const [voidedRows] = await db.execute(
      `SELECT COALESCE(SUM(ti.voided_quantity * ti.price), 0) AS voided_sales
       FROM transactions t
       LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
       WHERE ${grossWhereClause}`,
      grossParams
    );

    // 2) Total transactions (filtered by branch if selected)
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS transaction_count FROM transactions t WHERE ${whereClause}`,
      params
    );

    // 3) Four status counts (without filtering to Completed so we capture refunds/voids)
    const [statusRows] = await db.execute(
      `
        SELECT
          SUM(CASE WHEN status = 'Partial Refunded' THEN 1 ELSE 0 END) AS partial_refunded_count,
          SUM(CASE WHEN status = 'Refunded' THEN 1 ELSE 0 END) AS refunded_count,
          SUM(CASE WHEN status = 'Voided' THEN 1 ELSE 0 END) AS voided_count
        FROM transactions
        WHERE ${statusClause}
      `,
      statusParams
    );

    // 4) Active branches (ALWAYS unfiltered - shows all branches with activity)
    const [branchRows] = await db.execute(
      `SELECT COUNT(DISTINCT t.branch_id) AS active_branches FROM transactions t WHERE t.status = 'Completed' AND t.created_at BETWEEN ? AND ?`,
      [startSql, endSql]
    );

    const grossSales = Number(grossRows[0].gross_sales || 0);
    const voidedSales = Number(voidedRows[0].voided_sales || 0);
    const netSales = grossSales - voidedSales;
    const transactionCount = Number(countRows[0].transaction_count || 0);
    const partialRefunded = statusRows[0]?.partial_refunded_count || 0;
    const refunded = statusRows[0]?.refunded_count || 0;
    const voided = statusRows[0]?.voided_count || 0;
    const avgOrderValue = transactionCount > 0 ? Number((netSales / transactionCount).toFixed(2)) : 0;
    const activeBranches = Number(branchRows[0].active_branches || 0);

    // compute average transactions per day
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end - start) / msPerDay) + 1);
    const avgTransactionsPerDay = transactionCount / days;

    // month-to-date days (useful for UI)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthToDateDays = Math.floor((now - startOfMonth) / msPerDay) + 1;

    return res.json({
      gross_sales: grossSales,
      voided_sales: voidedSales,
      total_sales: netSales,
      transaction_count: transactionCount,
      partial_refunded_count: partialRefunded,
      refunded_count: refunded,
      voided_count: voided,
      avg_order_value: avgOrderValue,
      active_branches: activeBranches,
      avg_transactions_per_day: Number(avgTransactionsPerDay.toFixed(2)),
      month_to_date_days: monthToDateDays,
      start: startSql,
      end: endSql,
    });
  } catch (err) {
    console.error('getKpis error', err);
    return res.status(500).json({ message: 'Failed to fetch KPIs', error: err.message });
  }
}

export async function getVoidTransactions(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;

    // Default to month-to-date
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

    let query = `
      SELECT
        t.transaction_id,
        t.transaction_number,
        t.status,
        t.created_at,
        t.cashier_id,
        u.Username as cashier_name,
        b.branch_name,
        COALESCE(SUM(ti.voided_quantity * ti.price), 0) as void_amount
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      LEFT JOIN users u ON t.cashier_id = u.user_id
      LEFT JOIN branches b ON t.branch_id = b.branch_id
      WHERE t.status IN ('Voided', 'Partial Refunded', 'Partial Voided')
        AND t.created_at BETWEEN ? AND ?
    `;

    const params = [startSql, endSql];

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      query += ` AND t.branch_id = ?`;
      params.push(parseInt(branchId));
    }

    query += `
      GROUP BY t.transaction_id, t.status, t.created_at, t.cashier_id, u.Username, b.branch_name
      ORDER BY t.created_at DESC
    `;

    const [rows] = await db.execute(query, params);

    return res.json(rows || []);
  } catch (err) {
    console.error('getVoidTransactions error', err);
    return res.status(500).json({ message: 'Failed to fetch void transactions', error: err.message });
  }
}

export default {
  getKpis,
  getBranches,
  getVoidTransactions,
  getSalesReport,
};

export async function getBranches(req, res) {
  try {
    console.log('getBranches called - user:', req.user);
    const [branches] = await db.execute(`SELECT branch_id, branch_name FROM branches ORDER BY branch_name ASC`);
    console.log('Branches fetched successfully:', branches);
    return res.json(branches || []);
  } catch (err) {
    console.error('getBranches error:', err.message, err.code, err.sql);
    return res.status(500).json({ message: 'Failed to fetch branches', error: err.message });
  }
}

// return per-branch sales totals and completed counts for today (Manila timezone)
export async function getBranchSalesSummary(req, res) {
  try {
    const role_id = req.user.role_id;
    const branchId = req.user.branch_id;

    let query = `
      SELECT b.branch_id,
             b.branch_name,
             IFNULL(SUM(CASE WHEN t.status='Completed' THEN t.total_amount ELSE 0 END),0) AS total_sales,
             SUM(CASE WHEN t.status='Completed' THEN 1 ELSE 0 END) AS completed_count
      FROM branches b
      LEFT JOIN transactions t ON t.branch_id = b.branch_id
        AND DATE(CONVERT_TZ(t.created_at,'SYSTEM','Asia/Manila')) = DATE(CONVERT_TZ(NOW(),'SYSTEM','Asia/Manila'))
    `;
    const params = [];

    // if admin, restrict to their branch
    if (role_id !== 3) {
      query += ` WHERE b.branch_id = ?`;
      params.push(branchId);
    }

    query += `
      GROUP BY b.branch_id, b.branch_name
      ORDER BY b.branch_name ASC
    `;

    const [rows] = await db.execute(query, params);

    // compute overall total (sum of row totals)
    const overall = rows.reduce((sum, r) => sum + Number(r.total_sales || 0), 0);

    return res.json({ branches: rows, overall_total: overall });
  } catch (err) {
    console.error('getBranchSalesSummary error', err);
    return res.status(500).json({ message: 'Failed to fetch branch sales summary', error: err.message });
  }
}

export async function getTopMenuSalesByBranch(req, res) {
  try {
    const role_id = req.user.role_id;
    const userBranchId = req.user.branch_id;

    let query = `
      SELECT 
             p.product_id AS menu_id,
             p.product_name AS menu_name,
             b.branch_id,
             b.branch_name,
             IFNULL(SUM(CASE WHEN t.status='Completed' THEN ti.quantity * ti.price ELSE 0 END), 0) AS total_sales
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
      LEFT JOIN products p ON ti.menu_id = p.product_id
      LEFT JOIN branches b ON t.branch_id = b.branch_id
    `;
    const params = [];

    // if admin (role_id 2), restrict to their branch
    if (role_id !== 3) {
      query += ` WHERE t.branch_id = ?`;
      params.push(userBranchId);
    }

    query += `
      GROUP BY p.product_id, p.product_name, b.branch_id, b.branch_name
      HAVING total_sales > 0
      ORDER BY total_sales DESC
      LIMIT 50
    `;

    const [rows] = await db.execute(query, params);

    return res.json(rows);
  } catch (err) {
    console.error('getTopMenuSalesByBranch error', err);
    return res.status(500).json({ message: 'Failed to fetch top menu sales', error: err.message });
  }
}

/**
 * Sample sales report query as requested
 * Returns subtotal, tax_amount, and total_amount sums for a branch
 */
export async function getSalesReport(req, res) {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({ message: 'branchId query parameter is required' });
    }

    const [rows] = await db.execute(
      `SELECT
        SUM(subtotal) AS total_subtotal,
        SUM(tax_amount) AS total_tax_amount,
        SUM(total_amount) AS total_amount,
        COUNT(*) AS transaction_count
       FROM transactions
       WHERE branch_id = ? AND status = 'Completed'`,
      [branchId]
    );

    const result = rows[0] || {
      total_subtotal: 0,
      total_tax_amount: 0,
      total_amount: 0,
      transaction_count: 0
    };

    // Ensure numeric values
    result.total_subtotal = Number(result.total_subtotal || 0);
    result.total_tax_amount = Number(result.total_tax_amount || 0);
    result.total_amount = Number(result.total_amount || 0);
    result.transaction_count = Number(result.transaction_count || 0);

    return res.json(result);
  } catch (err) {
    console.error('getSalesReport error', err);
    return res.status(500).json({ message: 'Failed to fetch sales report', error: err.message });
  }
}
