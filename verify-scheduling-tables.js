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

    const tables = ['branch_operating_period', 'branch_schedule', 'branch_closures', 'branch_break_times'];
    
    console.log('\n✅ BRANCH SCHEDULING TABLES VERIFICATION\n');

    for (const table of tables) {
      try {
        const [cols] = await conn.execute('DESCRIBE ??', [table]);
        console.log(`📋 ${table}:`);
        cols.forEach(col => {
          const nullable = col.Null === 'NO' ? '✓ NOT NULL' : '• nullable';
          console.log(`   • ${col.Field.padEnd(18)} (${col.Type.padEnd(20)}) ${nullable}`);
        });
        console.log('');
      } catch (error) {
        console.log(`❌ ${table}: Table does not exist\n`);
      }
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
