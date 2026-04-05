import { db } from './src/config/db.js';

(async () => {
  try {
    // Check users with role_id = 3 (Super Admin)
    const [superAdmins] = await db.query('SELECT user_id, username, role_id, status FROM users WHERE role_id = 3');
    console.log('Super Admin users:');
    superAdmins.forEach(user => {
      console.log(`- User ${user.user_id}: ${user.username}, status: ${user.status}`);
    });

    // Check all users
    const [allUsers] = await db.query('SELECT user_id, username, role_id, status FROM users LIMIT 10');
    console.log('\nAll users (first 10):');
    allUsers.forEach(user => {
      console.log(`- User ${user.user_id}: ${user.username}, role: ${user.role_id}, status: ${user.status}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();