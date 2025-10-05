#!/usr/bin/env node

/**
 * Test trading calculations to verify they match expected results
 */

import { getPipValueConfig, calculatePips, calculateDirectionalPips, calculateLotSize, calculatePnL, calculateEstimatedProfit, validateTradeDirection } from './src/lib/tradingCalculations.js';

console.log('🧪 Testing Trading Calculations\n');

// Test cases
const testCases = [
  {
    name: 'EURUSD (Major FX)',
    asset: 'EURUSD',
    entry: 1.17474,
    stop: 1.17400,
    target: 1.17500,
    risk: 500,
    expected: {
      pipSize: 0.0001,
      pipValuePerLot: 10,
      stopPips: 7.4,
      targetPips: 2.6,
      lotSize: 6.76,
      expectedProfit: 175.76,
      rMultiple: 0.35
    }
  },
  {
    name: 'USDJPY (JPY Pair)',
    asset: 'USDJPY',
    entry: 150.00,
    stop: 149.50,
    target: 150.50,
    risk: 500,
    expected: {
      pipSize: 0.01,
      pipValuePerLot: 9,
      stopPips: 50,
      targetPips: 50,
      lotSize: 1.11,
      expectedProfit: 500,
      rMultiple: 1.0
    }
  },
  {
    name: 'XAUUSD (Gold)',
    asset: 'XAUUSD',
    entry: 2000.00,
    stop: 1995.00,
    target: 2005.00,
    risk: 500,
    expected: {
      pipSize: 0.1,
      pipValuePerLot: 10,
      stopPips: 50,
      targetPips: 50,
      lotSize: 1.0,
      expectedProfit: 500,
      rMultiple: 1.0
    }
  },
  {
    name: 'BTCUSD (Crypto)',
    asset: 'BTCUSD',
    entry: 50000,
    stop: 49500,
    target: 50500,
    risk: 500,
    expected: {
      pipSize: 1,
      pipValuePerLot: 1,
      stopPips: 500,
      targetPips: 500,
      lotSize: 1.0,
      expectedProfit: 500,
      rMultiple: 1.0
    }
  }
];

function runTests() {
  let passed = 0;
  let total = 0;

  testCases.forEach(test => {
    console.log(`📊 Testing ${test.name}`);
    console.log(`   Entry: ${test.entry}, Stop: ${test.stop}, Target: ${test.target}, Risk: $${test.risk}`);
    
    // Test pip configuration
    const config = getPipValueConfig(test.asset);
    total++;
    if (Math.abs(config.pipMultiplier - test.expected.pipSize) < 0.0001 && 
        Math.abs(config.pipValuePerLot - test.expected.pipValuePerLot) < 0.1) {
      console.log(`   ✅ Pip config: ${config.pipMultiplier} size, $${config.pipValuePerLot} value`);
      passed++;
    } else {
      console.log(`   ❌ Pip config: Expected ${test.expected.pipSize}/${test.expected.pipValuePerLot}, got ${config.pipMultiplier}/${config.pipValuePerLot}`);
    }

    // Test stop distance in pips
    const stopPips = calculatePips(test.entry, test.stop, test.asset);
    total++;
    if (Math.abs(stopPips - test.expected.stopPips) < 0.1) {
      console.log(`   ✅ Stop distance: ${stopPips.toFixed(1)} pips`);
      passed++;
    } else {
      console.log(`   ❌ Stop distance: Expected ${test.expected.stopPips}, got ${stopPips.toFixed(1)}`);
    }

    // Test target distance in pips
    const targetPips = calculatePips(test.entry, test.target, test.asset);
    total++;
    if (Math.abs(targetPips - test.expected.targetPips) < 0.1) {
      console.log(`   ✅ Target distance: ${targetPips.toFixed(1)} pips`);
      passed++;
    } else {
      console.log(`   ❌ Target distance: Expected ${test.expected.targetPips}, got ${targetPips.toFixed(1)}`);
    }

    // Test lot size calculation
    const lotSize = calculateLotSize(test.risk, test.entry, test.stop, test.asset);
    total++;
    if (Math.abs(lotSize - test.expected.lotSize) < 0.1) {
      console.log(`   ✅ Lot size: ${lotSize.toFixed(2)} lots`);
      passed++;
    } else {
      console.log(`   ❌ Lot size: Expected ${test.expected.lotSize}, got ${lotSize.toFixed(2)}`);
    }

    // Test profit calculation
    const profit = calculatePnL(test.entry, test.target, 'long', lotSize, test.asset);
    total++;
    if (Math.abs(profit - test.expected.expectedProfit) < 10) {
      console.log(`   ✅ Expected profit: $${profit.toFixed(2)}`);
      passed++;
    } else {
      console.log(`   ❌ Expected profit: Expected $${test.expected.expectedProfit}, got $${profit.toFixed(2)}`);
    }

    // Test R multiple
    const rMultiple = profit / test.risk;
    total++;
    if (Math.abs(rMultiple - test.expected.rMultiple) < 0.1) {
      console.log(`   ✅ R Multiple: ${rMultiple.toFixed(2)}R`);
      passed++;
    } else {
      console.log(`   ❌ R Multiple: Expected ${test.expected.rMultiple}, got ${rMultiple.toFixed(2)}`);
    }

    console.log('');
  });

  // Test directional logic
  console.log('🔄 Testing Directional Logic');
  
  // Test LONG trade
  const longTest = calculateDirectionalPips(1.17474, 1.17400, 1.17500, 'long', 'EURUSD');
  total += 2;
  if (Math.abs(longTest.riskPips - 7.4) < 0.1) {
    console.log('   ✅ LONG risk pips: 7.4');
    passed++;
  } else {
    console.log(`   ❌ LONG risk pips: Expected 7.4, got ${longTest.riskPips.toFixed(1)}`);
  }
  
  if (Math.abs(longTest.rewardPips - 2.6) < 0.1) {
    console.log('   ✅ LONG reward pips: 2.6');
    passed++;
  } else {
    console.log(`   ❌ LONG reward pips: Expected 2.6, got ${longTest.rewardPips.toFixed(1)}`);
  }

  // Test SHORT trade
  const shortTest = calculateDirectionalPips(1.17400, 1.17474, 1.17300, 'short', 'EURUSD');
  total += 2;
  if (Math.abs(shortTest.riskPips - 7.4) < 0.1) {
    console.log('   ✅ SHORT risk pips: 7.4');
    passed++;
  } else {
    console.log(`   ❌ SHORT risk pips: Expected 7.4, got ${shortTest.riskPips.toFixed(1)}`);
  }
  
  if (Math.abs(shortTest.rewardPips - 10.0) < 0.1) {
    console.log('   ✅ SHORT reward pips: 10.0');
    passed++;
  } else {
    console.log(`   ❌ SHORT reward pips: Expected 10.0, got ${shortTest.rewardPips.toFixed(1)}`);
  }

  // Test validation
  const longValidation = validateTradeDirection(1.17474, 1.17400, 1.17500, 'long');
  const shortValidation = validateTradeDirection(1.17400, 1.17474, 1.17300, 'short');
  const invalidLong = validateTradeDirection(1.17474, 1.17500, 1.17400, 'long'); // Wrong direction
  
  total += 3;
  if (longValidation.isValid) {
    console.log('   ✅ LONG validation: Valid');
    passed++;
  } else {
    console.log('   ❌ LONG validation: Should be valid');
  }
  
  if (shortValidation.isValid) {
    console.log('   ✅ SHORT validation: Valid');
    passed++;
  } else {
    console.log('   ❌ SHORT validation: Should be valid');
  }
  
  if (!invalidLong.isValid) {
    console.log('   ✅ Invalid LONG validation: Correctly invalid');
    passed++;
  } else {
    console.log('   ❌ Invalid LONG validation: Should be invalid');
  }

  console.log(`\n📈 Test Results: ${passed}/${total} tests passed`);
  if (passed === total) {
    console.log('🎉 All calculations are working correctly!');
  } else {
    console.log('⚠️  Some calculations need fixing.');
  }
}

runTests();
