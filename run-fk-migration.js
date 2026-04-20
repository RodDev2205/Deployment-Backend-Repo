import { db } from './src/config/db.js';

async function updateMenuInventoryFK() {
  try {
    console.log('🔄 Updating menu_inventory foreign key constraint...');

    // Check current constraints
    const [constraints] = await db.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('Current constraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
    });

    // Drop old constraint
    console.log('🔧 Dropping old foreign key constraint...');
    try {
      await db.query('ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_ingredient');
      console.log('✅ Old constraint dropped');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Constraint not found, continuing...');
      } else {
        throw err;
      }
    }

    // Add new constraint
    console.log('🔧 Adding new foreign key constraint to inventory table...');
    await db.query(`
      ALTER TABLE menu_inventory
      ADD CONSTRAINT fk_menu_inventory_inventory
      FOREIGN KEY (ingredient_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
    `);
    console.log('✅ New constraint added');

    // Verify
    const [newConstraints] = await db.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    console.log('✅ Updated constraints:');
    newConstraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  }
}

updateMenuInventoryFK().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});