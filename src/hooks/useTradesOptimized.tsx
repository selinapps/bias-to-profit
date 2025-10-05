import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { getPipValueConfig } from '@/lib/tradingCalculations';

type Trade = Database['public']['Tables']['trades']['Row'];
type TradeInsert = Database['public']['Tables']['trades']['Insert'];
type TradeUpdate = Database['public']['Tables']['trades']['Update'];

interface UseTradesOptimizedReturn {
  trades: Trade[];
  openTrades: Trade[];
  closedTrades: Trade[];
  loading: boolean;
  addTrade: (trade: Omit<TradeInsert, 'user_id'>) => Promise<void>;
  updateTrade: (id: string, updates: TradeUpdate) => Promise<void>;
  closeTrade: (id: string, exitPrice: number, exitTime?: Date) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  canAddTrade: boolean;
  dailyLosses: number;
  refreshTrades: () => Promise<void>;
  // New optimized methods
  getTradeStats: () => Promise<any>;
  getDailyLosses: () => Promise<number>;
}

// Cache for trades data
const tradesCache = new Map<string, { data: Trade[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useTradesOptimized(): UseTradesOptimizedReturn {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyLosses, setDailyLosses] = useState(0);
  const lastFetchRef = useRef<number>(0);
  const realtimeChannelRef = useRef<any>(null);

  // Memoized calculations
  const openTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'open' || trade.status === null || !trade.status),
    [trades]
  );
  
  const closedTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'closed'),
    [trades]
  );

  const canAddTrade = useMemo(() => {
    // Use settings to determine if trading is allowed
    if (!settings.enableStopRule) return true; // If stop rule is disabled, always allow trading
    
    // Check if daily losses exceed the limit
    return dailyLosses < settings.maxDailyLosses;
  }, [dailyLosses, settings.enableStopRule, settings.maxDailyLosses]);

  // Optimized fetch trades with caching
  const fetchTrades = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    const cacheKey = user.id;
    const now = Date.now();
    const cached = tradesCache.get(cacheKey);

    // Use cache if available and not expired
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      setTrades(cached.data);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false });

      if (error) {
        logger.error('Error fetching trades:', error);
        throw error;
      }

      const tradesData = data || [];
      setTrades(tradesData);
      
      // Update cache
      tradesCache.set(cacheKey, { data: tradesData, timestamp: now });
      
      // Calculate daily losses efficiently after trades are set
      // We'll do this in a separate useEffect to avoid circular dependency
      
    } catch (error) {
      logger.error('Error in fetchTrades:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Optimized daily losses calculation using database function
  const calculateDailyLosses = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_daily_losses', {
        p_user_id: user.id,
        p_date: new Date().toISOString().split('T')[0]
      });

      if (error) {
        logger.error('Error calculating daily losses:', error);
        // Fallback to client-side calculation - FIXED: use entry_time
        const today = new Date().toISOString().split('T')[0];
        const todayClosedTrades = closedTrades.filter(trade => 
          trade.entry_time && trade.entry_time.startsWith(today)
        );
        const losses = todayClosedTrades.filter(trade => 
          trade.pnl && trade.pnl < 0
        ).length;
        setDailyLosses(losses);
      } else {
        setDailyLosses(data || 0);
      }
    } catch (error) {
      logger.error('Error in calculateDailyLosses:', error);
    }
  }, [user, closedTrades]);

  // Calculate daily losses when trades change (separate from fetchTrades to avoid circular dependency)
  useEffect(() => {
    if (trades.length > 0) {
      calculateDailyLosses();
    }
  }, [trades, calculateDailyLosses]);

  // Get trade statistics using optimized database function
  const getTradeStats = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_user_trade_stats', {
        p_user_id: user.id,
        p_days: 30
      });

      if (error) {
        logger.error('Error fetching trade stats:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      logger.error('Error in getTradeStats:', error);
      return null;
    }
  }, [user]);

  // Get daily performance metrics using secure view
  const getDailyPerformanceMetrics = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('secure_daily_performance_metrics')
        .select('*')
        .order('trade_date', { ascending: false })
        .limit(30);

      if (error) {
        logger.error('Error fetching daily performance metrics:', error);
        return null;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getDailyPerformanceMetrics:', error);
      return null;
    }
  }, [user]);

  // Get daily losses using database function
  const getDailyLosses = useCallback(async () => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase.rpc('get_daily_losses', {
        p_user_id: user.id,
        p_date: new Date().toISOString().split('T')[0]
      });

      if (error) {
        logger.error('Error getting daily losses:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      logger.error('Error in getDailyLosses:', error);
      return 0;
    }
  }, [user]);

  // Optimized real-time updates with debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleRealtimeUpdate = useCallback((payload: any) => {
    logger.debug('Realtime update received:', payload);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce real-time updates to prevent excessive fetching
    debounceTimeoutRef.current = setTimeout(() => {
      logger.debug('Fetching trades after realtime update...');
      fetchTrades(true); // Force refresh on real-time updates
    }, 500);
  }, [fetchTrades]);

  // Initial data fetch
  useEffect(() => {
    fetchTrades();
  }, [user, fetchTrades]);

  // Optimized real-time subscription
  useEffect(() => {
    if (!user) return;

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel('trades-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        handleRealtimeUpdate
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Remove realtime channel
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user, handleRealtimeUpdate]);

  // Optimized trade operations
  const addTrade = useCallback(async (tradeData: Omit<TradeInsert, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('trades').insert({
      ...tradeData,
      user_id: user.id,
      status: 'open'
    }).select();

    if (error) {
      logger.error('Error inserting trade:', error);
      throw error;
    }

    // Force refresh trades data immediately
    await fetchTrades(true);
    // Daily losses will be calculated automatically in the useEffect
  }, [user, fetchTrades]);

  const updateTrade = useCallback(async (id: string, updates: TradeUpdate) => {
    const { error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Optimistic update
    setTrades(prev => prev.map(trade => 
      trade.id === id ? { ...trade, ...updates } : trade
    ));

    // Clear cache if status is being updated
    if (updates.status && user) {
      tradesCache.delete(user.id);
      await calculateDailyLosses();
    }
  }, [user, calculateDailyLosses]);

  const closeTrade = useCallback(async (id: string, exitPrice: number, exitTime?: Date, additionalProfit = 0) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) throw new Error('Trade not found');

    // Calculate PnL using fixed calculation logic
    const lotSize = (trade as any).lot_size || 1.0;
    const asset = trade.asset || 'EURUSD';
    
    // Calculate price difference based on direction
    const priceDiff = trade.direction === 'long' 
      ? exitPrice - trade.entry_price
      : trade.entry_price - exitPrice;
    
    // Get pip configuration for asset
    const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);

    // Calculate pips from price difference (CORRECT FORMULA)
    const pips = Math.abs(priceDiff) / pipMultiplier;

    // Calculate gross P&L: pips * pip value * lot size
    const grossProfit = pips * pipValuePerLot * lotSize;
    
    // Calculate commission
    const commission = lotSize * 7.5;
    
    // Net P&L after commission
    const pnl = grossProfit - commission;
    
    // Calculate R-Multiple using CORRECT logic: P&L / Risk Amount
    const riskAmount = (trade as any).risk_amount || 500; // Default to $500 if not set
    const rMultiple = riskAmount > 0 ? Number((pnl / riskAmount).toFixed(3)) : 0;

    const exitTimeToUse = exitTime || new Date();
    const durationMinutes = Math.round(
      (exitTimeToUse.getTime() - new Date(trade.entry_time).getTime()) / (1000 * 60)
    );

    const { error } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        exit_time: exitTimeToUse.toISOString(),
        pnl: Number(pnl.toFixed(2)),
        r_multiple: Number(rMultiple.toFixed(3)),
        duration_minutes: durationMinutes
      })
      .eq('id', id);

    if (error) throw error;

    // Optimistic update
    setTrades(prev => prev.map(t => 
      t.id === id ? {
        ...t,
        status: 'closed',
        exit_price: exitPrice,
        exit_time: exitTimeToUse.toISOString(),
        pnl: Number(pnl.toFixed(2)),
        r_multiple: Number(rMultiple.toFixed(3)),
        duration_minutes: durationMinutes
      } : t
    ));

    // Clear cache - daily losses will be recalculated automatically
    if (user) {
      tradesCache.delete(user.id);
    }
  }, [trades, user]);

  const deleteTrade = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Optimistic update
    setTrades(prev => prev.filter(trade => trade.id !== id));
    
    // Clear cache
    if (user) {
      tradesCache.delete(user.id);
    }
  }, [user]);

  return {
    trades,
    openTrades,
    closedTrades,
    loading,
    addTrade,
    updateTrade,
    closeTrade,
    deleteTrade,
    canAddTrade,
    dailyLosses,
    refreshTrades: () => fetchTrades(true),
    getTradeStats,
    getDailyLosses,
    getDailyPerformanceMetrics
  };
}
