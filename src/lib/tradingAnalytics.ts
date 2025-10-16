import type { Database } from '@/integrations/supabase/types';
import { calculateWinRate, calculateAverageRMultiple, calculateProfitFactor, calculateExpectancy } from './tradingCalculations';

type Trade = Database['public']['Tables']['trades']['Row'];

export interface HourlyPerformance {
  hour: number;
  pnl: number;
  tradeCount: number;
  winRate: number;
  avgRMultiple: number;
}

export interface DailyPerformance {
  date: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
  wins: number;
  losses: number;
}

export interface WeeklyPerformance {
  week: string;
  pnl: number;
  tradeCount: number;
  tradingDays: number;
  winRate: number;
}

/**
 * Calculate best trading hours based on historical performance
 */
export function calculateBestHours(trades: Trade[]): HourlyPerformance[] {
  const closedTrades = trades.filter(trade => 
    trade.status === 'closed' && trade.entry_time
  );

  const hourlyData = new Map<number, {
    pnl: number;
    tradeCount: number;
    wins: number;
    rMultiples: number[];
  }>();

  // Initialize hourly data
  for (let hour = 0; hour < 24; hour++) {
    hourlyData.set(hour, {
      pnl: 0,
      tradeCount: 0,
      wins: 0,
      rMultiples: []
    });
  }

  // Process each trade
  closedTrades.forEach(trade => {
    // Use exit_time to track when the trade was actually closed, not when it was entered
    const tradeTime = trade.exit_time ? new Date(trade.exit_time) : new Date(trade.entry_time!);
    const hour = tradeTime.getHours();
    const data = hourlyData.get(hour)!;

    data.pnl += trade.pnl || 0;
    data.tradeCount++;
    if ((trade.pnl || 0) > 0) data.wins++;
    if (trade.r_multiple) data.rMultiples.push(trade.r_multiple);
  });

  // Convert to performance array, filter for profitable hours only, and sort by P&L
  return Array.from(hourlyData.entries())
    .map(([hour, data]) => ({
      hour,
      pnl: data.pnl,
      tradeCount: data.tradeCount,
      winRate: data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0,
      avgRMultiple: data.rMultiples.length > 0 
        ? data.rMultiples.reduce((sum, r) => sum + r, 0) / data.rMultiples.length 
        : 0
    }))
    .filter(h => h.tradeCount > 0 && h.pnl > 0) // Only show profitable hours
    .sort((a, b) => b.pnl - a.pnl);
}

/**
 * Calculate daily performance metrics
 */
export function calculateDailyPerformance(trades: Trade[]): DailyPerformance[] {
  const closedTrades = trades.filter(trade => 
    trade.status === 'closed' && trade.entry_time
  );

  const dailyData = new Map<string, {
    pnl: number;
    tradeCount: number;
    wins: number;
    losses: number;
  }>();

  closedTrades.forEach(trade => {
    const entryTime = new Date(trade.entry_time!);
    const dateKey = entryTime.toISOString().split('T')[0];
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        pnl: 0,
        tradeCount: 0,
        wins: 0,
        losses: 0
      });
    }

    const data = dailyData.get(dateKey)!;
    data.pnl += trade.pnl || 0;
    data.tradeCount++;
    
    if ((trade.pnl || 0) > 0) data.wins++;
    else if ((trade.pnl || 0) < 0) data.losses++;
  });

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      pnl: data.pnl,
      tradeCount: data.tradeCount,
      winRate: data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0,
      wins: data.wins,
      losses: data.losses
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculate weekly performance metrics
 */
export function calculateWeeklyPerformance(trades: Trade[]): WeeklyPerformance[] {
  const closedTrades = trades.filter(trade => 
    trade.status === 'closed' && trade.entry_time
  );

  const weeklyData = new Map<string, {
    pnl: number;
    tradeCount: number;
    tradingDays: Set<string>;
    wins: number;
  }>();

  closedTrades.forEach(trade => {
    const entryTime = new Date(trade.entry_time!);
    const weekStart = new Date(entryTime);
    weekStart.setDate(entryTime.getDate() - entryTime.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        pnl: 0,
        tradeCount: 0,
        tradingDays: new Set(),
        wins: 0
      });
    }

    const data = weeklyData.get(weekKey)!;
    const dateKey = entryTime.toISOString().split('T')[0];
    
    data.pnl += trade.pnl || 0;
    data.tradeCount++;
    data.tradingDays.add(dateKey);
    
    if ((trade.pnl || 0) > 0) data.wins++;
  });

  return Array.from(weeklyData.entries())
    .map(([week, data]) => ({
      week,
      pnl: data.pnl,
      tradeCount: data.tradeCount,
      tradingDays: data.tradingDays.size,
      winRate: data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0
    }))
    .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());
}

/**
 * Get trading statistics summary (using centralized calculation functions)
 */
export function getTradingStats(trades: Trade[]) {
  const closedTrades = trades.filter(trade => trade.status === 'closed');
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0).length;
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  // Use centralized calculation functions
  const winRate = calculateWinRate(closedTrades);
  const avgRMultiple = calculateAverageRMultiple(closedTrades);
  const profitFactor = calculateProfitFactor(closedTrades);
  const expectancy = calculateExpectancy(closedTrades);

  return {
    totalTrades,
    wins,
    losses,
    totalPnL,
    winRate,
    avgRMultiple,
    profitFactor,
    expectancy,
    bestHours: calculateBestHours(trades).slice(0, 5), // Top 5 hours
    dailyPerformance: calculateDailyPerformance(trades).slice(0, 30), // Last 30 days
    weeklyPerformance: calculateWeeklyPerformance(trades).slice(0, 12) // Last 12 weeks
  };
}
