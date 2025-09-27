import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

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
      console.error('Error fetching trades:', error);
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

  const openTrades = trades.filter(trade => trade.status === 'open');
  const closedTrades = trades.filter(trade => trade.status === 'closed');

  // Check daily losses for stop rule
  const today = new Date().toISOString().split('T')[0];
  const todayClosedTrades = closedTrades.filter(trade => 
    trade.exit_time && trade.exit_time.startsWith(today)
  );
  const dailyLosses = todayClosedTrades.filter(trade => 
    trade.pnl && trade.pnl < 0
  ).length;

  const canAddTrade = dailyLosses < 3;

  const addTrade = async (tradeData: Omit<TradeInsert, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.from('trades').insert({
      ...tradeData,
      user_id: user.id
    });

    if (error) throw error;
  };

  const updateTrade = async (id: string, updates: TradeUpdate) => {
    const { error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const closeTrade = async (id: string, exitPrice: number, exitTime?: Date) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) throw new Error('Trade not found');

    // Calculate PnL and R multiple
    const priceDiff = trade.direction === 'long' 
      ? exitPrice - trade.entry_price
      : trade.entry_price - exitPrice;
    
    const pnl = (priceDiff / trade.entry_price) * trade.risk_amount;
    
    const stopDistance = Math.abs(trade.entry_price - trade.stop_loss);
    const rMultiple = stopDistance > 0 ? priceDiff / stopDistance : 0;

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
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (error) throw error;
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