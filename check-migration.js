import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('Checking existing tables...\n');

    // Check if main_categories exists
    try {
      const [mainCatResult] = await connection.query('DESCRIBE main_categories');
      console.log('✓ main_categories exists with columns:');
      mainCatResult.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch {
      console.log('✗ main_categories does NOT exist');
    }

    console.log('');

    // Check if sub_categories exists
    try {
      const [subCatResult] = await connection.query('DESCRIBE sub_categories');
      console.log('✓ sub_categories exists with columns:');
      subCatResult.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch {
      console.log('✗ sub_categories does NOT exist');
    }

    console.log('');

    // Check inventory table for category columns
    try {
      const [invResult] = await connection.query('DESCRIBE inventory');
      const hasCatCols = invResult.some(col => col.Field === 'main_category_id') && 
                         invResult.some(col => col.Field === 'sub_category_id');
      if (hasCatCols) {
        console.log('✓ inventory table HAS category columns');
      } else {
        console.log('✗ inventory table is MISSING category columns');
      }
    } catch {
      console.log('✗ Could not check inventory table');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();
