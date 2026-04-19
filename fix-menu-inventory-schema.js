import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fixMenuInventorySchema() {
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

    // Check current schema
    console.log('📋 Checking menu_inventory table structure...');
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_KEY, EXTRA, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'menu_inventory' 
       ORDER BY ORDINAL_POSITION`
    );
    
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}): nullable=${col.IS_NULLABLE}, key=${col.COLUMN_KEY}`);
    });
    console.log();

    const hasInventoryId = columns.some(c => c.COLUMN_NAME === 'inventory_id');
    const hasIngredientId = columns.some(c => c.COLUMN_NAME === 'ingredient_id');

    if (hasInventoryId && hasIngredientId) {
      console.log('🔧 Dropping deprecated inventory_id column (replaced by ingredient_id)...');
      console.log('  Step 1: Dropping foreign key constraint...');
      try {
        await conn.query('ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_inventory');
        console.log('  ✅ Foreign key dropped');
      } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('  ⚠️  Foreign key not found, continuing...');
        } else {
          throw err;
        }
      }
      
      console.log('  Step 2: Dropping column...');
      await conn.query('ALTER TABLE menu_inventory DROP COLUMN inventory_id');
      console.log('✅ inventory_id column dropped\n');
    } else if (hasInventoryId && !hasIngredientId) {
      console.log('⚠️  Warning: inventory_id exists but ingredient_id does not.');
      console.log('Making inventory_id nullable as fallback...');
      await conn.query('ALTER TABLE menu_inventory MODIFY COLUMN inventory_id INT NULL');
      console.log('✅ inventory_id is now nullable\n');
    }

    // Verify the fix
    const [newColumns] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_KEY, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'menu_inventory' 
       ORDER BY ORDINAL_POSITION`
    );
    
    console.log('✅ Updated menu_inventory schema:');
    newColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}): nullable=${col.IS_NULLABLE}, key=${col.COLUMN_KEY}`);
    });
    
    console.log('\n🎉 Schema fixed successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  } finally {
    if (conn) conn.end();
  }
}

fixMenuInventorySchema().then(success => {
  process.exit(success ? 0 : 1);
});
