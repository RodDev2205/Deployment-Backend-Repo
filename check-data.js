import { db } from './src/config/db.js';

(async () => {
  try {
    const [rows] = await db.query('SELECT user_id, first_name, last_name, email, created_at FROM users LIMIT 5');
    console.log('Sample user data:');
    rows.forEach(row => {
      console.log(`User ${row.user_id}: first_name="${row.first_name}", last_name="${row.last_name}", email="${row.email}", created_at="${row.created_at}"`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();