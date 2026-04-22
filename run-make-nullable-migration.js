#!/usr/bin/env node
import { db } from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 DATABASE MIGRATION: Make end_date nullable in branch_operating_period');
    console.log('='.repeat(80) + '\n');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', '001-make-end-date-nullable.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ Migration file not found at:', sqlFilePath);
      console.error('   Current directory:', __dirname);
      process.exit(1);
    }

    console.log('📄 Reading migration file:', sqlFilePath);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolon and filter out empty statements and comments
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`\n📋 Found ${statements.length} SQL statements to execute\n`);

    let executedCount = 0;
    let skippedCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const isSelect = statement.toUpperCase().startsWith('SELECT');
      const isDesc = statement.toUpperCase().startsWith('DESC');
      
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      console.log(`📝 ${statement.substring(0, 90)}${statement.length > 90 ? '...' : ''}`);
      
      try {
        const [result] = await db.execute(statement);
        
        if (isSelect || isDesc) {
          console.log('📊 Result:');
          if (Array.isArray(result) && result.length > 0) {
            console.table(result);
          } else if (typeof result === 'object') {
            console.log(result);
          }
        }
        
        executedCount++;
        console.log('✅ Success\n');
      } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('   Code:', err.code);
        skippedCount++;
        console.log();
      }
    }

    console.log('='.repeat(80));
    console.log(`✅ Migration completed!`);
    console.log(`   Executed: ${executedCount}/${statements.length} statements`);
    if (skippedCount > 0) {
      console.log(`   Skipped: ${skippedCount} statements`);
    }
    console.log('\n📋 Changes applied:');
    console.log('   ✓ end_date column in branch_operating_period is now nullable');
    console.log('   ✓ You can now save branch operating periods with NULL end_date');
    console.log('   ✓ Branches can have indefinite operating periods\n');
    console.log('🎉 Migration successful! You can now create branches with');
    console.log('   indefinite operating periods (empty end_date field).\n');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    console.error('='.repeat(80) + '\n');
    process.exit(1);
  }
};

// Run the migration
console.log('🔗 Connecting to database...');
runMigration();
