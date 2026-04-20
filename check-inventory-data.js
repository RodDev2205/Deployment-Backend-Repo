const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  console.log('Checking menu_inventory data...');
  const [rows] = await connection.query('SELECT * FROM menu_inventory LIMIT 5');
  console.log('menu_inventory samples:', JSON.stringify(rows, null, 2));

  console.log('\nChecking inventory data...');
  const [invRows] = await connection.query('SELECT inventory_id, item_name, quantity, servings_per_unit, total_servings FROM inventory LIMIT 5');
  console.log('inventory samples:', JSON.stringify(invRows, null, 2));

  console.log('\nChecking a specific product and its ingredients...');
  const [productRows] = await connection.query('SELECT * FROM menu_inventory WHERE product_id = 1');
  console.log('Product 1 ingredients:', JSON.stringify(productRows, null, 2));

  await connection.end();
}

checkData().catch(console.error);