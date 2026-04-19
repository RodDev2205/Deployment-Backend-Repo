#!/usr/bin/env node
/**
 * Database Migration: Make branch_id nullable for global products
 * 
 * This migration allows superadmins to create global products
 * by setting branch_id = NULL for products with no branch scope.
 * 
 * Run this script using: node migrate-branch-nullable.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  let conn;
  try {
    console.log('🔄 Connecting to database...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    console.log('✅ Connected to database\n');

    // Check current column definition
    console.log('📋 Checking current products.branch_id column definition...');
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'branch_id'`
    );
    
    if (columns.length === 0) {
      throw new Error('products table or branch_id column not found');
    }
    
    const currentDef = columns[0];
    console.log(`Current: ${JSON.stringify(currentDef)}\n`);

    if (currentDef.IS_NULLABLE === 'YES') {
      console.log('✅ Column branch_id is already nullable. No migration needed.\n');
      return true;
    }

    // Apply migration
    console.log('🔧 Modifying products.branch_id to allow NULL...');
    await conn.query('ALTER TABLE products MODIFY COLUMN branch_id INT(11) NULL');
    console.log('✅ Successfully modified branch_id to allow NULL\n');

    // Verify change
    const [verifyColumns] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'branch_id'`
    );
    console.log(`✅ After migration: ${JSON.stringify(verifyColumns[0])}\n`);
    
    console.log('🎉 Migration completed successfully!');
    return true;
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    return false;
  } finally {
    if (conn) conn.end();
  }
}

runMigration().then(success => {
  process.exit(success ? 0 : 1);
});
