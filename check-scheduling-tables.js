import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    console.log('\n✅ CHECKING SCHEDULING TABLES IN RAILWAY DATABASE\n');
    
    const [rows] = await conn.execute('SHOW TABLES LIKE "branch_%"');
    
    console.log('Found tables:');
    rows.forEach(r => {
      const tableName = Object.values(r)[0];
      console.log('   ✓ ' + tableName);
    });

    if (rows.length === 0) {
      console.log('   (none found)');
    } else {
      console.log(`\n✅ Found ${rows.length} scheduling tables`);
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
