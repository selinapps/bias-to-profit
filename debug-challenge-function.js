#!/usr/bin/env node

// Debug script to check the challenge function status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbmpysqxauzfrbvroboh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibXB5c3F4YXV6ZnJidnJvYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTkxNjUsImV4cCI6MjA3NDUzNTE2NX0.yAHPEM7b6XQORKLdn6rE5vnc84Wxwa0YmIE3r4cdkss';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugChallengeFunction() {
  console.log('🔍 Debugging Challenge Function Issue');
  console.log('====================================');
  
  try {
    // Check if we can authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Not authenticated. Please log in first.');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log('');
    
    // Try to call the function with different parameter names
    console.log('🧪 Testing function calls with different parameter names...');
    
    // Test 1: Try with p_user_id (new parameter name)
    console.log('\n📝 Test 1: Calling with p_user_id parameter');
    try {
      const { data: data1, error: error1 } = await supabase
        .rpc('get_enhanced_challenge_summary', { p_user_id: user.id });
      
      if (error1) {
        console.log('❌ Error with p_user_id:', error1.message);
        console.log('   Code:', error1.code);
        console.log('   Details:', error1.details);
      } else {
        console.log('✅ Success with p_user_id!');
        console.log('📊 Data received:', data1);
      }
    } catch (err) {
      console.log('❌ Exception with p_user_id:', err.message);
    }
    
    // Test 2: Try with user_uuid (old parameter name)
    console.log('\n📝 Test 2: Calling with user_uuid parameter');
    try {
      const { data: data2, error: error2 } = await supabase
        .rpc('get_enhanced_challenge_summary', { user_uuid: user.id });
      
      if (error2) {
        console.log('❌ Error with user_uuid:', error2.message);
        console.log('   Code:', error2.code);
        console.log('   Details:', error2.details);
      } else {
        console.log('✅ Success with user_uuid!');
        console.log('📊 Data received:', data2);
      }
    } catch (err) {
      console.log('❌ Exception with user_uuid:', err.message);
    }
    
    // Test 3: Try with user_id (alternative parameter name)
    console.log('\n📝 Test 3: Calling with user_id parameter');
    try {
      const { data: data3, error: error3 } = await supabase
        .rpc('get_enhanced_challenge_summary', { user_id: user.id });
      
      if (error3) {
        console.log('❌ Error with user_id:', error3.message);
        console.log('   Code:', error3.code);
        console.log('   Details:', error3.details);
      } else {
        console.log('✅ Success with user_id!');
        console.log('📊 Data received:', data3);
      }
    } catch (err) {
      console.log('❌ Exception with user_id:', err.message);
    }
    
    // Check if challenge exists in database
    console.log('\n🔍 Checking if challenge exists in database...');
    try {
      const { data: challenges, error: challengeError } = await supabase
        .from('challenge_phases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (challengeError) {
        console.log('❌ Error fetching challenges:', challengeError.message);
      } else if (!challenges || challenges.length === 0) {
        console.log('ℹ️  No active challenges found for this user');
        console.log('💡 You may need to create a challenge first');
      } else {
        console.log(`✅ Found ${challenges.length} active challenge(s):`);
        challenges.forEach((challenge, index) => {
          console.log(`   ${index + 1}. ${challenge.prop_firm} - Phase ${challenge.phase}`);
          console.log(`      ID: ${challenge.id}`);
          console.log(`      Starting Balance: $${challenge.starting_balance}`);
          console.log(`      Target Profit: $${challenge.target_profit}`);
        });
      }
    } catch (err) {
      console.log('❌ Exception checking challenges:', err.message);
    }
    
    console.log('\n📋 Summary and Recommendations:');
    console.log('===============================');
    console.log('1. If all function calls fail, the function may not exist or has syntax errors');
    console.log('2. If one parameter name works, update the frontend to use that parameter');
    console.log('3. If no challenges exist, create one first to test the function');
    console.log('4. Check the Supabase function logs for more detailed error information');
    
  } catch (err) {
    console.error('❌ Debug failed:', err);
  }
}

debugChallengeFunction();
