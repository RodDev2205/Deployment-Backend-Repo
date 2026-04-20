import { db } from './src/config/db.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('Running menu_inventory foreign key update migration...');

    const sql = fs.readFileSync('update-menu-inventory-fk.sql', 'utf8');

    // Split SQL commands and execute them
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);

    for (const command of commands) {
      if (command.trim()) {
        console.log('Executing:', command.trim().substring(0, 50) + '...');
        await db.execute(command);
      }
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();