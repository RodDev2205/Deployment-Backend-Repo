import { db } from "../config/db.js";

// return top-selling menu items with counts and revenue
export async function getTopMenuItems(req, res) {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const role_id = req.user.role_id;
    const userBranch = req.user.branch_id;

    // defaults to month-to-date if not provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = now;
    const parseDate = (d) => d ? new Date(d + 'T00:00:00') : null;
    const start = startDate ? parseDate(startDate) : defaultStart;
    const end = endDate ? parseDate(endDate) : defaultEnd;

    const startSql = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')} 00:00:00`;
    const endSql = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')} 23:59:59`;

    let query = `
      SELECT 
        p.product_id AS menu_id,
        p.product_name AS menuItem,
        COUNT(ti.transaction_id) AS sold,
        SUM(ti.quantity * ti.price) AS revenue
      FROM transaction_items ti
      JOIN products p ON ti.menu_id = p.product_id
      JOIN transactions t ON ti.transaction_id = t.transaction_id
      WHERE t.status = 'Completed'
        AND t.created_at BETWEEN ? AND ?
    `;
    const params = [startSql, endSql];

    // restrict for admin to their branch, or respect branchId query param for superadmin
    if (role_id === 2) {
      query += ` AND t.branch_id = ?`;
      params.push(userBranch);
    } else if (req.query.branchId) {
      // superadmin can filter by specific branch
      query += ` AND t.branch_id = ?`;
      params.push(parseInt(req.query.branchId));
    }

    query += `
      GROUP BY p.product_id, p.product_name
      ORDER BY sold DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [rows] = await db.execute(query, params);
    return res.json(rows || []);
  } catch (err) {
    console.error('getTopMenuItems error', err);
    return res.status(500).json({ message: 'Failed to fetch top menu items', error: err.message });
  }
}

export default {
  getTopMenuItems,
};
