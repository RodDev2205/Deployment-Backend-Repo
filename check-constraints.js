import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkConstraints() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  console.log('Checking foreign key constraints for menu_inventory table...');
  const [constraints] = await conn.query(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
  );

  console.log('Foreign key constraints:');
  constraints.forEach(c => {
    console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
  });

  await conn.end();
}

checkConstraints().catch(console.error);