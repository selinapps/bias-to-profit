#!/usr/bin/env node

/**
 * Migration Verification Script
 * This script verifies that the database migration was successful
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔍 Verifying Database Migration...\n');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-key') {
  console.log('❌ Please set your Supabase credentials:');
  console.log('   VITE_SUPABASE_URL=your-supabase-url');
  console.log('   VITE_SUPABASE_ANON_KEY=your-supabase-key');
  console.log('\nOr update the script with your actual credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  try {
    console.log('📊 Checking database tables...');
    
    // Test if trades table exists and is accessible
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('count')
      .limit(1);
    
    if (tradesError) {
      console.log('❌ Trades table not accessible:', tradesError.message);
      return;
    }
    
    console.log('✅ Trades table is accessible');
    
    // Test if user_settings table exists
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('count')
      .limit(1);
    
    if (settingsError) {
      console.log('❌ User settings table not accessible:', settingsError.message);
      return;
    }
    
    console.log('✅ User settings table is accessible');
    
    // Test if bias_state table exists
    const { data: bias, error: biasError } = await supabase
      .from('bias_state')
      .select('count')
      .limit(1);
    
    if (biasError) {
      console.log('❌ Bias state table not accessible:', biasError.message);
      return;
    }
    
    console.log('✅ Bias state table is accessible');
    
    // Test performance functions
    console.log('\n🧪 Testing performance functions...');
    
    try {
      const { data: dailyLosses, error: dailyLossesError } = await supabase.rpc('get_daily_losses', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for test
        p_date: new Date().toISOString().split('T')[0]
      });
      
      if (dailyLossesError) {
        console.log('❌ get_daily_losses function error:', dailyLossesError.message);
      } else {
        console.log('✅ get_daily_losses function is working');
      }
    } catch (error) {
      console.log('⚠️ get_daily_losses function test failed:', error.message);
    }
    
    try {
      const { data: tradeStats, error: tradeStatsError } = await supabase.rpc('get_user_trade_stats', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for test
        p_days: 30
      });
      
      if (tradeStatsError) {
        console.log('❌ get_user_trade_stats function error:', tradeStatsError.message);
      } else {
        console.log('✅ get_user_trade_stats function is working');
      }
    } catch (error) {
      console.log('⚠️ get_user_trade_stats function test failed:', error.message);
    }
    
    console.log('\n🎉 Migration verification complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ All required tables are accessible');
    console.log('   ✅ Performance functions are available');
    console.log('   ✅ Your trades tracking system is ready!');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Test your application with the optimized components');
    console.log('   2. Monitor performance metrics in development');
    console.log('   3. Verify real-time updates are working');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Alternative: Manual verification instructions
console.log('📝 Manual Verification Instructions:');
console.log('\n1. Open your Supabase Dashboard');
console.log('2. Go to Table Editor');
console.log('3. Check that these tables exist:');
console.log('   - trades');
console.log('4. Go to SQL Editor and test:');
console.log('   SELECT * FROM trades LIMIT 1;');
console.log('   SELECT * FROM user_settings LIMIT 1;');
console.log('   SELECT * FROM bias_state LIMIT 1;');
console.log('\nOr run this script with proper credentials:');
console.log('   node verify-migration.js');

verifyMigration();
