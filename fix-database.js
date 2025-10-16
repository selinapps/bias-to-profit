#!/usr/bin/env node

/**
 * Database Fix Script for Bias-to-Profit
 * This script helps apply migrations and verify the database schema
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();
    
    return !error && data;
  } catch (err) {
    return false;
  }
}

async function checkViewExists(viewName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', viewName)
      .single();
    
    return !error && data;
  } catch (err) {
    return false;
  }
}

async function runMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📄 Running migration: ${migrationFile}`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error(`❌ Migration failed: ${migrationFile}`, error);
      return false;
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`❌ Error reading migration file: ${migrationFile}`, err);
    return false;
  }
}

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');
  
  const requiredTables = ['profiles', 'trades', 'bias_state', 'user_settings'];
  const requiredViews = ['v_current_bias'];
  
  let allGood = true;
  
  // Check tables
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`✅ Table exists: ${table}`);
    } else {
      console.log(`❌ Missing table: ${table}`);
      allGood = false;
    }
  }
  
  // Check views
  for (const view of requiredViews) {
    const exists = await checkViewExists(view);
    if (exists) {
      console.log(`✅ View exists: ${view}`);
    } else {
      console.log(`❌ Missing view: ${view}`);
      allGood = false;
    }
  }
  
  return allGood;
}

async function main() {
  console.log('🚀 Bias-to-Profit Database Fix Script\n');
  
  try {
    // First, verify current schema
    const schemaOk = await verifySchema();
    
    if (!schemaOk) {
      console.log('\n📦 Applying missing schema migration...');
      
      // Run the comprehensive fix migration
      const success = await runMigration('20250128000004_fix_missing_schema.sql');
      
      if (success) {
        console.log('\n🔍 Re-verifying schema...');
        const schemaOkAfter = await verifySchema();
        
        if (schemaOkAfter) {
          console.log('\n🎉 Database schema is now complete!');
        } else {
          console.log('\n⚠️  Some issues may still exist. Check the logs above.');
        }
      } else {
        console.log('\n❌ Failed to apply migration. Please check the logs.');
      }
    } else {
      console.log('\n🎉 Database schema is already complete!');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
