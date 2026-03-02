import { db } from "../config/db.js";

// return total sales per branch within provided date range
export async function getBranchComparison(req, res) {
  try {
    const { startDate, endDate } = req.query;
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
    // decide how to compute previous window
    let prevStart;
    let prevEnd;
    let prevWindowDays; // for metadata

    const sameDay = start.getFullYear() === end.getFullYear()
      && start.getMonth() === end.getMonth()
      && start.getDate() === end.getDate();

    if (sameDay) {
      // single-day request – use rolling 7‑day total before this day to smooth spikes
      prevWindowDays = 7;
      prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1); // yesterday
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - (prevWindowDays - 1));
    } else {
      // equal-length previous period (the original behaviour)
      const spanMs = end - start;
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - spanMs);
      prevWindowDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    const prevStartSql = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-${String(prevStart.getDate()).padStart(2,'0')} 00:00:00`;
    const prevEndSql = `${prevEnd.getFullYear()}-${String(prevEnd.getMonth()+1).padStart(2,'0')}-${String(prevEnd.getDate()).padStart(2,'0')} 23:59:59`;

    let query = `
      SELECT b.branch_id, b.branch_name,
             IFNULL(SUM(CASE WHEN t.status='Completed' AND t.created_at BETWEEN ? AND ? THEN t.total_amount ELSE 0 END),0) AS total_sales,
             IFNULL(SUM(CASE WHEN t.status='Completed' AND t.created_at BETWEEN ? AND ? THEN t.total_amount ELSE 0 END),0) AS prev_sales,
             COUNT(CASE WHEN t.status='Completed' AND t.created_at BETWEEN ? AND ? THEN 1 END) AS transaction_count
      FROM branches b
      LEFT JOIN transactions t ON t.branch_id = b.branch_id
    `;
    const params = [startSql, endSql, prevStartSql, prevEndSql, startSql, endSql];

    // restrict for admin
    if (role_id === 2) {
      query += ` WHERE b.branch_id = ?`;
      params.push(userBranch);
    }

    query += ` GROUP BY b.branch_id, b.branch_name
               ORDER BY total_sales DESC`;

    const [rows] = await db.execute(query, params);
    // annotate returned rows so frontend can label the previous window
    const annotated = (rows || []).map(r => ({
      ...r,
      prev_window_days: prevWindowDays || 0
    }));
    return res.json(annotated);
  } catch (err) {
    console.error('getBranchComparison error', err);
    return res.status(500).json({ message: 'Failed to fetch branch comparison', error: err.message });
  }
}

export default {
  getBranchComparison,
};
