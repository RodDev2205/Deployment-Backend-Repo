import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  let connection;
  try {
    // Create connection without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('✓ Connected to MySQL server');

    // Select database
    await connection.query(`USE ${process.env.DB_NAME}`);
    console.log(`✓ Selected database: ${process.env.DB_NAME}`);

    // Read SQL file
    const sqlFilePath = path.join(path.resolve(), 'create-category-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✓ Read migration file');

    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`\n📋 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.query(stmt);
        console.log(`✓ Statement ${i + 1}/${statements.length} completed`);
      } catch (err) {
        // Some warnings are expected (e.g., column already exists)
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠ Statement ${i + 1}/${statements.length} - Already exists (safe to ignore)`);
        } else {
          console.error(`\n❌ Error in statement ${i + 1}:`);
          console.error(`SQL: ${stmt.substring(0, 100)}...`);
          console.error(`Error Code: ${err.code}`);
          console.error(`Message: ${err.message}\n`);
          throw err;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n');

    // Verify results
    console.log('📊 Verification:\n');
    
    const [mainCats] = await connection.query('SELECT COUNT(*) as count FROM main_categories');
    console.log(`✓ main_categories table: ${mainCats[0].count} categories`);

    const [subCats] = await connection.query('SELECT COUNT(*) as count FROM sub_categories');
    console.log(`✓ sub_categories table: ${subCats[0].count} categories`);

    const [invCols] = await connection.query('DESCRIBE inventory');
    const hasCols = invCols.some(col => col.Field === 'main_category_id') && 
                    invCols.some(col => col.Field === 'sub_category_id');
    console.log(`✓ inventory table: Category columns ${hasCols ? 'added' : 'NOT added - ERROR!'}`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
