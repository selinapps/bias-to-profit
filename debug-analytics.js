// Debug script to help identify analytics issues
// Run this in the browser console to check analytics functionality

console.log('🔍 Analytics Debug Script Starting...');

// Check if user is authenticated
const checkAuth = () => {
  const authElement = document.querySelector('[data-testid="user-info"], .user-info, #user-info');
  if (authElement) {
    console.log('✅ User appears to be authenticated');
    return true;
  } else {
    console.log('❌ User authentication status unclear');
    return false;
  }
};

// Check if advanced features are enabled
const checkAdvancedFeatures = () => {
  // Look for settings modal or settings indicators
  const settingsButton = document.querySelector('[data-testid="settings"], .settings-button, button[aria-label*="settings" i]');
  if (settingsButton) {
    console.log('✅ Settings button found - click it to check advanced features');
    return 'check-manually';
  } else {
    console.log('⚠️ Settings button not found');
    return false;
  }
};

// Check for analytics tab
const checkAnalyticsTab = () => {
  const analyticsTab = document.querySelector('[data-value="analytics"], [data-state*="analytics"], button[aria-label*="analytics" i]');
  if (analyticsTab) {
    console.log('✅ Analytics tab found');
    
    // Check if it's disabled or hidden
    const isDisabled = analyticsTab.disabled || analyticsTab.getAttribute('aria-disabled') === 'true';
    const isHidden = analyticsTab.style.display === 'none' || analyticsTab.hidden;
    
    if (isDisabled) {
      console.log('❌ Analytics tab is disabled');
    } else if (isHidden) {
      console.log('❌ Analytics tab is hidden');
    } else {
      console.log('✅ Analytics tab appears enabled');
    }
    
    return { found: true, disabled: isDisabled, hidden: isHidden };
  } else {
    console.log('❌ Analytics tab not found');
    return { found: false };
  }
};

// Check for analytics content
const checkAnalyticsContent = () => {
  // Click analytics tab if it exists
  const analyticsTab = document.querySelector('[data-value="analytics"], [data-state*="analytics"], button[aria-label*="analytics" i]');
  if (analyticsTab && !analyticsTab.disabled) {
    console.log('🖱️ Clicking analytics tab...');
    analyticsTab.click();
    
    // Wait a bit for content to load
    setTimeout(() => {
      const analyticsContent = document.querySelector('[data-value="analytics"] ~ *, .analytics-content, .trading-analytics');
      const loadingIndicator = document.querySelector('.animate-spin, [class*="loading"], .refresh-cw');
      const errorMessage = document.querySelector('.text-red-400, .error, [class*="error"]');
      const emptyMessage = document.querySelector('.text-center.py-8, .no-data, [class*="empty"]');
      
      if (loadingIndicator) {
        console.log('⏳ Analytics content is loading...');
      } else if (errorMessage) {
        console.log('❌ Analytics showing error:', errorMessage.textContent);
      } else if (emptyMessage) {
        console.log('📭 Analytics showing empty state:', emptyMessage.textContent);
      } else if (analyticsContent) {
        console.log('✅ Analytics content found');
      } else {
        console.log('❌ No analytics content found');
      }
    }, 1000);
  }
};

// Check for database connection
const checkDatabaseConnection = () => {
  // Look for network errors in console or network tab
  console.log('🌐 Check Network tab for failed requests to Supabase');
  console.log('   Look for requests to: supabase.co, functions ending in:');
  console.log('   - get_best_trading_hours');
  console.log('   - get_weekly_summary');
  console.log('   - get_daily_performance');
};

// Check for trades data
const checkTradesData = () => {
  // Look for trade cards or trade data
  const tradeCards = document.querySelectorAll('[class*="trade-card"], .trade-item, [data-testid*="trade"]');
  const tradeCount = tradeCards.length;
  
  if (tradeCount > 0) {
    console.log(`✅ Found ${tradeCount} trade cards`);
  } else {
    console.log('❌ No trade cards found - this might explain empty analytics');
  }
  
  return tradeCount;
};

// Main debug function
const debugAnalytics = () => {
  console.log('\n=== ANALYTICS DEBUG REPORT ===\n');
  
  const auth = checkAuth();
  const advancedFeatures = checkAdvancedFeatures();
  const analyticsTab = checkAnalyticsTab();
  const tradesCount = checkTradesData();
  
  console.log('\n=== SUMMARY ===');
  console.log(`Authentication: ${auth ? '✅' : '❌'}`);
  console.log(`Advanced Features: ${advancedFeatures === 'check-manually' ? '⚠️ Check manually' : advancedFeatures ? '✅' : '❌'}`);
  console.log(`Analytics Tab: ${analyticsTab.found ? (analyticsTab.disabled ? '❌ Disabled' : analyticsTab.hidden ? '❌ Hidden' : '✅') : '❌ Not found'}`);
  console.log(`Trade Data: ${tradesCount > 0 ? `✅ ${tradesCount} trades` : '❌ No trades'}`);
  
  if (!analyticsTab.found || analyticsTab.disabled || analyticsTab.hidden) {
    console.log('\n🔧 LIKELY ISSUE: Analytics tab is not accessible');
    console.log('   Solution: Check if advanced features are enabled in settings');
  }
  
  if (tradesCount === 0) {
    console.log('\n🔧 LIKELY ISSUE: No trade data available');
    console.log('   Solution: Add some trades first, then check analytics');
  }
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Check Network tab for failed API requests');
  console.log('3. Verify Supabase connection in application settings');
  console.log('4. Try refreshing the page');
  
  checkAnalyticsContent();
  checkDatabaseConnection();
};

// Auto-run the debug
debugAnalytics();

// Export for manual use
window.debugAnalytics = debugAnalytics;
