import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateMenuInventoryFK() {
  let conn;
  try {
    console.log('🔄 Connecting to database...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    console.log('✅ Connected to database\n');

    // Check current foreign key constraints
    console.log('📋 Checking current foreign key constraints for menu_inventory...');
    const [constraints] = await conn.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('Current constraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
    });
    console.log();

    // Drop the old foreign key constraint
    console.log('🔧 Dropping old foreign key constraint...');
    try {
      await conn.query('ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_ingredient');
      console.log('✅ Old foreign key constraint dropped');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Foreign key constraint not found, continuing...');
      } else {
        throw err;
      }
    }

    // Add new foreign key constraint to inventory table
    console.log('🔧 Adding new foreign key constraint to inventory table...');
    await conn.query(`
      ALTER TABLE menu_inventory
      ADD CONSTRAINT fk_menu_inventory_inventory
      FOREIGN KEY (ingredient_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
    `);
    console.log('✅ New foreign key constraint added');

    // Verify the constraint was updated
    const [newConstraints] = await conn.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('✅ Updated constraints:');
    newConstraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
    });

    console.log('\n🎉 Foreign key constraint updated successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  } finally {
    if (conn) conn.end();
  }
}

updateMenuInventoryFK().then(success => {
  process.exit(success ? 0 : 1);
});