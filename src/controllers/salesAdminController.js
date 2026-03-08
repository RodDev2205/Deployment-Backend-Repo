import { db } from "../config/db.js";

// Get sales by period (daily, weekly, monthly) for the current branch or all branches (if superadmin)
export const getSalesByPeriod = async (req, res) => {
  const { period = 'daily', startDate, endDate } = req.query;
  const branch_id = req.user.branch_id;
  const role_id = req.user.role_id;

  // determine grouping expression and label
  let groupExpr;
  switch (period) {
    case 'weekly':
      // produce string like "2023-05" for ISO year-week
      groupExpr = `CONCAT(YEAR(created_at), '-', LPAD(WEEK(created_at,1),2,'0'))`;
      break;
    case 'monthly':
      // produce string like "2023-02" for year-month
      groupExpr = `CONCAT(YEAR(created_at), '-', LPAD(MONTH(created_at),2,'0'))`;
      break;
    default:
      groupExpr = `DATE(created_at)`;
      break;
  }

  try {
    let query = `
      SELECT 
        ${groupExpr} as period_key,
        branch_id,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as transaction_count,
        SUM(CASE WHEN status = 'Completed' THEN total_amount ELSE 0 END) as total_sales,
        COUNT(CASE WHEN status = 'Voided' THEN 1 END) as voided_count,
        COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded_count,
        COUNT(CASE WHEN status = 'Partial Refunded' THEN 1 END) as partial_refunded_count
      FROM transactions
    `;

    let params = [];

    if (role_id === 2) {
      query += ` WHERE branch_id = ?`;
      params.push(branch_id);
    }

    if (startDate && endDate) {
      const dateFilter = role_id === 2 ? ` AND ` : ` WHERE `;
      query += `${dateFilter} DATE(created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY ${groupExpr}, branch_id ORDER BY ${groupExpr} DESC`;

    const [results] = await db.query(query, params);
    res.json(results || []);
  } catch (error) {
    console.error("GET SALES BY PERIOD ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get daily sales for the current branch or all branches (if superadmin)
export const getDailySalesByBranch = async (req, res) => {
  const { startDate, endDate } = req.query;
  const branch_id = req.user.branch_id;
  const role_id = req.user.role_id;

  try {
    let query = `
      SELECT 
        DATE(created_at) as date,
        branch_id,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as transaction_count,
        SUM(CASE WHEN status = 'Completed' THEN total_amount ELSE 0 END) as total_sales,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'Voided' THEN 1 END) as voided_count,
        COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded_count,
        COUNT(CASE WHEN status = 'Partial Refunded' THEN 1 END) as partial_refunded_count
      FROM transactions
    `;

    let params = [];

    // Filter by branch if admin (role 2), superadmin (role 3) sees all branches
    if (role_id === 2) {
      query += ` WHERE branch_id = ?`;
      params.push(branch_id);
    }

    // Add date filtering if provided
    if (startDate && endDate) {
      const dateFilter = role_id === 2 ? ` AND ` : ` WHERE `;
      query += `${dateFilter} DATE(created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY DATE(created_at), branch_id ORDER BY date DESC`;

    const [results] = await db.query(query, params);

    res.json(results || []);
  } catch (error) {
    console.error("GET DAILY SALES ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get sales summary for today by branch
export const getSalesTodayByBranch = async (req, res) => {
  const branch_id = req.user.branch_id;
  const role_id = req.user.role_id;

  try {
    let query = `
      SELECT 
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN t.status = 'Partial Refunded' THEN 1 ELSE 0 END) as partial_refunded_count,
        SUM(CASE WHEN t.status = 'Refunded' THEN 1 ELSE 0 END) as refunded_count,
        SUM(CASE WHEN t.status = 'Voided' THEN 1 ELSE 0 END) as voided_count,
        SUM(CASE WHEN t.status = 'Partial Voided' THEN 1 ELSE 0 END) as partial_voided_count,
        COUNT(*) as all_transaction_count,
        MAX(CASE WHEN t.status = 'Completed' THEN t.total_amount ELSE NULL END) as max_order_value,
        MIN(CASE WHEN t.status = 'Completed' THEN t.total_amount ELSE NULL END) as min_order_value,
        AVG(CASE WHEN t.status = 'Completed' THEN t.total_amount ELSE NULL END) as avg_order_value,
        COUNT(DISTINCT CASE WHEN t.status IN ('Voided', 'Partial Voided') THEN t.cashier_id ELSE NULL END) as staff_who_voided_count
      FROM transactions t
      WHERE DATE(t.created_at) = CURDATE()
    `;

    // Calculate gross_sales and voided_sales from transaction_items
    // Gross Sales: Total value of all items originally ordered (quantity + voided_quantity)
    // Voided Sales: Value of voided portions
    // Net Sales: Gross Sales - Voided Sales
    let itemsQuery = `
      SELECT
        SUM((ti.quantity + ti.voided_quantity) * ti.price) as gross_sales,
        SUM(ti.voided_quantity * ti.price) as voided_sales
      FROM transaction_items ti
      INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
      WHERE DATE(t.created_at) = CURDATE()
    `;

    let params = [];
    let itemsParams = [];

    // Filter by branch if admin
    if (role_id === 2) {
      query += ` AND t.branch_id = ?`;
      params.push(branch_id);
      itemsQuery += ` AND t.branch_id = ?`;
      itemsParams.push(branch_id);
    }

    const [[result]] = await db.query(query, params);
    const [[itemsResult]] = await db.query(itemsQuery, itemsParams);

    const gross_sales = Number(itemsResult?.gross_sales || 0);
    const voided_sales = Number(itemsResult?.voided_sales || 0);
    const net_sales = gross_sales - voided_sales;

    res.json({
      total_sales: net_sales, // Net sales after voids (current remaining value)
      gross_sales: gross_sales, // Total value of all items originally ordered
      voided_sales: voided_sales, // Value of voided portions
      transaction_count: result?.all_transaction_count || 0,
      completed_count: result?.completed_count || 0,
      partial_refunded_count: result?.partial_refunded_count || 0,
      refunded_count: result?.refunded_count || 0,
      voided_count: result?.voided_count || 0,
      partial_voided_count: result?.partial_voided_count || 0,
      staff_who_voided_count: result?.staff_who_voided_count || 0,
      max_order_value: Number(result?.max_order_value || 0),
      min_order_value: Number(result?.min_order_value || 0),
      avg_order_value: Number(result?.avg_order_value || 0),
    });
  } catch (error) {
    console.error("GET TODAY SALES ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get breakdown of payment methods (cash vs gcash) over a date range
// Get breakdown of payment methods (cash vs gcash) over a date range
export const getPaymentMethodBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const branch_id = req.user.branch_id;
    const role_id = req.user.role_id;

    // Start building base query
    let baseQuery = `
      SELECT LOWER(payment_method) AS payment_method, COUNT(*) AS cnt
      FROM transactions
      WHERE status = 'Completed'
    `;
    const params = [];

    // Branch filter for admin
    if (role_id === 2) {
      baseQuery += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    // Date range filter
    if (startDate && endDate) {
      baseQuery += ` AND DATE(created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    // Group by payment_method
    baseQuery += ` GROUP BY LOWER(payment_method)`;

    // Debug: log SQL and parameters
    console.log("Payment method SQL:", baseQuery);
    console.log("Params:", params);
    // Execute query
    const [results] = await db.query(baseQuery, params);
    console.log("Payment method query results:", results); // DEBUG

    // Ensure both cash and gcash exist even if 0
    const methods = ['cash', 'gcash'];
    const normalized = methods.map(m => {
      const row = results.find(r => r.payment_method === m);
      return { payment_method: m, count: row ? Number(row.cnt) : 0 };
    });

    res.json(normalized);
  } catch (error) {
    console.error("GET PAYMENT METHOD BREAKDOWN ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get top selling products for a branch (or all branches if superadmin)
export const getTopProductsByBranch = async (req, res) => {
  const { startDate, endDate } = req.query;
  const branch_id = req.user.branch_id;
  const role_id = req.user.role_id;

  try {
    let query = `
      SELECT ti.menu_id,
             COALESCE(p.product_name, '') AS product_name,
             SUM(ti.quantity) AS total_qty,
             SUM(ti.quantity * ti.price) AS total_amount
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.transaction_id
      LEFT JOIN products p ON ti.menu_id = p.product_id
      WHERE t.status = 'Completed'
    `;
    const params = [];

    if (role_id === 2) {
      query += ` AND t.branch_id = ?`;
      params.push(branch_id);
    }

    if (startDate && endDate) {
      query += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += `
      GROUP BY ti.menu_id
      ORDER BY total_qty DESC, total_amount DESC
    `;

    const [results] = await db.query(query, params);
    res.json(results || []);
  } catch (error) {
    console.error("GET TOP PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
