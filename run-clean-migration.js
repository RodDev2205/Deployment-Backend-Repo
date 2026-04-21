import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function cleanMigration() {
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

    console.log('🔄 Starting clean category migration...\n');

    // Step 1: Drop existing tables if they exist
    console.log('📋 Step 1: Cleaning up existing tables...');
    try {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      await connection.execute('DROP TABLE IF EXISTS sub_categories');
      console.log('  ✓ Dropped sub_categories if it existed');
    } catch (err) {
      console.log('  ⚠ Could not drop sub_categories:', err.message);
    }

    try {
      await connection.execute('DROP TABLE IF EXISTS main_categories');
      console.log('  ✓ Dropped main_categories if it existed');
    } catch (err) {
      console.log('  ⚠ Could not drop main_categories:', err.message);
    }

    try {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    } catch (err) {
      // Ignore
    }

    // Remove FK constraints and columns from inventory if they exist
    try {
      const [fks] = await connection.execute(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'inventory' AND COLUMN_NAME IN ('main_category_id', 'sub_category_id')
      `);
      
      for (const fk of fks) {
        try {
          await connection.execute(`ALTER TABLE inventory DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
          console.log(`  ✓ Dropped FK: ${fk.CONSTRAINT_NAME}`);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }

    try {
      await connection.execute(`
        ALTER TABLE inventory 
        DROP COLUMN IF EXISTS sub_category_id,
        DROP COLUMN IF EXISTS main_category_id
      `);
      console.log('  ✓ Removed category columns from inventory');
    } catch {
      console.log('  ⚠ Could not remove category columns (may not exist)');
    }

    // Step 2: Create main_categories table with correct schema
    console.log('\n📋 Step 2: Creating main_categories table...');
    await connection.query(`
      CREATE TABLE main_categories (
        main_category_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('  ✓ main_categories table created');

    // Step 3: Create sub_categories table with correct schema
    console.log('\n📋 Step 3: Creating sub_categories table...');
    await connection.query(`
      CREATE TABLE sub_categories (
        sub_category_id INT AUTO_INCREMENT PRIMARY KEY,
        main_category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_sub_cat_per_main (main_category_id, name),
        FOREIGN KEY (main_category_id) REFERENCES main_categories(main_category_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('  ✓ sub_categories table created');

    // Step 4: Add category columns to inventory
    console.log('\n📋 Step 4: Adding category columns to inventory...');
    await connection.query(`
      ALTER TABLE inventory
      ADD COLUMN main_category_id INT DEFAULT NULL AFTER status,
      ADD COLUMN sub_category_id INT DEFAULT NULL AFTER main_category_id
    `);
    console.log('  ✓ Columns added');

    await connection.query(`
      ALTER TABLE inventory
      ADD FOREIGN KEY (main_category_id) REFERENCES main_categories(main_category_id) ON DELETE SET NULL,
      ADD FOREIGN KEY (sub_category_id) REFERENCES sub_categories(sub_category_id) ON DELETE SET NULL
    `);
    console.log('  ✓ Foreign keys added');

    // Step 5: Insert sample main categories
    console.log('\n📋 Step 5: Inserting main categories...');
    await connection.query(`
      INSERT INTO main_categories (name, description) VALUES
      ('Beverages', 'All types of drinks and beverages'),
      ('Appetizers', 'Starters and appetizers'),
      ('Main Course', 'Main dishes and entrees'),
      ('Desserts', 'Sweet treats and desserts'),
      ('Sides', 'Side dishes and accompaniments')
    `);
    console.log('  ✓ 5 main categories inserted');

    // Step 6: Insert sample sub categories
    console.log('\n📋 Step 6: Inserting sub categories...');
    
    const [beveragesRow] = await connection.query(
      'SELECT main_category_id FROM main_categories WHERE name = "Beverages" LIMIT 1'
    );
    const [appetizersRow] = await connection.query(
      'SELECT main_category_id FROM main_categories WHERE name = "Appetizers" LIMIT 1'
    );
    const [mainCourseRow] = await connection.query(
      'SELECT main_category_id FROM main_categories WHERE name = "Main Course" LIMIT 1'
    );
    const [dessertsRow] = await connection.query(
      'SELECT main_category_id FROM main_categories WHERE name = "Desserts" LIMIT 1'
    );
    const [sidesRow] = await connection.query(
      'SELECT main_category_id FROM main_categories WHERE name = "Sides" LIMIT 1'
    );

    const beveragesId = beveragesRow[0].main_category_id;
    const appetizersId = appetizersRow[0].main_category_id;
    const mainCourseId = mainCourseRow[0].main_category_id;
    const dessertsId = dessertsRow[0].main_category_id;
    const sidesId = sidesRow[0].main_category_id;

    await connection.query(`
      INSERT INTO sub_categories (main_category_id, name, description) VALUES
      (${beveragesId}, 'Soft Drinks', 'Carbonated and non-carbonated soft drinks'),
      (${beveragesId}, 'Coffee & Tea', 'Hot and cold coffee and tea beverages'),
      (${beveragesId}, 'Juices', 'Fresh and packaged fruit juices'),
      (${appetizersId}, 'Fried Items', 'Fried appetizers and snacks'),
      (${appetizersId}, 'Grilled Items', 'Grilled appetizers'),
      (${mainCourseId}, 'Filipino Dishes', 'Traditional Filipino main courses'),
      (${mainCourseId}, 'Western Dishes', 'Western cuisine main courses'),
      (${dessertsId}, 'Cakes', 'Cake varieties'),
      (${dessertsId}, 'Pastries', 'Pastry items'),
      (${sidesId}, 'Rice Dishes', 'Rice-based side dishes'),
      (${sidesId}, 'Noodle Dishes', 'Noodle-based sides')
    `);
    console.log('  ✓ 11 sub categories inserted');

    console.log('\n✅ Migration completed successfully!\n');

    // Verify
    console.log('📊 Verification:\n');
    const [mainCats] = await connection.query('SELECT COUNT(*) as count FROM main_categories');
    console.log(`✓ main_categories: ${mainCats[0].count} records`);

    const [subCats] = await connection.query('SELECT COUNT(*) as count FROM sub_categories');
    console.log(`✓ sub_categories: ${subCats[0].count} records`);

    const [mainCatCols] = await connection.query('DESCRIBE main_categories');
    const hasDesc = mainCatCols.some(col => col.Field === 'description');
    console.log(`✓ main_categories has description column: ${hasDesc}`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

cleanMigration();
