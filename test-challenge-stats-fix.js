#!/usr/bin/env node

// Test script to verify challenge stats fix
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = 'https://zbmpysqxauzfrbvroboh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibXB5c3F4YXV6ZnJidnJvYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTkxNjUsImV4cCI6MjA3NDUzNTE2NX0.yAHPEM7b6XQORKLdn6rE5vnc84Wxwa0YmIE3r4cdkss';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChallengeStats() {
  try {
    console.log('🧪 Testing Challenge Stats Fix');
    console.log('==============================');
    
    // First, let's check if we can get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Not authenticated. Please log in first.');
      console.log('💡 This test requires you to be logged in to access your challenge data.');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email}`);
    
    // Test the challenge summary function
    console.log('\n📊 Testing get_enhanced_challenge_summary function...');
    
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_enhanced_challenge_summary', { p_user_id: user.id });
    
    if (summaryError) {
      console.error('❌ Error calling challenge summary function:', summaryError);
      return;
    }
    
    if (!summaryData || summaryData.length === 0) {
      console.log('ℹ️  No active challenge found for this user.');
      console.log('💡 Create a challenge first to test the stats.');
      return;
    }
    
    const summary = summaryData[0];
    console.log('\n📈 Challenge Summary Results:');
    console.log('==============================');
    console.log(`Challenge: ${summary.challenge_name || 'Unnamed'}`);
    console.log(`Prop Firm: ${summary.prop_firm}`);
    console.log(`Phase: ${summary.phase}`);
    console.log(`Starting Balance: $${Number(summary.starting_balance).toLocaleString()}`);
    console.log(`Target Profit: $${Number(summary.target_profit).toLocaleString()}`);
    console.log(`Current Balance: $${Number(summary.current_balance).toLocaleString()}`);
    console.log(`Net P&L: $${Number(summary.net_profit).toLocaleString()}`);
    console.log(`Today's P&L: $${Number(summary.realized_today).toLocaleString()}`);
    console.log(`Distance to Pass: $${Number(summary.distance_to_pass).toLocaleString()}`);
    console.log(`Progress: ${(Number(summary.progress_pct) * 100).toFixed(1)}%`);
    console.log(`State: ${summary.state}`);
    console.log(`Build Phase Active: ${summary.build_phase_active}`);
    console.log(`Build Trades Count: ${summary.build_trades_count}`);
    console.log(`Banked Profit: $${Number(summary.banked_profit).toLocaleString()}`);
    console.log(`Daily Stop Losses: ${summary.daily_stop_losses}`);
    console.log(`Is Locked: ${summary.is_locked}`);
    
    // Check if the values look reasonable
    console.log('\n🔍 Validation Checks:');
    console.log('====================');
    
    const hasNonZeroTodayPnL = Number(summary.realized_today) !== 0;
    const hasNonZeroNetPnL = Number(summary.net_profit) !== 0;
    const hasNonZeroStopLosses = Number(summary.daily_stop_losses) !== 0;
    
    if (hasNonZeroTodayPnL || hasNonZeroNetPnL || hasNonZeroStopLosses) {
      console.log('✅ Stats are showing non-zero values - fix appears to be working!');
    } else {
      console.log('⚠️  Stats are still showing zeros. This could mean:');
      console.log('   - No trades have been made today');
      console.log('   - No trades have been closed yet');
      console.log('   - The fix needs to be applied');
    }
    
    // Test with a direct trade query to compare
    console.log('\n📊 Comparing with direct trade queries...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's trades using entry_time
    const { data: todayTradesEntry, error: todayEntryError } = await supabase
      .from('trades')
      .select('pnl, entry_time, exit_time')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('entry_time', `${today}T00:00:00`)
      .lt('entry_time', `${today}T23:59:59`);
    
    // Get today's trades using exit_time
    const { data: todayTradesExit, error: todayExitError } = await supabase
      .from('trades')
      .select('pnl, entry_time, exit_time')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('exit_time', `${today}T00:00:00`)
      .lt('exit_time', `${today}T23:59:59`);
    
    if (!todayEntryError && !todayExitError) {
      const todayPnLEntry = todayTradesEntry?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
      const todayPnLExit = todayTradesExit?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
      
      console.log(`Today's P&L (entry_time filter): $${todayPnLEntry.toLocaleString()}`);
      console.log(`Today's P&L (exit_time filter): $${todayPnLExit.toLocaleString()}`);
      console.log(`Function result: $${Number(summary.realized_today).toLocaleString()}`);
      
      if (Math.abs(todayPnLEntry - Number(summary.realized_today)) < 0.01) {
        console.log('✅ Function result matches entry_time calculation - fix is working!');
      } else {
        console.log('❌ Function result does not match entry_time calculation - fix may not be applied');
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testChallengeStats();
