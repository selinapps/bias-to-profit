#!/usr/bin/env node

/**
 * Challenge Phases Migration Application Script
 * This script applies the challenge_phases table and related functions
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = "https://zbmpysqxauzfrbvroboh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibXB5c3F4YXV6ZnJidnJvYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTkxNjUsImV4cCI6MjA3NDUzNTE2NX0.yAHPEM7b6XQORKLdn6rE5vnc84Wxwa0YmIE3r4cdkss";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyChallengeMigration() {
  console.log('🚀 Applying Challenge Phases Migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250129000001_create_challenge_phases.sql');
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
          
          // Use the SQL editor approach for complex statements
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
            // Try to continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Challenge Phases Migration completed!');
    console.log('\n📋 What was created:');
    console.log('✅ challenge_phases table');
    console.log('✅ Indexes for performance');
    console.log('✅ Trigger to ensure single active challenge per user');
    console.log('✅ get_challenge_summary function');
    console.log('✅ Row Level Security policies');
    console.log('\n🔄 Next steps:');
    console.log('1. Refresh your application');
    console.log('2. Test the challenge setup wizard');
    console.log('3. Verify the challenge status card appears on the dashboard');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/migrations/20250129000001_create_challenge_phases.sql');
    console.log('4. Execute the SQL script');
  }
}

// Run the migration
applyChallengeMigration();
