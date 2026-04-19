import { db } from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runGlobalIngredientsMigration() {
  try {
    console.log('🔄 Starting global ingredients migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrate-to-global-ingredients.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments (lines starting with --)
    const sqlWithoutComments = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolon and clean up
    const commands = sqlWithoutComments
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`📄 Found ${commands.length} SQL commands to execute`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`⚡ Executing command ${i + 1}/${commands.length}...`);
        console.log(`SQL: ${command.substring(0, 80)}...`);
        try {
          await db.execute(command);
          console.log(`✅ Command ${i + 1} executed successfully`);
        } catch (error) {
          // Log error but continue with other commands
          console.error(`❌ Error in command ${i + 1}:`, error.message);
          console.error('Command was:', command.substring(0, 100) + '...');
          // For ALTER TABLE commands, some errors might be expected if columns already exist
          if (error.message.includes('Duplicate column name') ||
              error.message.includes('already exists')) {
            console.log('⚠️  Continuing (column/constraint may already exist)...');
            continue;
          }
          throw error; // Re-throw for unexpected errors
        }
      }
    }

    console.log('🎉 Global ingredients migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

runGlobalIngredientsMigration();