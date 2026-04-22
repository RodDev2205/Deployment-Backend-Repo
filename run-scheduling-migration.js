import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    console.log('✅ Connected to database');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'create-branch-scheduling-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => {
        // Remove leading/trailing whitespace and comments
        return stmt
          .trim()
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await connection.execute(statements[i]);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify tables were created
    console.log('\n📊 Verifying tables...');
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'branch_%'`,
      [process.env.DB_NAME]
    );

    if (tables.length > 0) {
      console.log('✅ Created tables:');
      tables.forEach(table => console.log(`   • ${table.TABLE_NAME}`));
    } else {
      console.log('⚠️  No branch_* tables found');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
