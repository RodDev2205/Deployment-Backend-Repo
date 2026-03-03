import { db } from '../config/db.js';

// GET /api/sales-superadmin/recent-transactions?branchId=1&limit=3
export const getRecentTransactions = async (req, res) => {
  try {
    const branchId = req.query.branchId || req.query.branch_id || null;
    let limit = parseInt(req.query.limit, 10) || 3;

    if (!branchId) {
      return res.status(400).json({ message: 'branchId query parameter is required' });
    }

    if (isNaN(limit) || limit <= 0) limit = 3;
    if (limit > 50) limit = 50; // cap to avoid excessive rows

    // MySQL drivers do not accept parameter binding for LIMIT in some setups.
    // Inject a sanitized integer literal for LIMIT.
    const safeLimit = Number(limit);

    const sql = `
      SELECT t.transaction_id, t.transaction_number, t.total_amount, t.created_at, t.status,
             u.username AS cashier_username
      FROM transactions t
      LEFT JOIN users u ON t.cashier_id = u.user_id
      WHERE t.branch_id = ?
      ORDER BY t.created_at DESC
      LIMIT ${safeLimit}
    `;

    const [rows] = await db.query(sql, [branchId]);

    // Normalize output: ensure keys expected by frontend exist
    const normalized = rows.map((r) => ({
      transaction_id: r.transaction_id,
      transaction_number: r.transaction_number,
      total_amount: r.total_amount,
      created_at: r.created_at,
      status: r.status,
      cashier_username: r.cashier_username,
    }));

    res.status(200).json(normalized);
  } catch (error) {
    console.error('DB ERROR (getRecentTransactions):', error);
    res.status(500).json({ message: 'Database error', error: error.message });
  }
};
