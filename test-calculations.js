/**
 * Comprehensive test file for trading calculations
 * Tests all mathematical and logical calculations in the trading app
 */

const { 
  calculatePnL, 
  calculateRMultiple, 
  calculateLotSize, 
  getPipValueConfig,
  calculateWinRate,
  calculateAverageRMultiple,
  calculateProfitFactor,
  calculateExpectancy,
  validateTradeParams
} = require('./src/lib/tradingCalculations.ts');

console.log('🧮 Testing Trading Calculations...\n');

// Test 1: P&L Calculations
console.log('📊 Testing P&L Calculations:');
console.log('============================');

// Test EURUSD Long Trade
const eurusdLongPnL = calculatePnL(1.1000, 1.1050, 'long', 1.0, 'EURUSD');
console.log(`EURUSD Long: Entry 1.1000, Exit 1.1050, 1 lot = $${eurusdLongPnL}`);
// Expected: 50 pips * $10 * 1 lot - $7.5 commission = $492.5

// Test EURUSD Short Trade
const eurusdShortPnL = calculatePnL(1.1050, 1.1000, 'short', 1.0, 'EURUSD');
console.log(`EURUSD Short: Entry 1.1050, Exit 1.1000, 1 lot = $${eurusdShortPnL}`);
// Expected: 50 pips * $10 * 1 lot - $7.5 commission = $492.5

// Test USDJPY Long Trade
const usdjpyLongPnL = calculatePnL(150.00, 150.50, 'long', 1.0, 'USDJPY');
console.log(`USDJPY Long: Entry 150.00, Exit 150.50, 1 lot = $${usdjpyLongPnL}`);
// Expected: 50 pips * $9 * 1 lot - $7.5 commission = $442.5

// Test Gold Long Trade
const goldLongPnL = calculatePnL(2000.00, 2005.00, 'long', 1.0, 'XAUUSD');
console.log(`Gold Long: Entry 2000.00, Exit 2005.00, 1 lot = $${goldLongPnL}`);
// Expected: 5 pips * $10 * 1 lot - $7.5 commission = $42.5

// Test ES Long Trade
const esLongPnL = calculatePnL(4000.00, 4010.00, 'long', 1.0, 'ES');
console.log(`ES Long: Entry 4000.00, Exit 4010.00, 1 lot = $${esLongPnL}`);
// Expected: 10 pips * $50 * 1 lot - $7.5 commission = $492.5

console.log('\n');

// Test 2: R-Multiple Calculations
console.log('📈 Testing R-Multiple Calculations:');
console.log('====================================');

const rMultiple1 = calculateRMultiple(1.1000, 1.1050, 1.0950, 'long');
console.log(`R-Multiple: Entry 1.1000, Exit 1.1050, Stop 1.0950, Long = ${rMultiple1}`);
// Expected: (1.1050 - 1.1000) / (1.1000 - 1.0950) = 0.005 / 0.005 = 1.0

const rMultiple2 = calculateRMultiple(1.1000, 1.1025, 1.0950, 'long');
console.log(`R-Multiple: Entry 1.1000, Exit 1.1025, Stop 1.0950, Long = ${rMultiple2}`);
// Expected: (1.1025 - 1.1000) / (1.1000 - 1.0950) = 0.0025 / 0.005 = 0.5

const rMultiple3 = calculateRMultiple(1.1000, 1.1075, 1.0950, 'long');
console.log(`R-Multiple: Entry 1.1000, Exit 1.1075, Stop 1.0950, Long = ${rMultiple3}`);
// Expected: (1.1075 - 1.1000) / (1.1000 - 1.0950) = 0.0075 / 0.005 = 1.5

console.log('\n');

// Test 3: Lot Size Calculations
console.log('⚖️ Testing Lot Size Calculations:');
console.log('==================================');

const lotSize1 = calculateLotSize(500, 1.1000, 1.0950, 'EURUSD');
console.log(`Lot Size: Risk $500, Entry 1.1000, Stop 1.0950, EURUSD = ${lotSize1} lots`);
// Expected: $500 / (50 pips * $10 + $7.5) = $500 / $507.5 = 0.99 lots

const lotSize2 = calculateLotSize(250, 150.00, 149.50, 'USDJPY');
console.log(`Lot Size: Risk $250, Entry 150.00, Stop 149.50, USDJPY = ${lotSize2} lots`);
// Expected: $250 / (50 pips * $9 + $7.5) = $250 / $457.5 = 0.55 lots

console.log('\n');

// Test 4: Pip Value Configurations
console.log('💰 Testing Pip Value Configurations:');
console.log('=====================================');

const eurusdConfig = getPipValueConfig('EURUSD');
console.log(`EURUSD: pipValuePerLot=${eurusdConfig.pipValuePerLot}, pipMultiplier=${eurusdConfig.pipMultiplier}`);

const usdjpyConfig = getPipValueConfig('USDJPY');
console.log(`USDJPY: pipValuePerLot=${usdjpyConfig.pipValuePerLot}, pipMultiplier=${usdjpyConfig.pipMultiplier}`);

const goldConfig = getPipValueConfig('XAUUSD');
console.log(`Gold: pipValuePerLot=${goldConfig.pipValuePerLot}, pipMultiplier=${goldConfig.pipMultiplier}`);

const esConfig = getPipValueConfig('ES');
console.log(`ES: pipValuePerLot=${esConfig.pipValuePerLot}, pipMultiplier=${esConfig.pipMultiplier}`);

console.log('\n');

// Test 5: Trading Statistics
console.log('📊 Testing Trading Statistics:');
console.log('===============================');

const mockTrades = [
  { pnl: 500, r_multiple: 1.5 },
  { pnl: -300, r_multiple: -0.6 },
  { pnl: 750, r_multiple: 2.0 },
  { pnl: -250, r_multiple: -0.5 },
  { pnl: 400, r_multiple: 1.2 },
  { pnl: -400, r_multiple: -0.8 },
  { pnl: 600, r_multiple: 1.8 },
  { pnl: -200, r_multiple: -0.4 }
];

const winRate = calculateWinRate(mockTrades);
console.log(`Win Rate: ${winRate}%`);
// Expected: 5 wins out of 8 trades = 62.5%

const avgRMultiple = calculateAverageRMultiple(mockTrades);
console.log(`Average R-Multiple: ${avgRMultiple}`);
// Expected: (1.5 + -0.6 + 2.0 + -0.5 + 1.2 + -0.8 + 1.8 + -0.4) / 8 = 0.525

const profitFactor = calculateProfitFactor(mockTrades);
console.log(`Profit Factor: ${profitFactor}`);
// Expected: Gross Profit (2250) / Gross Loss (1150) = 1.957

const expectancy = calculateExpectancy(mockTrades);
console.log(`Expectancy: $${expectancy}`);
// Expected: Total P&L (1100) / Total Trades (8) = $137.5

console.log('\n');

// Test 6: Trade Parameter Validation
console.log('✅ Testing Trade Parameter Validation:');
console.log('=======================================');

const validParams = validateTradeParams(1.1000, 1.0950, 1.1050, 1.0);
console.log(`Valid Trade Params: ${validParams.isValid}, Errors: ${validParams.errors.join(', ')}`);

const invalidParams = validateTradeParams(0, 1.0950, 1.1050, 1.0);
console.log(`Invalid Trade Params: ${invalidParams.isValid}, Errors: ${invalidParams.errors.join(', ')}`);

const samePriceParams = validateTradeParams(1.1000, 1.1000, 1.1050, 1.0);
console.log(`Same Entry/Stop: ${samePriceParams.isValid}, Errors: ${samePriceParams.errors.join(', ')}`);

console.log('\n');

// Test 7: Edge Cases
console.log('🔍 Testing Edge Cases:');
console.log('======================');

// Zero prices
const zeroPricePnL = calculatePnL(0, 1.1050, 'long', 1.0, 'EURUSD');
console.log(`Zero Entry Price P&L: $${zeroPricePnL}`);
// Expected: 0

// Negative lot size
const negativeLotPnL = calculatePnL(1.1000, 1.1050, 'long', -1.0, 'EURUSD');
console.log(`Negative Lot Size P&L: $${negativeLotPnL}`);
// Expected: 0

// Zero stop distance
const zeroStopRMultiple = calculateRMultiple(1.1000, 1.1050, 1.1000, 'long');
console.log(`Zero Stop Distance R-Multiple: ${zeroStopRMultiple}`);
// Expected: 0

console.log('\n');

// Test 8: Commission Impact
console.log('💸 Testing Commission Impact:');
console.log('==============================');

const smallLotPnL = calculatePnL(1.1000, 1.1001, 'long', 0.1, 'EURUSD');
console.log(`Small Lot P&L (0.1 lot): $${smallLotPnL}`);
// Expected: 1 pip * $10 * 0.1 lot - $0.75 commission = $0.25

const largeLotPnL = calculatePnL(1.1000, 1.1050, 'long', 10.0, 'EURUSD');
console.log(`Large Lot P&L (10 lots): $${largeLotPnL}`);
// Expected: 50 pips * $10 * 10 lots - $75 commission = $4925

console.log('\n');

// Summary
console.log('✅ All Tests Completed!');
console.log('========================');
console.log('If you see expected values above, the calculations are working correctly.');
console.log('Any unexpected values indicate calculation errors that need fixing.');
