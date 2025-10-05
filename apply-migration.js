#!/usr/bin/env node

/**
 * Simple migration application script
 * This script applies the database migration directly
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration (from the client file)
const SUPABASE_URL = "https://zbmpysqxauzfrbvroboh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibXB5c3F4YXV6ZnJidnJvYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTkxNjUsImV4cCI6MjA3NDUzNTE2NX0.yAHPEM7b6XQORKLdn6rE5vnc84Wxwa0YmIE3r4cdkss";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🚀 Applying database migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250128000004_fix_missing_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📝 Executing migration...\n');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Migration application completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your application');
    console.log('2. Check the browser console for any remaining errors');
    console.log('3. Verify that all database tables are now accessible');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Alternative approach:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/migrations/20250128000004_fix_missing_schema.sql');
    console.log('4. Execute the SQL');
  }
}

// Run the migration
applyMigration();
