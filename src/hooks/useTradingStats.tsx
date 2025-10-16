import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Trade = Database['public']['Tables']['trades']['Row'];

export interface TodayPerformance {
  total_trades: number;
  wins: number;
  losses: number;
  total_pnl: number;
  total_r_multiple: number;
  win_rate: number;
}

export interface ModelPerformance {
  model: string;
  total_trades: number;
  wins: number;
  losses: number;
  total_pnl: number;
  win_rate: number;
  avg_r_multiple: number;
}

export interface TradingStats {
  todayPerformance: TodayPerformance | null;
  modelPerformance: ModelPerformance[];
  dailyLosses: number;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function useTradingStats(): TradingStats {
  const { user } = useAuth();
  const [todayPerformance, setTodayPerformance] = useState<TodayPerformance | null>(null);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [dailyLosses, setDailyLosses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayPerformance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_today_performance', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      const result = data?.[0];
      if (result) {
        setTodayPerformance({
          total_trades: Number(result.total_trades),
          wins: Number(result.wins),
          losses: Number(result.losses),
          total_pnl: Number(result.total_pnl),
          total_r_multiple: Number(result.total_r_multiple),
          win_rate: Number(result.win_rate)
        });
      } else {
        setTodayPerformance({
          total_trades: 0,
          wins: 0,
          losses: 0,
          total_pnl: 0,
          total_r_multiple: 0,
          win_rate: 0
        });
      }
    } catch (err) {
      logger.error('Error fetching today performance:', err);
      setError('Failed to fetch today performance');
    }
  }, [user]);

  const fetchModelPerformance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_model_performance', {
        p_user_id: user.id,
        p_days: 30
      });

      if (error) throw error;
      
      const results = data || [];
      setModelPerformance(results.map((item: any) => ({
        model: item.model,
        total_trades: Number(item.total_trades),
        wins: Number(item.wins),
        losses: Number(item.losses),
        total_pnl: Number(item.total_pnl),
        win_rate: Number(item.win_rate),
        avg_r_multiple: Number(item.avg_r_multiple)
      })));
    } catch (err) {
      logger.error('Error fetching model performance:', err);
      setError('Failed to fetch model performance');
    }
  }, [user]);

  const fetchDailyLosses = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_daily_losses', {
        p_user_id: user.id
      });

      if (error) throw error;
      setDailyLosses(data || 0);
    } catch (err) {
      logger.error('Error fetching daily losses:', err);
      setError('Failed to fetch daily losses');
    }
  }, [user]);

  const refreshStats = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchTodayPerformance(),
        fetchModelPerformance(),
        fetchDailyLosses()
      ]);
    } catch (err) {
      logger.error('Error refreshing stats:', err);
      setError('Failed to refresh stats');
    } finally {
      setLoading(false);
    }
  }, [user, fetchTodayPerformance, fetchModelPerformance, fetchDailyLosses]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    todayPerformance,
    modelPerformance,
    dailyLosses,
    loading,
    error,
    refreshStats
  };
}
