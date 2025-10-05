/**
 * Centralized trading calculations library
 * Fixes all mathematical and logical errors in trading calculations
 */

export interface PipValueConfig {
  pipValuePerLot: number;
  pipMultiplier: number; // 100 for JPY pairs, 10000 for others
}

/**
 * Get pip value configuration for different asset types
 */
export function getPipValueConfig(asset: string): PipValueConfig {
  const upperAsset = asset.toUpperCase();
  
  // JPY pairs
  if (upperAsset.includes("JPY")) {
    return {
      pipValuePerLot: 9.0, // $9 per pip per lot for JPY pairs
      pipMultiplier: 0.01  // 1 pip = 0.01 for JPY pairs
    };
  }
  
  // Gold
  if (upperAsset.includes("XAU") || upperAsset.includes("GOLD")) {
    return {
      pipValuePerLot: 10.0, // $10 per pip per lot for Gold
      pipMultiplier: 0.1    // 1 pip = 0.1 for Gold
    };
  }
  
  // Indices (ES, NQ, etc.)
  if (upperAsset.includes("ES") || upperAsset.includes("NQ")) {
    return {
      pipValuePerLot: 50,   // $50 per pip per lot for indices
      pipMultiplier: 1      // 1 pip = 1 point for indices
    };
  }
  
  // Cryptocurrencies
  if (upperAsset.includes("BTC") || upperAsset.includes("ETH")) {
    return {
      pipValuePerLot: 1,    // $1 per pip per lot for crypto
      pipMultiplier: 1      // 1 pip = 1 unit for crypto
    };
  }
  
  // Major FX pairs (EURUSD, GBPUSD, etc.)
  return {
    pipValuePerLot: 10.0,   // $10 per pip per lot for major FX
    pipMultiplier: 0.0001   // 1 pip = 0.0001 for major FX
  };
}

/**
 * Calculate pip difference between two prices (always returns positive value for display)
 */
export function calculatePips(entryPrice: number, exitPrice: number, asset: string): number {
  const { pipMultiplier } = getPipValueConfig(asset);
  return Math.abs(exitPrice - entryPrice) / pipMultiplier;
}

/**
 * Calculate directional pip difference for risk/reward calculations
 * Returns positive values for both risk and reward pips
 */
export function calculateDirectionalPips(
  entryPrice: number, 
  stopLoss: number, 
  targetPrice: number, 
  direction: 'long' | 'short',
  asset: string
): { riskPips: number; rewardPips: number } {
  const { pipMultiplier } = getPipValueConfig(asset);
  
  if (direction === 'long') {
    // Long: risk = entry - stop, reward = target - entry
    const riskPips = (entryPrice - stopLoss) / pipMultiplier;
    const rewardPips = (targetPrice - entryPrice) / pipMultiplier;
    return {
      riskPips: Math.abs(riskPips),
      rewardPips: Math.abs(rewardPips)
    };
  } else {
    // Short: risk = stop - entry, reward = entry - target
    const riskPips = (stopLoss - entryPrice) / pipMultiplier;
    const rewardPips = (entryPrice - targetPrice) / pipMultiplier;
    return {
      riskPips: Math.abs(riskPips),
      rewardPips: Math.abs(rewardPips)
    };
  }
}

/**
 * Calculate P&L for a trade (FIXED LOGIC)
 */
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  direction: 'long' | 'short',
  lotSize: number,
  asset: string,
  commissionPerLot: number = 7.5
): number {
  if (entryPrice <= 0 || exitPrice <= 0 || lotSize <= 0) {
    return 0;
  }

  // Calculate pips from price difference based on direction
  const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);
  
  let pips: number;
  if (direction === 'long') {
    // Long: profit when exit > entry
    pips = (exitPrice - entryPrice) / pipMultiplier;
  } else {
    // Short: profit when exit < entry
    pips = (entryPrice - exitPrice) / pipMultiplier;
  }

  // Calculate gross P&L: pips * pip value * lot size
  const grossPnL = pips * pipValuePerLot * lotSize;

  // Calculate commission
  const commission = lotSize * commissionPerLot;

  // Net P&L after commission
  const netPnL = grossPnL - commission;

  return Number(netPnL.toFixed(2));
}

/**
 * Calculate R-Multiple (CORRECTED LOGIC)
 * R-Multiple = P&L / Risk Amount
 */
export function calculateRMultiple(
  pnl: number,
  riskAmount: number
): number {
  if (riskAmount <= 0) {
    return 0;
  }

  // R-Multiple = P&L / Risk Amount
  return Number((pnl / riskAmount).toFixed(3));
}

/**
 * Calculate R-Multiple from price data (DEPRECATED - use calculateRMultiple with P&L instead)
 */
export function calculateRMultipleFromPrice(
  entryPrice: number,
  exitPrice: number,
  stopLoss: number,
  direction: 'long' | 'short'
): number {
  if (entryPrice <= 0 || stopLoss <= 0) {
    return 0;
  }

  // Calculate stop distance in price units
  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (stopDistance === 0) {
    return 0;
  }

  // Calculate price difference based on direction
  const priceDiff = direction === 'long' 
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  // R-Multiple = Price difference / Stop distance (OLD METHOD)
  return Number((priceDiff / stopDistance).toFixed(3));
}

/**
 * Calculate lot size based on risk amount and stop distance
 */
export function calculateLotSize(
  riskAmount: number,
  entryPrice: number,
  stopLoss: number,
  asset: string,
  commissionPerLot: number = 7.5
): number {
  if (riskAmount <= 0 || entryPrice <= 0 || stopLoss <= 0) {
    return 1.0;
  }

  const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);
  
  // Calculate stop distance in pips
  const stopDistancePips = Math.abs(entryPrice - stopLoss) / pipMultiplier;
  
  if (stopDistancePips === 0) {
    return 1.0;
  }

  // Calculate lot size: risk amount / (stop distance in pips * pip value per lot)
  const lotSize = riskAmount / (stopDistancePips * pipValuePerLot);
  
  // Round to nearest 0.01 and ensure minimum of 0.01
  return Math.max(0.01, Math.round(lotSize * 100) / 100);
}

/**
 * Validate trade direction logic
 */
export function validateTradeDirection(
  entryPrice: number,
  stopLoss: number,
  targetPrice: number,
  direction: 'long' | 'short'
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (direction === 'long') {
    if (stopLoss >= entryPrice) {
      errors.push('For LONG trades: Stop loss must be below entry price');
    }
    if (targetPrice <= entryPrice) {
      errors.push('For LONG trades: Target must be above entry price');
    }
  } else {
    if (stopLoss <= entryPrice) {
      errors.push('For SHORT trades: Stop loss must be above entry price');
    }
    if (targetPrice >= entryPrice) {
      errors.push('For SHORT trades: Target must be below entry price');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate estimated profit for a target price using directional logic
 */
export function calculateEstimatedProfit(
  entryPrice: number,
  targetPrice: number,
  lotSize: number,
  direction: 'long' | 'short',
  asset: string,
  commissionPerLot: number = 7.5
): number {
  if (entryPrice <= 0 || targetPrice <= 0 || lotSize <= 0) {
    return 0;
  }

  const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);
  
  let pips: number;
  if (direction === 'long') {
    // Long: profit when target > entry
    pips = (targetPrice - entryPrice) / pipMultiplier;
  } else {
    // Short: profit when target < entry
    pips = (entryPrice - targetPrice) / pipMultiplier;
  }

  // Calculate gross profit: pips * pip value * lot size
  const grossProfit = pips * pipValuePerLot * lotSize;

  // Calculate commission
  const commission = lotSize * commissionPerLot;

  // Net profit after commission
  return grossProfit - commission;
}

/**
 * Calculate estimated profit for a target price (LEGACY - use calculateEstimatedProfit instead)
 */
export function calculateEstimatedProfitLegacy(
  entryPrice: number,
  targetPrice: number,
  direction: 'long' | 'short',
  lotSize: number,
  asset: string,
  commissionPerLot: number = 7.5
): number {
  return calculatePnL(entryPrice, targetPrice, direction, lotSize, asset, commissionPerLot);
}

/**
 * Calculate estimated loss for stop loss
 */
export function calculateEstimatedLoss(
  entryPrice: number,
  stopLoss: number,
  direction: 'long' | 'short',
  lotSize: number,
  asset: string,
  commissionPerLot: number = 7.5
): number {
  return calculatePnL(entryPrice, stopLoss, direction, lotSize, asset, commissionPerLot);
}

/**
 * Validate trade parameters
 */
export function validateTradeParams(
  entryPrice: number,
  stopLoss: number,
  targetPrice?: number,
  lotSize: number = 1.0
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (entryPrice <= 0) {
    errors.push("Entry price must be greater than 0");
  }

  if (stopLoss <= 0) {
    errors.push("Stop loss must be greater than 0");
  }

  if (lotSize <= 0) {
    errors.push("Lot size must be greater than 0");
  }

  if (targetPrice !== undefined && targetPrice <= 0) {
    errors.push("Target price must be greater than 0");
  }

  if (entryPrice === stopLoss) {
    errors.push("Entry price cannot equal stop loss");
  }

  if (targetPrice !== undefined && entryPrice === targetPrice) {
    errors.push("Entry price cannot equal target price");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format price for display based on asset type
 */
export function formatPrice(price: number, asset: string): string {
  const upperAsset = asset.toUpperCase();
  
  if (upperAsset.includes("JPY")) {
    return price.toFixed(3);
  }
  
  if (upperAsset.includes("XAU") || upperAsset.includes("GOLD")) {
    return price.toFixed(2);
  }
  
  if (upperAsset.includes("ES") || upperAsset.includes("NQ")) {
    return price.toFixed(2);
  }
  
  if (upperAsset.includes("BTC") || upperAsset.includes("ETH")) {
    return price.toFixed(2);
  }
  
  // Major FX pairs
  return price.toFixed(5);
}

/**
 * Calculate win rate from trades
 */
export function calculateWinRate(trades: Array<{ pnl?: number | null }>): number {
  if (trades.length === 0) return 0;
  
  const wins = trades.filter(trade => (trade.pnl || 0) > 0).length;
  return Number(((wins / trades.length) * 100).toFixed(2));
}

/**
 * Calculate average R-Multiple from trades
 */
export function calculateAverageRMultiple(trades: Array<{ r_multiple?: number | null }>): number {
  const validRMultiples = trades
    .map(trade => trade.r_multiple)
    .filter(r => r !== null && r !== undefined) as number[];
  
  if (validRMultiples.length === 0) return 0;
  
  const sum = validRMultiples.reduce((acc, r) => acc + r, 0);
  return Number((sum / validRMultiples.length).toFixed(3));
}

/**
 * Calculate profit factor
 */
export function calculateProfitFactor(trades: Array<{ pnl?: number | null }>): number {
  const grossProfit = trades
    .filter(trade => (trade.pnl || 0) > 0)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  
  const grossLoss = Math.abs(trades
    .filter(trade => (trade.pnl || 0) < 0)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0));
  
  return grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(3)) : 0;
}

/**
 * Calculate expectancy
 */
export function calculateExpectancy(trades: Array<{ pnl?: number | null }>): number {
  if (trades.length === 0) return 0;
  
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  return Number((totalPnL / trades.length).toFixed(2));
}
