import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { 
  DisciplineChallenge, 
  DailyDisciplineTracking, 
  ChallengeProgress, 
  ChallengeStats,
  DailyDisciplineForm,
  ChallengeSetup,
  Achievement
} from '@/types/discipline';
import { DISCIPLINE_ACHIEVEMENTS } from '@/types/discipline';

interface UseDisciplineChallengeReturn {
  // Challenge state
  currentChallenge: DisciplineChallenge | null;
  challengeProgress: ChallengeProgress | null;
  challengeStats: ChallengeStats | null;
  todayTracking: DailyDisciplineTracking | null;
  
  // Loading states
  loading: boolean;
  progressLoading: boolean;
  
  // Actions
  createChallenge: (setup: ChallengeSetup) => Promise<DisciplineChallenge | null>;
  updateChallenge: (challengeId: string, updates: Partial<DisciplineChallenge>) => Promise<boolean>;
  recordDailyDiscipline: (form: DailyDisciplineForm) => Promise<boolean>;
  getChallengeProgress: (challengeId: string) => Promise<ChallengeProgress | null>;
  getChallengeStats: (challengeId: string) => Promise<ChallengeStats | null>;
  getTodayTracking: (challengeId: string) => Promise<DailyDisciplineTracking | null>;
  
  // Challenge management
  pauseChallenge: (challengeId: string) => Promise<boolean>;
  resumeChallenge: (challengeId: string) => Promise<boolean>;
  completeChallenge: (challengeId: string) => Promise<boolean>;
  resetChallenge: (challengeId: string) => Promise<boolean>;
  
  // Achievements
  achievements: Achievement[];
  checkAchievements: (challengeId: string) => Promise<Achievement[]>;
  
  // Real-time updates
  refreshChallenge: () => Promise<void>;
}

export function useDisciplineChallenge(): UseDisciplineChallengeReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentChallenge, setCurrentChallenge] = useState<DisciplineChallenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress | null>(null);
  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(null);
  const [todayTracking, setTodayTracking] = useState<DailyDisciplineTracking | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>(DISCIPLINE_ACHIEVEMENTS);
  
  const [loading, setLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);

  // Load current challenge on mount
  useEffect(() => {
    if (user) {
      loadCurrentChallenge();
    }
  }, [user]);

  // Load current challenge
  const loadCurrentChallenge = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discipline_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setCurrentChallenge(data);
        await loadChallengeProgress(data.id);
        await loadTodayTracking(data.id);
      }
    } catch (error) {
      console.error('Error loading current challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challenge data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Create new challenge
  const createChallenge = useCallback(async (setup: ChallengeSetup): Promise<DisciplineChallenge | null> => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_discipline_challenge', {
        p_user_id: user.id,
        p_challenge_name: setup.challenge_name,
        p_max_daily_losses: setup.max_daily_losses,
        p_max_risk_per_trade: setup.max_risk_per_trade,
        p_house_money_threshold: setup.house_money_threshold
      });

      if (error) throw error;

      // Fetch the created challenge
      const { data: challenge, error: fetchError } = await supabase
        .from('discipline_challenges')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      setCurrentChallenge(challenge);
      toast({
        title: 'Challenge Created',
        description: 'Your 30-day discipline challenge has started!',
      });

      return challenge;
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create challenge',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Update challenge
  const updateChallenge = useCallback(async (challengeId: string, updates: Partial<DisciplineChallenge>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('discipline_challenges')
        .update(updates)
        .eq('id', challengeId);

      if (error) throw error;

      // Refresh current challenge if it's the one being updated
      if (currentChallenge?.id === challengeId) {
        await loadCurrentChallenge();
      }

      return true;
    } catch (error) {
      console.error('Error updating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to update challenge',
        variant: 'destructive'
      });
      return false;
    }
  }, [currentChallenge, loadCurrentChallenge, toast]);

  // Record daily discipline
  const recordDailyDiscipline = useCallback(async (form: DailyDisciplineForm): Promise<boolean> => {
    if (!currentChallenge) return false;
    
    try {
      const { error } = await supabase.rpc('record_daily_discipline', {
        p_challenge_id: currentChallenge.id,
        p_tracking_date: new Date().toISOString().split('T')[0],
        p_followed_setup: form.followed_setup,
        p_respected_sl: form.respected_sl,
        p_respected_risk: form.respected_risk,
        p_respected_house_money: form.respected_house_money,
        p_respected_3_losses: form.respected_3_losses,
        p_trades_taken: form.trades_taken,
        p_profitable_trades: form.profitable_trades,
        p_losing_trades: form.losing_trades,
        p_total_pnl: form.total_pnl,
        p_max_risk_used: form.max_risk_used,
        p_discipline_notes: form.discipline_notes || null
      });

      if (error) throw error;

      // Refresh data
      await loadCurrentChallenge();
      await checkAchievements(currentChallenge.id);

      toast({
        title: 'Daily Discipline Recorded',
        description: `Day ${currentChallenge.current_day} completed with score: ${form.followed_setup && form.respected_sl && form.respected_risk && form.respected_house_money && form.respected_3_losses ? '100' : 'Less than 100'}`,
      });

      return true;
    } catch (error) {
      console.error('Error recording daily discipline:', error);
      toast({
        title: 'Error',
        description: 'Failed to record daily discipline',
        variant: 'destructive'
      });
      return false;
    }
  }, [currentChallenge, loadCurrentChallenge, toast]);

  // Get challenge progress
  const getChallengeProgress = useCallback(async (challengeId: string): Promise<ChallengeProgress | null> => {
    setProgressLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_challenge_progress', {
        p_challenge_id: challengeId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const progress = data[0];
        setChallengeProgress(progress);
        return progress;
      }

      return null;
    } catch (error) {
      console.error('Error getting challenge progress:', error);
      return null;
    } finally {
      setProgressLoading(false);
    }
  }, []);

  // Load challenge progress
  const loadChallengeProgress = useCallback(async (challengeId: string) => {
    await getChallengeProgress(challengeId);
  }, [getChallengeProgress]);

  // Get challenge stats
  const getChallengeStats = useCallback(async (challengeId: string): Promise<ChallengeStats | null> => {
    try {
      // Get daily tracking data for stats
      const { data: trackingData, error: trackingError } = await supabase
        .from('daily_discipline_tracking')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('tracking_date', { ascending: true });

      if (trackingError) throw trackingError;

      if (!trackingData || trackingData.length === 0) {
        return null;
      }

      // Calculate stats
      const totalDays = 30;
      const completedDays = trackingData.length;
      const perfectDays = trackingData.filter(day => day.daily_score === 100).length;
      const totalViolations = trackingData.reduce((sum, day) => sum + day.violation_count, 0);
      const averageScore = trackingData.reduce((sum, day) => sum + day.daily_score, 0) / completedDays;

      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      for (const day of trackingData) {
        if (day.daily_score === 100) {
          tempStreak++;
          currentStreak = tempStreak;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Violation breakdown
      const violationBreakdown = {
        setup_violation: trackingData.filter(day => !day.followed_setup).length,
        sl_movement: trackingData.filter(day => !day.respected_sl).length,
        risk_exceeded: trackingData.filter(day => !day.respected_risk).length,
        house_money_violation: trackingData.filter(day => !day.respected_house_money).length,
        three_losses_violation: trackingData.filter(day => !day.respected_3_losses).length
      };

      const stats: ChallengeStats = {
        total_days: totalDays,
        completed_days: completedDays,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_violations: totalViolations,
        average_daily_score: averageScore,
        perfect_days: perfectDays,
        violation_breakdown: violationBreakdown
      };

      setChallengeStats(stats);
      return stats;
    } catch (error) {
      console.error('Error getting challenge stats:', error);
      return null;
    }
  }, []);

  // Get today's tracking
  const getTodayTracking = useCallback(async (challengeId: string): Promise<DailyDisciplineTracking | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_discipline_tracking')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('tracking_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTodayTracking(data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error getting today tracking:', error);
      return null;
    }
  }, []);

  // Load today tracking
  const loadTodayTracking = useCallback(async (challengeId: string) => {
    await getTodayTracking(challengeId);
  }, [getTodayTracking]);

  // Pause challenge
  const pauseChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    return await updateChallenge(challengeId, { status: 'paused' });
  }, [updateChallenge]);

  // Resume challenge
  const resumeChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    return await updateChallenge(challengeId, { status: 'active' });
  }, [updateChallenge]);

  // Complete challenge
  const completeChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    return await updateChallenge(challengeId, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_score: challengeStats?.average_daily_score || 0
    });
  }, [updateChallenge, challengeStats]);

  // Reset challenge
  const resetChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      // Delete all tracking data
      await supabase
        .from('daily_discipline_tracking')
        .delete()
        .eq('challenge_id', challengeId);

      // Reset challenge
      await supabase
        .from('discipline_challenges')
        .update({
          current_day: 1,
          current_streak: 0,
          total_days_completed: 0,
          total_rule_violations: 0,
          daily_violations: 0,
          daily_score: 0,
          is_day_completed: false,
          completion_percentage: 0,
          status: 'active'
        })
        .eq('id', challengeId);

      await loadCurrentChallenge();
      return true;
    } catch (error) {
      console.error('Error resetting challenge:', error);
      return false;
    }
  }, [loadCurrentChallenge]);

  // Check achievements
  const checkAchievements = useCallback(async (challengeId: string): Promise<Achievement[]> => {
    if (!challengeStats) return achievements;

    const updatedAchievements = achievements.map(achievement => {
      let unlocked = false;
      let unlockedAt: string | undefined;

      switch (achievement.requirement.type) {
        case 'streak':
          unlocked = challengeStats.current_streak >= achievement.requirement.value;
          break;
        case 'perfect_days':
          unlocked = challengeStats.perfect_days >= achievement.requirement.value;
          break;
        case 'completion':
          unlocked = challengeStats.completed_days >= achievement.requirement.value;
          break;
        case 'violation_free':
          unlocked = challengeStats.total_violations === 0;
          break;
      }

      if (unlocked && !achievement.unlocked) {
        unlockedAt = new Date().toISOString();
      }

      return {
        ...achievement,
        unlocked,
        unlocked_at: unlockedAt || achievement.unlocked_at
      };
    });

    setAchievements(updatedAchievements);
    return updatedAchievements;
  }, [achievements, challengeStats]);

  // Refresh challenge
  const refreshChallenge = useCallback(async () => {
    if (currentChallenge) {
      await loadCurrentChallenge();
      await getChallengeStats(currentChallenge.id);
      await checkAchievements(currentChallenge.id);
    }
  }, [currentChallenge, loadCurrentChallenge, getChallengeStats, checkAchievements]);

  return {
    // Challenge state
    currentChallenge,
    challengeProgress,
    challengeStats,
    todayTracking,
    
    // Loading states
    loading,
    progressLoading,
    
    // Actions
    createChallenge,
    updateChallenge,
    recordDailyDiscipline,
    getChallengeProgress,
    getChallengeStats,
    getTodayTracking,
    
    // Challenge management
    pauseChallenge,
    resumeChallenge,
    completeChallenge,
    resetChallenge,
    
    // Achievements
    achievements,
    checkAchievements,
    
    // Real-time updates
    refreshChallenge
  };
}
