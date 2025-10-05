import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { getPipValueConfig } from '@/lib/tradingCalculations';

type Trade = Database['public']['Tables']['trades']['Row'];
type TradeInsert = Database['public']['Tables']['trades']['Insert'];
type TradeUpdate = Database['public']['Tables']['trades']['Update'];

interface UseTradesReturn {
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
}

export function useTrades(): UseTradesReturn {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching trades:', error);
    } else {
      setTrades(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'open' || trade.status === null || !trade.status),
    [trades]
  );
  
  const closedTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'closed'),
    [trades]
  );

  // Check daily losses for stop rule
  const today = new Date().toISOString().split('T')[0];
  const todayClosedTrades = closedTrades.filter(trade => 
    trade.exit_time && trade.exit_time.startsWith(today)
  );
  const dailyLosses = todayClosedTrades.filter(trade => 
    trade.pnl && trade.pnl < 0
  ).length;

  const canAddTrade = dailyLosses < 3; // This will be updated to use settings

  const addTrade = async (tradeData: Omit<TradeInsert, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('trades').insert({
      ...tradeData,
      user_id: user.id,
      status: 'open'  // Explicitly set status to open
    }).select();

    if (error) {
      logger.error('Error inserting trade:', error);
      throw error;
    }
    
    // Refresh trades to show the new trade immediately
    await fetchTrades();
  };

  const updateTrade = async (id: string, updates: TradeUpdate) => {
    const { error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    
    // Refresh trades if status is being updated
    if (updates.status) {
      await fetchTrades();
    }
  };

  const closeTrade = async (id: string, exitPrice: number, exitTime?: Date, additionalProfit = 0) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) throw new Error('Trade not found');

    // Calculate PnL using real broker method
    const priceDiff = trade.direction === 'long' 
      ? exitPrice - trade.entry_price
      : trade.entry_price - exitPrice;
    
    // Calculate PnL using fixed calculation logic
    const lotSize = (trade as any).lot_size || 1.0;
    const asset = trade.asset || 'EURUSD';
    
    // Get pip configuration for asset
    const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);

    // Calculate pips from price difference (CORRECT FORMULA)
    const pips = Math.abs(priceDiff) / pipMultiplier;

    // Calculate gross profit: pips * pip value * lot size
    const grossProfit = pips * pipValuePerLot * lotSize;
    
    // Calculate commission (typically $7.5 per lot)
    const commission = lotSize * 7.5;
    
    // Net PnL after commission
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
    
    // Refresh trades to show the trade immediately in closed trades
    await fetchTrades();
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  const clearAllTrades = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Refresh the trades list
      await fetchTrades();
    } catch (error) {
      logger.error('Error clearing trades:', error);
      throw error;
    }
  };

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
    refreshTrades: fetchTrades
  };
}