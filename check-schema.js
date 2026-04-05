import { db } from './src/config/db.js';

(async () => {
  try {
    const [rows] = await db.query('DESCRIBE users');
    console.log('Users table structure:');
    rows.forEach(row => {
      console.log(`- ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();