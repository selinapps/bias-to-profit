#!/usr/bin/env node

/**
 * Manual Performance Optimization Application
 * This script applies the performance optimizations directly to the database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read the performance optimization SQL
const performanceSQL = fs.readFileSync('apply_performance_only.sql', 'utf8');

console.log('🚀 Applying Performance Optimizations Manually...\n');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-key') {
  console.log('❌ Please set your Supabase credentials in environment variables:');
  console.log('   VITE_SUPABASE_URL=your-supabase-url');
  console.log('   VITE_SUPABASE_ANON_KEY=your-supabase-key');
  console.log('\nOr update the script with your actual credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPerformanceOptimizations() {
  try {
    console.log('📊 Step 1: Creating composite indexes...');
    
    // Apply the performance optimizations
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: performanceSQL
    });

    if (error) {
      console.error('❌ Error applying performance optimizations:', error);
      return;
    }

    console.log('✅ Performance optimizations applied successfully!');
    console.log('\n📋 Applied Optimizations:');
    console.log('   ✅ Composite indexes for common queries');
    console.log('   ✅ Materialized view for daily performance metrics');
    console.log('   ✅ Optimized database functions');
    console.log('   ✅ Performance monitoring indexes');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Update your components to use useTradesOptimized');
    console.log('   2. Test the performance improvements');
    console.log('   3. Monitor metrics in development mode');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Alternative: Manual SQL execution instructions
console.log('📝 Manual Application Instructions:');
console.log('\n1. Open your Supabase Dashboard');
console.log('2. Go to SQL Editor');
console.log('3. Copy and paste the contents of apply_performance_only.sql');
console.log('4. Execute the SQL');
console.log('\nOr run this script with proper credentials:');
console.log('   node apply-performance-manual.js');

applyPerformanceOptimizations();
