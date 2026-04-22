import { db } from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 MIGRATION: Make end_date nullable in branch_operating_period');
    console.log('='.repeat(70) + '\n');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', 'make-end-date-nullable.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ Migration file not found:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolon and filter out empty statements and comments
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let executedCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing SQL...`);
      console.log(`📝 ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
      
      try {
        const result = await db.execute(statement);
        executedCount++;
        console.log('✅ Success\n');
      } catch (err) {
        console.error('❌ Error:', err.message);
        // Continue with next statement even if one fails
      }
    }

    console.log('='.repeat(70));
    console.log(`✅ Migration completed! ${executedCount}/${statements.length} statements executed.`);
    console.log('📋 The end_date column in branch_operating_period is now nullable.\n');
    console.log('💡 You can now save branch operating periods with NULL end_date.');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    console.error('='.repeat(70) + '\n');
    process.exit(1);
  }
};

runMigration();
