import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { logger } from '@/lib/logger';

// Type definitions for RPC return values
interface ObservationSummary {
  total_observations: number;
  trades_observed: number;
  avg_r_moved: number;
  continuations: number;
  reversals: number;
  consolidations: number;
  post_stop_count: number;
  post_target_count: number;
}

interface ContinuationBySetup {
  setup_name: string;
  target_hit_trades: number;
  continuations: number;
  continuation_rate: number;
  avg_extra_r: number;
  total_missed_r: number;
}

interface ReversalAfterStopBySetup {
  setup_name: string;
  stopped_trades: number;
  reversals: number;
  reversal_rate: number;
  avg_r_saved: number;
  stop_quality_score: number;
}

interface OptimalObservationWindow {
  observation_time: string;
  observation_count: number;
  avg_r_moved: number;
  avg_continuation_r: number;
  avg_reversal_r: number;
}

interface ExitQualityBySetup {
  setup_name: string;
  trade_count: number;
  avg_efficiency: number;
  avg_captured_r: number;
  avg_missed_r: number;
  exit_quality_score: number;
}

interface MissedRTimeline {
  trade_date: string;
  daily_missed_r: number;
  cumulative_missed_r: number;
  trades_with_continuation: number;
}

interface ConfidencePerformance {
  confidence_level: number;
  trade_count: number;
  avg_r_multiple: number;
  avg_efficiency: number;
  win_rate: number;
  avg_pnl: number;
}

interface DisciplinePerformance {
  discipline_tag: string;
  trade_count: number;
  avg_r_multiple: number;
  avg_efficiency: number;
  win_rate: number;
  avg_pnl: number;
  avg_missed_r: number;
}

interface EfficiencyBySetup {
  setup_name: string;
  trade_count: number;
  avg_efficiency: number;
  avg_mae_r: number;
  avg_mfe_r: number;
  avg_r_multiple: number;
  trades_with_efficiency: number;
}

type TradeObservation = any; // Use the view type from Database types

/**
 * Hook for post-trade observation analytics
 * Provides data for Phase 2B dashboard
 */
export function usePostTradeAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // OBSERVATION SUMMARIES
  // ============================================================

  const fetchObservationSummary = useCallback(async (): Promise<ObservationSummary | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_observation_summary', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      logger.error('Error fetching observation summary:', err);
      return null;
    }
  }, [user]);

  const fetchContinuationBySetup = useCallback(async (): Promise<ContinuationBySetup[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_continuation_by_setup', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching continuation by setup:', err);
      return [];
    }
  }, [user]);

  const fetchReversalAfterStopBySetup = useCallback(async (): Promise<ReversalAfterStopBySetup[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_reversal_after_stop_by_setup', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching reversal after stop:', err);
      return [];
    }
  }, [user]);

  const fetchOptimalObservationWindow = useCallback(async (): Promise<OptimalObservationWindow[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_optimal_observation_window', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching optimal observation window:', err);
      return [];
    }
  }, [user]);

  const fetchExitQualityBySetup = useCallback(async (): Promise<ExitQualityBySetup[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_exit_quality_by_setup', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching exit quality:', err);
      return [];
    }
  }, [user]);

  const fetchMissedRTimeline = useCallback(async (days: number = 30): Promise<MissedRTimeline[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_missed_r_timeline', {
        p_user_id: user.id,
        p_days: days
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching missed R timeline:', err);
      return [];
    }
  }, [user]);

  const fetchConfidencePerformance = useCallback(async (): Promise<ConfidencePerformance[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_confidence_performance', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching confidence performance:', err);
      return [];
    }
  }, [user]);

  const fetchDisciplinePerformance = useCallback(async (): Promise<DisciplinePerformance[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_discipline_performance', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching discipline performance:', err);
      return [];
    }
  }, [user]);

  const fetchEfficiencyBySetup = useCallback(async (): Promise<EfficiencyBySetup[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_efficiency_by_setup', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching efficiency by setup:', err);
      return [];
    }
  }, [user]);

  // ============================================================
  // RAW OBSERVATIONS
  // ============================================================

  const fetchRecentObservations = useCallback(async (limit: number = 50): Promise<TradeObservation[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('v_trade_observations')
        .select('*')
        .eq('user_id', user.id)
        .order('observed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Error fetching recent observations:', err);
      return [];
    }
  }, [user]);

  // ============================================================
  // AGGREGATED FETCH (for dashboard loading)
  // ============================================================

  const fetchAllAnalytics = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const [
        summary,
        continuationBySetup,
        reversalBySetup,
        optimalWindow,
        exitQuality,
        missedRTimeline,
        confidencePerf,
        disciplinePerf,
        efficiencyBySetup,
        recentObs
      ] = await Promise.all([
        fetchObservationSummary(),
        fetchContinuationBySetup(),
        fetchReversalAfterStopBySetup(),
        fetchOptimalObservationWindow(),
        fetchExitQualityBySetup(),
        fetchMissedRTimeline(30),
        fetchConfidencePerformance(),
        fetchDisciplinePerformance(),
        fetchEfficiencyBySetup(),
        fetchRecentObservations(20)
      ]);

      return {
        summary,
        continuationBySetup,
        reversalBySetup,
        optimalWindow,
        exitQuality,
        missedRTimeline,
        confidencePerf,
        disciplinePerf,
        efficiencyBySetup,
        recentObservations: recentObs
      };
    } catch (err) {
      logger.error('Error fetching all analytics:', err);
      setError('Failed to load analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    user,
    fetchObservationSummary,
    fetchContinuationBySetup,
    fetchReversalAfterStopBySetup,
    fetchOptimalObservationWindow,
    fetchExitQualityBySetup,
    fetchMissedRTimeline,
    fetchConfidencePerformance,
    fetchDisciplinePerformance,
    fetchEfficiencyBySetup,
    fetchRecentObservations
  ]);

  return {
    // Individual fetchers
    fetchObservationSummary,
    fetchContinuationBySetup,
    fetchReversalAfterStopBySetup,
    fetchOptimalObservationWindow,
    fetchExitQualityBySetup,
    fetchMissedRTimeline,
    fetchConfidencePerformance,
    fetchDisciplinePerformance,
    fetchEfficiencyBySetup,
    fetchRecentObservations,
    // Aggregated fetch
    fetchAllAnalytics,
    // State
    loading,
    error
  };
}

