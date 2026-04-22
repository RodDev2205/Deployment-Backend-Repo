import { db } from './src/config/db.js';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  try {
    console.log('🔧 Starting migration: Make end_date nullable in branch_operating_period...\n');

    // Read SQL file
    const sqlFilePath = path.join(process.cwd(), 'fix-operating-period-nullable.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolon and filter out empty statements and comments
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    let executedCount = 0;

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 80)}...`);
        await db.execute(statement);
        executedCount++;
        console.log('✅ Success\n');
      }
    }

    console.log(`\n✅ Migration completed! ${executedCount} statements executed.`);
    console.log('📋 The end_date column in branch_operating_period is now nullable.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
};

runMigration();
