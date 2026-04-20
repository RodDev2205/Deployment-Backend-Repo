const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  try {
    console.log('🔄 Running menu_inventory foreign key migration...');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Check current constraints
    const [constraints] = await connection.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('Current constraints:', constraints);

    // Check if ingredients table exists and get data
    let ingredientsData = [];
    try {
      const [ingredientsRows] = await connection.query('SELECT * FROM ingredients');
      ingredientsData = ingredientsRows;
      console.log(`Found ${ingredientsData.length} ingredients to migrate`);
    } catch (err) {
      console.log('Ingredients table not found or empty, skipping data migration');
    }

    // Drop old constraint
    try {
      await connection.query('ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_ingredient');
      console.log('✅ Old constraint dropped');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Constraint not found, continuing...');
      } else {
        throw err;
      }
    }

    // If ingredients table exists, migrate data to inventory table
    if (ingredientsData.length > 0) {
      console.log('📦 Migrating ingredients data to inventory table...');

      for (const ingredient of ingredientsData) {
        // Check if this ingredient already exists in inventory
        const [existing] = await connection.query(
          'SELECT inventory_id FROM inventory WHERE item_name = ? AND branch_id IS NULL',
          [ingredient.item_name]
        );

        if (existing.length === 0) {
          // Insert into inventory
          const [result] = await connection.query(
            `INSERT INTO inventory
             (item_name, quantity, servings_per_unit, total_servings, low_stock_threshold, status, branch_id)
             VALUES (?, ?, ?, ?, ?, 'available', NULL)`,
            [
              ingredient.item_name,
              ingredient.stock_units || 0,
              ingredient.servings_per_unit || 1,
              (ingredient.stock_units || 0) * (ingredient.servings_per_unit || 1),
              ingredient.low_stock_threshold || 5,
            ]
          );
          console.log(`✅ Migrated ingredient ${ingredient.item_name} with new ID ${result.insertId}`);

          // Update menu_inventory to use new inventory_id
          await connection.query(
            'UPDATE menu_inventory SET ingredient_id = ? WHERE ingredient_id = ?',
            [result.insertId, ingredient.ingredient_id]
          );
        } else {
          // Update existing inventory and menu_inventory
          await connection.query(
            'UPDATE menu_inventory SET ingredient_id = ? WHERE ingredient_id = ?',
            [existing[0].inventory_id, ingredient.ingredient_id]
          );
        }
      }

      console.log('✅ Data migration completed');
    }

    // Add new constraint
    await connection.query(`
      ALTER TABLE menu_inventory
      ADD CONSTRAINT fk_menu_inventory_inventory
      FOREIGN KEY (ingredient_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
    `);
    console.log('✅ New constraint added');

    // Verify
    const [newConstraints] = await connection.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('Migration completed successfully');
    console.log('Old constraints:', constraints);
    console.log('New constraints:', newConstraints);

    await connection.end();
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

runMigration();