#!/usr/bin/env node

/**
 * Apply Discipline Challenge Migration
 * 
 * This script applies the discipline challenge database migration
 * to set up the 30-day trading discipline system.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Starting Discipline Challenge Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250201000001_create_discipline_challenge.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Apply the migration
    console.log('🔄 Applying migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('📊 Discipline Challenge System is now ready');
    
    return true;
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    return false;
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  try {
    // Check if discipline_challenges table exists
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['discipline_challenges', 'daily_discipline_tracking', 'rule_violations']);
    
    if (error) {
      console.error('❌ Error checking tables:', error);
      return false;
    }
    
    const tableNames = tables.map(t => t.table_name);
    const expectedTables = ['discipline_challenges', 'daily_discipline_tracking', 'rule_violations'];
    
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables);
      return false;
    }
    
    console.log('✅ All required tables exist');
    console.log('📋 Available tables:', tableNames);
    
    return true;
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Discipline Challenge Migration Tool');
  console.log('=====================================');
  
  const success = await applyMigration();
  
  if (success) {
    const verified = await verifyMigration();
    
    if (verified) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📱 You can now use the Challenge tab in your trading app');
      console.log('🏆 Start your 30-day discipline journey!');
    } else {
      console.log('\n⚠️  Migration applied but verification failed');
      console.log('🔧 Please check the database manually');
    }
  } else {
    console.log('\n❌ Migration failed');
    console.log('🔧 Please check the error messages above');
  }
}

// Run the migration
main().catch(console.error);
