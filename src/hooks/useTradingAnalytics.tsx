import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Trade = Database['public']['Tables']['trades']['Row'];

export interface HourlyPerformance {
  hour_of_day: number;
  total_pnl: number;
  trade_count: number;
  win_rate: number;
  avg_r_multiple: number;
}

export interface WeeklyPerformance {
  week_start: string;
  week_end: string;
  total_pnl: number;
  trade_count: number;
  trading_days: number;
  win_rate: number;
  avg_r_multiple: number;
}

export interface DailyPerformance {
  trade_date: string;
  total_pnl: number;
  trade_count: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_r_multiple: number;
}

export interface TradingAnalytics {
  bestHours: HourlyPerformance[];
  weeklySummary: WeeklyPerformance[];
  dailyPerformance: DailyPerformance[];
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
}

export function useTradingAnalytics(days: number = 30): TradingAnalytics {
  const { user } = useAuth();
  const [bestHours, setBestHours] = useState<HourlyPerformance[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyPerformance[]>([]);
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBestHours = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_best_trading_hours', {
        p_user_id: user.id,
        p_days: days
      });

      if (error) throw error;
      setBestHours(data || []);
    } catch (err) {
      logger.error('Error fetching best hours:', err);
      setError('Failed to fetch best trading hours');
    }
  }, [user, days]);

  const fetchWeeklySummary = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_weekly_summary', {
        p_user_id: user.id,
        p_weeks: Math.ceil(days / 7)
      });

      if (error) throw error;
      setWeeklySummary(data || []);
    } catch (err) {
      logger.error('Error fetching weekly summary:', err);
      setError('Failed to fetch weekly summary');
    }
  }, [user, days]);

  const fetchDailyPerformance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_daily_performance', {
        p_user_id: user.id,
        p_days: days
      });

      if (error) throw error;
      setDailyPerformance(data || []);
    } catch (err) {
      logger.error('Error fetching daily performance:', err);
      setError('Failed to fetch daily performance');
    }
  }, [user, days]);

  const refreshAnalytics = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchBestHours(),
        fetchWeeklySummary(),
        fetchDailyPerformance()
      ]);
    } catch (err) {
      logger.error('Error refreshing analytics:', err);
      setError('Failed to refresh analytics');
    } finally {
      setLoading(false);
    }
  }, [user, fetchBestHours, fetchWeeklySummary, fetchDailyPerformance]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  return {
    bestHours,
    weeklySummary,
    dailyPerformance,
    loading,
    error,
    refreshAnalytics
  };
}
