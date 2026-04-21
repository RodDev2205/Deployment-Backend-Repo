import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixMigration() {
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

    console.log('🔄 Fixing category tables...\n');

    // Step 1: Add missing columns to main_categories
    console.log('📋 Step 1: Fixing main_categories table...');
    try {
      await connection.execute(`
        ALTER TABLE main_categories 
        ADD COLUMN description TEXT,
        ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('  ✓ Added missing columns to main_categories');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  ℹ Columns already exist in main_categories');
      } else {
        throw err;
      }
    }

    // Step 2: Add missing columns to sub_categories
    console.log('\n📋 Step 2: Fixing sub_categories table...');
    try {
      await connection.execute(`
        ALTER TABLE sub_categories 
        ADD COLUMN description TEXT,
        ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('  ✓ Added missing columns to sub_categories');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  ℹ Columns already exist in sub_categories');
      } else {
        throw err;
      }
    }

    // Step 3: Add missing columns to inventory
    console.log('\n📋 Step 3: Fixing inventory table...');
    try {
      await connection.execute(`
        ALTER TABLE inventory 
        ADD COLUMN main_category_id INT DEFAULT NULL AFTER status,
        ADD COLUMN sub_category_id INT DEFAULT NULL AFTER main_category_id
      `);
      console.log('  ✓ Added category columns to inventory');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  ℹ Category columns already exist in inventory');
      } else {
        throw err;
      }
    }

    // Step 4: Add foreign keys to inventory if they don't exist
    console.log('\n📋 Step 4: Adding foreign key constraints...');
    try {
      await connection.execute(`
        ALTER TABLE inventory 
        ADD CONSTRAINT fk_inventory_main_category FOREIGN KEY (main_category_id) 
        REFERENCES main_categories(main_category_id) ON DELETE SET NULL
      `);
      console.log('  ✓ Added main_category_id foreign key');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('  ℹ Foreign key for main_category_id already exists');
      } else {
        console.log('  ⚠ Could not add main_category FK:', err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE inventory 
        ADD CONSTRAINT fk_inventory_sub_category FOREIGN KEY (sub_category_id) 
        REFERENCES sub_categories(sub_category_id) ON DELETE SET NULL
      `);
      console.log('  ✓ Added sub_category_id foreign key');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('  ℹ Foreign key for sub_category_id already exists');
      } else {
        console.log('  ⚠ Could not add sub_category FK:', err.message);
      }
    }

    // Step 5: Check if we need to insert categories
    console.log('\n📋 Step 5: Checking category data...');
    const [mainCats] = await connection.execute('SELECT COUNT(*) as count FROM main_categories');
    const mainCatCount = mainCats[0].count;
    
    if (mainCatCount === 0) {
      console.log('  • Inserting main categories...');
      await connection.execute(`
        INSERT INTO main_categories (name, description) VALUES
        ('Beverages', 'All types of drinks and beverages'),
        ('Appetizers', 'Starters and appetizers'),
        ('Main Course', 'Main dishes and entrees'),
        ('Desserts', 'Sweet treats and desserts'),
        ('Sides', 'Side dishes and accompaniments')
      `);
      console.log('  ✓ 5 main categories inserted');

      // Get IDs for sub-category insertion
      const [beverages] = await connection.execute('SELECT main_category_id FROM main_categories WHERE name = "Beverages"');
      const [appetizers] = await connection.execute('SELECT main_category_id FROM main_categories WHERE name = "Appetizers"');
      const [mainCourse] = await connection.execute('SELECT main_category_id FROM main_categories WHERE name = "Main Course"');
      const [desserts] = await connection.execute('SELECT main_category_id FROM main_categories WHERE name = "Desserts"');
      const [sides] = await connection.execute('SELECT main_category_id FROM main_categories WHERE name = "Sides"');

      const bId = beverages[0].main_category_id;
      const aId = appetizers[0].main_category_id;
      const mId = mainCourse[0].main_category_id;
      const dId = desserts[0].main_category_id;
      const sId = sides[0].main_category_id;

      console.log('  • Inserting sub categories...');
      await connection.execute(`
        INSERT INTO sub_categories (main_category_id, name, description) VALUES
        (${bId}, 'Soft Drinks', 'Carbonated and non-carbonated soft drinks'),
        (${bId}, 'Coffee & Tea', 'Hot and cold coffee and tea beverages'),
        (${bId}, 'Juices', 'Fresh and packaged fruit juices'),
        (${aId}, 'Fried Items', 'Fried appetizers and snacks'),
        (${aId}, 'Grilled Items', 'Grilled appetizers'),
        (${mId}, 'Filipino Dishes', 'Traditional Filipino main courses'),
        (${mId}, 'Western Dishes', 'Western cuisine main courses'),
        (${dId}, 'Cakes', 'Cake varieties'),
        (${dId}, 'Pastries', 'Pastry items'),
        (${sId}, 'Rice Dishes', 'Rice-based side dishes'),
        (${sId}, 'Noodle Dishes', 'Noodle-based sides')
      `);
      console.log('  ✓ 11 sub categories inserted');
    } else {
      console.log(`  ✓ Main categories already exist (${mainCatCount} records)`);
      const [subCats] = await connection.execute('SELECT COUNT(*) as count FROM sub_categories');
      console.log(`  ✓ Sub categories: ${subCats[0].count} records`);
    }

    console.log('\n✅ Migration/Fix completed successfully!\n');

    // Final verification
    console.log('📊 Final Status:\n');
    const [mainCatFinal] = await connection.execute('DESCRIBE main_categories');
    console.log('main_categories columns:');
    mainCatFinal.forEach(col => {
      console.log(`  ✓ ${col.Field}`);
    });

    const [mainCatData] = await connection.execute('SELECT COUNT(*) as count FROM main_categories');
    console.log(`\nData: ${mainCatData[0].count} main categories`);

    const [subCatData] = await connection.execute('SELECT COUNT(*) as count FROM sub_categories');
    console.log(`Data: ${subCatData[0].count} sub categories\n`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixMigration();
