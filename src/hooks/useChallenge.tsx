import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import type { 
  ChallengePhase, 
  ChallengeSummary, 
  CreateChallengeRequest, 
  UpdateChallengeRequest,
  ChallengeDailyState,
  FabioTradeValidation,
  ChallengePhaseStatus
} from '@/types/challenge';

interface UseChallengeReturn {
  activeChallenge: ChallengePhase | null;
  challengeSummary: ChallengeSummary | null;
  loading: boolean;
  error: string | null;
  
  createChallenge: (data: CreateChallengeRequest) => Promise<ChallengePhase>;
  updateChallenge: (data: UpdateChallengeRequest) => Promise<ChallengePhase>;
  refreshChallenge: () => Promise<void>;
  
  // Fabio discipline system methods
  getDailyState: (challengeId: string, date?: Date) => Promise<ChallengeDailyState | null>;
  validateTrade: (challengeId: string, riskAmount: number, targetPrice: number, entryPrice: number, stopLoss: number) => Promise<FabioTradeValidation>;
  getPhaseStatus: (challengeId: string) => Promise<ChallengePhaseStatus | null>;
}

export function useChallenge(): UseChallengeReturn {
  const { user } = useAuth();
  const [activeChallenge, setActiveChallenge] = useState<ChallengePhase | null>(null);
  const [challengeSummary, setChallengeSummary] = useState<ChallengeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveChallenge = useCallback(async () => {
    if (!user) {
      setActiveChallenge(null);
      setChallengeSummary(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch active challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenge_phases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (challengeError) {
        if (
          challengeError.code === 'PGRST204' || 
          challengeError.message?.includes('406') || 
          challengeError.message?.includes('Not Acceptable') ||
          challengeError.message?.includes('schema cache')
        ) {
          // Handle 406/schema cache errors gracefully
          logger.warn('API schema cache error for challenge_phases, using null:', challengeError);
          setActiveChallenge(null);
          setChallengeSummary(null);
          setLoading(false);
          return;
        } else if (challengeError.code === 'PGRST116') { // PGRST116 = no rows returned
          logger.info('No active challenge found for user - creating default challenge for new user');
          
          // Create a default challenge for new users
          try {
            const { data: newChallenge, error: createError } = await supabase
              .from('challenge_phases')
              .insert({
                user_id: user.id,
                prop_firm: 'Funded Hive',
                phase: 1,
                starting_balance: 100000,
                target_profit: 8000,
                status: 'active',
                started_at: new Date().toISOString(),
                challenge_name: 'Funded Hive - Phase 1',
                build_phase_active: true,
                build_trades_count: 0,
                build_realized_pnl: 0,
                banked_profit: 0,
                daily_stop_losses: 0,
                is_locked: false
              })
              .select()
              .single();

            if (createError) {
              logger.error('Error creating default challenge:', createError);
              setActiveChallenge(null);
              setLoading(false);
              return;
            }

            logger.info('Default challenge created for new user:', newChallenge);
            setActiveChallenge(newChallenge as ChallengePhase);
            setLoading(false);
            return;
          } catch (createErr) {
            logger.error('Exception creating default challenge:', createErr);
            setActiveChallenge(null);
            setLoading(false);
            return;
          }
        } else if (challengeError.code === 'PGRST301') {
          // Table not found - user needs to set up challenge
          logger.warn('Challenge phases table not found, user may need to set up challenge');
          setActiveChallenge(null);
          setLoading(false);
          return;
        } else {
          logger.error('Error fetching challenge:', challengeError);
          setActiveChallenge(null);
          setLoading(false);
          return;
        }
      }

      setActiveChallenge(challengeData as ChallengePhase);

      // Fetch challenge summary if we have an active challenge
      if (challengeData) {
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_enhanced_challenge_summary' as any, { p_user_id: user.id });

        if (summaryError) throw summaryError;

        if (summaryData && Array.isArray(summaryData) && summaryData.length > 0) {
          const summary = summaryData[0];
          setChallengeSummary({
            phaseId: summary.phase_id,
            challengeName: summary.challenge_name,
            propFirm: summary.prop_firm,
            phase: summary.phase,
            startingBalance: Number(summary.starting_balance),
            targetProfit: Number(summary.target_profit),
            currentBalance: Number(summary.current_balance),
            netProfit: Number(summary.net_profit),
            realizedToday: Number(summary.realized_today),
            distanceToPass: Number(summary.distance_to_pass),
            distanceInR: summary.distance_in_r,
            progressPct: Number(summary.progress_pct),
            state: summary.state,
            // Fabio discipline fields
            buildPhaseActive: summary.build_phase_active,
            buildTradesCount: summary.build_trades_count,
            buildRealizedPnl: Number(summary.build_realized_pnl),
            bankedProfit: Number(summary.banked_profit),
            dailyStopLosses: summary.daily_stop_losses,
            isLocked: summary.is_locked,
            lockReason: summary.lock_reason
          });
        } else {
          setChallengeSummary(null);
        }
      } else {
        setChallengeSummary(null);
      }
    } catch (err) {
      logger.error('Error fetching challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch challenge');
    } finally {
      setLoading(false);
    }
  }, [user]);


  const updateChallenge = useCallback(async (data: UpdateChallengeRequest): Promise<ChallengePhase> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      const { data: updatedChallenge, error } = await supabase
        .from('challenge_phases')
        .update({
          starting_balance: data.startingBalance,
          target_profit: data.targetProfit,
          user_reported_current_balance: data.currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.phaseId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Refresh the challenge data
      await fetchActiveChallenge();

      return updatedChallenge as ChallengePhase;
    } catch (err) {
      logger.error('Error updating challenge:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update challenge';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, fetchActiveChallenge]);

  const refreshChallenge = useCallback(async () => {
    await fetchActiveChallenge();
  }, [fetchActiveChallenge]);

  const createChallenge = useCallback(async (data: CreateChallengeRequest): Promise<ChallengePhase> => {
    if (!user) {
      throw new Error('User must be authenticated to create a challenge');
    }

    try {
      const { data: newChallenge, error } = await supabase
        .from('challenge_phases')
        .insert({
          user_id: user.id,
          prop_firm: data.prop_firm || 'Funded Hive',
          phase: data.phase || 1,
          starting_balance: data.starting_balance || 100000,
          target_profit: data.target_profit || 8000,
          status: 'active',
          started_at: new Date().toISOString(),
          challenge_name: data.challenge_name || 'Funded Hive - Phase 1',
          build_phase_active: true,
          build_trades_count: 0,
          build_realized_pnl: 0,
          banked_profit: 0,
          daily_stop_losses: 0,
          is_locked: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh the challenge data
      await fetchActiveChallenge();
      
      return newChallenge as ChallengePhase;
    } catch (error) {
      logger.error('Error creating challenge:', error);
      throw error;
    }
  }, [user, fetchActiveChallenge]);

  // Fabio discipline system methods
  const getDailyState = useCallback(async (challengeId: string, date?: Date): Promise<ChallengeDailyState | null> => {
    if (!user) return null;

    try {
      const dateKey = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .rpc('get_challenge_daily_state' as any, { 
          challenge_uuid: challengeId, 
          target_date: dateKey 
        });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const state = data[0];
        return {
          challengeId: state.challenge_id,
          dateKey: state.date_key,
          buildPhaseActive: state.build_phase_active,
          buildTradesCount: state.build_trades_count,
          buildRealizedPnl: Number(state.build_realized_pnl),
          bankedProfit: Number(state.banked_profit),
          bankingTriggered: state.banking_triggered,
          dailyStopLosses: state.daily_stop_losses,
          isLocked: state.is_locked,
          lockReason: state.lock_reason,
          realizedPnl: Number(state.realized_pnl),
          totalTrades: state.total_trades
        };
      }

      return null;
    } catch (err) {
      logger.error('Error fetching daily state:', err);
      return null;
    }
  }, [user]);

  const validateTrade = useCallback(async (
    challengeId: string, 
    riskAmount: number, 
    targetPrice: number, 
    entryPrice: number, 
    stopLoss: number
  ): Promise<FabioTradeValidation> => {
    if (!user) {
      return { isValid: false, errorMessage: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .rpc('validate_fabio_trade' as any, {
          challenge_uuid: challengeId,
          risk_amount: riskAmount,
          target_price: targetPrice,
          entry_price: entryPrice,
          stop_loss: stopLoss
        });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        return {
          isValid: result.is_valid,
          errorMessage: result.error_message,
          warningMessage: result.warning_message
        };
      }

      return { isValid: false, errorMessage: 'Validation failed' };
    } catch (err) {
      logger.error('Error validating trade:', err);
      return { isValid: false, errorMessage: 'Validation error occurred' };
    }
  }, [user]);

  const getPhaseStatus = useCallback(async (challengeId: string): Promise<ChallengePhaseStatus | null> => {
    const dailyState = await getDailyState(challengeId);
    if (!dailyState) return null;

    let phase: 'BUILD' | 'NORMAL' | 'PRESERVATION' | 'LOCKED';
    
    if (dailyState.isLocked) {
      phase = 'LOCKED';
    } else if (dailyState.buildPhaseActive) {
      phase = 'BUILD';
    } else if (dailyState.bankedProfit > 0) {
      phase = 'PRESERVATION';
    } else {
      phase = 'NORMAL';
    }

    return {
      phase,
      buildProgress: `${dailyState.buildTradesCount}/3`,
      bankedAmount: dailyState.bankedProfit,
      stopLossCount: `${dailyState.dailyStopLosses}/3`,
      isLocked: dailyState.isLocked,
      lockReason: dailyState.lockReason
    };
  }, [getDailyState]);

  // Initial fetch
  useEffect(() => {
    fetchActiveChallenge();
  }, [fetchActiveChallenge]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('challenge-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_phases',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveChallenge();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveChallenge();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveChallenge]);

  return {
    activeChallenge,
    challengeSummary,
    loading,
    error,
    createChallenge,
    updateChallenge,
    refreshChallenge,
    getDailyState,
    validateTrade,
    getPhaseStatus
  };
}
