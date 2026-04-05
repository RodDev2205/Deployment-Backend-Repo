import { db } from './src/config/db.js';

(async () => {
  try {
    // Test the getCurrentUser logic
    const userId = 1; // Test with user ID 1
    const [rows] = await db.query(
      `
      SELECT u.user_id, u.first_name, u.last_name, u.username, u.email, u.contact_number, u.role_id, r.role_name,
             u.branch_id, u.status, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      console.log('User not found');
    } else {
      console.log('API response would be:', JSON.stringify(rows[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();