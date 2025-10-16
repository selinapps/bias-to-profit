import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  X,
  Trophy,
  Flame,
  Calendar,
  Star,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Award,
  Zap,
  Activity,
  Brain
} from 'lucide-react';
// import { useDisciplineChallenge } from '@/hooks/useDisciplineChallenge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import type { 
  DisciplineChallenge, 
  ChallengeProgress, 
  ChallengeStats,
  DailyDisciplineForm,
  ChallengeSetup,
  Achievement,
  DisciplineRule
} from '@/types/discipline';
import { DISCIPLINE_RULES, CHALLENGE_DIFFICULTIES, DISCIPLINE_ACHIEVEMENTS } from '@/types/discipline';
import { ChallengeSetupWizard } from './ChallengeSetupWizard';
import { DailyDisciplineForm as DailyForm } from './DailyDisciplineForm';
import { ChallengeProgressCard } from './ChallengeProgressCard';
import { ChallengeStatsCard } from './ChallengeStatsCard';
import { AchievementCard } from './AchievementCard';
import { RuleViolationCard } from './RuleViolationCard';
import { supabase } from '@/integrations/supabase/client';

interface DisciplineChallengeDashboardProps {
  className?: string;
}

export function DisciplineChallengeDashboard({ className }: DisciplineChallengeDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trades, closedTrades } = useTradesOptimized();

  console.log('DisciplineChallengeDashboard mounted, user:', user?.id || 'no user');
  
  // Track component mounts/unmounts
  useEffect(() => {
    console.log('DisciplineChallengeDashboard component mounted');
    return () => {
      console.log('DisciplineChallengeDashboard component unmounted');
    };
  }, []);
  
  // Real-time edge-building metrics calculated from trades
  const edgeMetrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        processAdherence: 0,
        riskConsistency: 0,
        emotionalControl: 0,
        setupQuality: 0,
        sessionAlignment: 0,
        tradeManagement: 0,
        overallScore: 0,
        breakdown: {
          checklistComplete: 0,
          planFollowed: 0,
          riskWithinLimits: 0,
          emotionsCalm: 0,
          noMistakes: 0,
          sessionOptimal: 0
        }
      };
    }

    // 1. Process Adherence (30%) - Did they follow their plan?
    const tradesWithGoodActions = trades.filter((t: any) => 
      Array.isArray(t.good_actions) && t.good_actions.some((action: string) => 
        action.includes('Followed plan') || action.includes('Plan Followed')
      )
    ).length;
    const processAdherence = (tradesWithGoodActions / trades.length) * 100;

    // 2. Risk Consistency (25%) - Staying within risk parameters
    const closedWithRisk = closedTrades.filter((t: any) => t.risk_amount > 0);
    const consistentRisk = closedWithRisk.filter((t: any) => 
      t.risk_amount >= 100 && t.risk_amount <= 500 // Within challenge limits
    ).length;
    const riskConsistency = closedWithRisk.length > 0 ? (consistentRisk / closedWithRisk.length) * 100 : 0;

    // 3. Emotional Control (20%) - Calm emotions and no revenge trading
    const tradesWithEmotions = trades.filter((t: any) => t.emotions);
    const calmTrades = tradesWithEmotions.filter((t: any) => {
      const emotions = t.emotions;
      return emotions.calm_stressed <= 5 && // Calm side
             emotions.focus >= 6 && // Good focus
             emotions.urge_recover <= 4; // Low urge to recover
    }).length;
    const emotionalControl = tradesWithEmotions.length > 0 ? (calmTrades / tradesWithEmotions.length) * 100 : 0;

    // 4. Setup Quality (15%) - Using defined setups, not random entries
    const tradesWithSetup = trades.filter((t: any) => 
      t.model && t.model !== 'Unknown' && t.model !== 'Custom'
    ).length;
    const setupQuality = (tradesWithSetup / trades.length) * 100;

    // 5. Session Alignment (10%) - Trading during optimal ICT sessions
    const optimalSessions = ['London Open (ICT Killzone)', 'New York Killzone (ICT)', 'Silver Bullet (10-11 AM)'];
    const tradesInOptimalSessions = trades.filter((t: any) => 
      optimalSessions.some(session => t.trading_session?.includes(session))
    ).length;
    const sessionAlignment = (tradesInOptimalSessions / trades.length) * 100;

    // 6. Trade Management (Calculated from closed trades)
    const tradesWithManagement = closedTrades.filter((t: any) => {
      const tradeManagement = t.trade_management;
      return tradeManagement && (
        tradeManagement.movedToBreakeven ||
        tradeManagement.partialCloseAt2R ||
        tradeManagement.trailingStopUsed
      );
    }).length;
    const tradeManagement = closedTrades.length > 0 ? (tradesWithManagement / closedTrades.length) * 100 : 0;

    // Overall Edge Score (weighted average)
    const overallScore = (
      processAdherence * 0.30 +
      riskConsistency * 0.25 +
      emotionalControl * 0.20 +
      setupQuality * 0.15 +
      sessionAlignment * 0.10
    );

    return {
      processAdherence,
      riskConsistency,
      emotionalControl,
      setupQuality,
      sessionAlignment,
      tradeManagement,
      overallScore,
      breakdown: {
        checklistComplete: tradesWithGoodActions,
        planFollowed: tradesWithGoodActions,
        riskWithinLimits: consistentRisk,
        emotionsCalm: calmTrades,
        noMistakes: trades.filter((t: any) => !t.mistake_tags || t.mistake_tags.length === 0).length,
        sessionOptimal: tradesInOptimalSessions
      }
    };
  }, [trades, closedTrades]);

  // Auto-refresh challenge stats when trades change (real-time updates)
  useEffect(() => {
    if (currentChallenge && trades.length > 0) {
      console.log('Trades changed, refreshing challenge stats...');
      refreshChallengeData();
    }
  }, [trades.length]); // Trigger when trade count changes
  
  // Local storage for demo mode
  const [currentChallenge, setCurrentChallenge] = useState<DisciplineChallenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress | null>(null);
  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(null);
  const [todayTracking, setTodayTracking] = useState<DailyDisciplineTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const achievements = DISCIPLINE_ACHIEVEMENTS;

  const [activeTab, setActiveTab] = useState('overview');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);

  // Function to refresh challenge data
  const refreshChallengeData = async () => {
    if (!currentChallenge || !user?.id) {
      console.log('Cannot refresh challenge data - missing challenge or user');
      return;
    }

    console.log('Refreshing challenge data for challenge:', currentChallenge.id);

    try {
      // Get updated tracking data
      const { data: trackings, error: trackingError } = await supabase
        .from('daily_discipline_tracking')
        .select('*')
        .eq('challenge_id', currentChallenge.id)
        .order('tracking_date', { ascending: true });

      console.log('Fetched trackings for refresh:', trackings?.length || 0, 'records');

      if (trackingError) {
        console.error('Error refreshing trackings:', trackingError);
        return;
      }

      // Update progress
      const daysCompleted = trackings?.length || 0;
      const completionPercentage = (daysCompleted / 30) * 100;
      
      console.log('Setting challenge progress:', {
        daysCompleted,
        completionPercentage,
        trackingsCount: trackings?.length
      });
      
      setChallengeProgress({
        daysCompleted,
        totalDays: 30,
        currentStreak: daysCompleted,
        longestStreak: daysCompleted,
        completionPercentage
      });

      // Calculate challenge stats
      const totalViolations = trackings?.reduce((sum, t) => sum + (t.violation_count || 0), 0) || 0;
      const totalTrades = trackings?.reduce((sum, t) => sum + (t.trades_taken || 0), 0) || 0;
      const totalPnl = trackings?.reduce((sum, t) => sum + (t.total_pnl || 0), 0) || 0;
      const avgScore = trackings?.length > 0 
        ? trackings.reduce((sum, t) => sum + (t.daily_score || 0), 0) / trackings.length 
        : 0;
      
      // Calculate perfect days (days with score 100)
      const perfectDays = trackings?.filter(t => t.daily_score === 100).length || 0;
      
      // Calculate violation breakdown
      const violationBreakdown = {
        setup_violation: trackings?.filter(t => !t.followed_setup).length || 0,
        sl_movement: trackings?.filter(t => !t.respected_sl).length || 0,
        risk_exceeded: trackings?.filter(t => !t.respected_risk).length || 0,
        house_money_violation: trackings?.filter(t => !t.respected_house_money).length || 0,
        three_losses_violation: trackings?.filter(t => !t.respected_3_losses).length || 0
      };

      console.log('Updating challenge stats:', {
        daysCompleted,
        totalViolations,
        perfectDays,
        avgScore,
        violationBreakdown
      });

      setChallengeStats({
        total_days: 30,
        completed_days: daysCompleted,
        current_streak: daysCompleted,
        longest_streak: daysCompleted,
        total_violations: totalViolations,
        average_daily_score: avgScore,
        perfect_days: perfectDays,
        violation_breakdown: violationBreakdown
      });

      // Get today's tracking if exists
      const today = new Date().toISOString().split('T')[0];
      const todayTracking = trackings?.find(t => t.tracking_date === today);
      if (todayTracking) {
        setTodayTracking(todayTracking);
      }
    } catch (error) {
      console.error('Error refreshing challenge data:', error);
    }
  };

  // Function to clean up duplicate challenges
  const cleanupDuplicateChallenges = async () => {
    if (!user?.id) return;

    try {
      // Get all active challenges for this user
      const { data: challenges, error } = await supabase
        .from('discipline_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching challenges:', error);
        return;
      }

      // If more than one active challenge, keep only the most recent one
      if (challenges && challenges.length > 1) {
        const challengesToDeactivate = challenges.slice(1); // Keep first (most recent), deactivate the rest
        
        for (const challenge of challengesToDeactivate) {
          await supabase
            .from('discipline_challenges')
            .update({ status: 'paused' })
            .eq('id', challenge.id);
        }
        
        console.log(`Cleaned up ${challengesToDeactivate.length} duplicate challenges`);
      }
    } catch (error) {
      console.error('Error cleaning up duplicate challenges:', error);
    }
  };

  // Load challenge from Supabase on mount
  useEffect(() => {
    const loadChallenge = async () => {
      if (!user?.id) {
        console.log('No user ID, skipping challenge load');
        return;
      }
      
      console.log('Loading challenge for user:', user.id);
      setLoading(true);
      try {
        // Clean up duplicate challenges first
        await cleanupDuplicateChallenges();

        // Get active challenge (get the most recent one if multiple exist)
        const { data: challenges, error: challengeError } = await supabase
          .from('discipline_challenges')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('Challenge query result:', { 
          challengesCount: challenges?.length || 0, 
          hasError: !!challengeError,
          challengeId: challenges?.[0]?.id
        });

        const challenge = challenges?.[0] || null;

        if (challengeError) {
          console.error('Error loading challenge:', challengeError);
          return;
        }

        console.log('Found challenge:', {
          id: challenge?.id,
          name: challenge?.challenge_name,
          status: challenge?.status,
          hasChallenge: !!challenge
        });

        if (challenge) {
          console.log('Setting current challenge:', challenge.id);
          setCurrentChallenge(challenge);
          
          // Get daily tracking data
          const { data: trackings, error: trackingError } = await supabase
            .from('daily_discipline_tracking')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('tracking_date', { ascending: true });

          if (trackingError) {
            console.error('Error loading trackings:', trackingError);
            setLoading(false);
            return;
          }

          // Calculate progress
                  const daysCompleted = trackings?.length || 0;
                  const completionPercentage = (daysCompleted / 30) * 100;

                  console.log('Initial challenge progress calculation:', {
                    trackingsCount: trackings?.length,
                    daysCompleted,
                    completionPercentage,
                    trackings: trackings?.map(t => ({ 
                      date: t.tracking_date, 
                      score: t.daily_score,
                      completed: t.is_completed 
                    }))
                  });

                  setChallengeProgress({
                    daysCompleted,
                    totalDays: 30,
                    currentStreak: daysCompleted,
                    longestStreak: daysCompleted,
                    completionPercentage
                  });

          // Calculate challenge stats
                  const totalViolations = trackings?.reduce((sum, t) => sum + (t.violation_count || 0), 0) || 0;
                  const totalTrades = trackings?.reduce((sum, t) => sum + (t.trades_taken || 0), 0) || 0;
                  const totalPnl = trackings?.reduce((sum, t) => sum + (t.total_pnl || 0), 0) || 0;
                  const avgScore = trackings?.length > 0
                    ? trackings.reduce((sum, t) => sum + (t.daily_score || 0), 0) / trackings.length
                    : 0;
                  
                  // Calculate perfect days (days with score 100)
                  const perfectDays = trackings?.filter(t => t.daily_score === 100).length || 0;
                  
                  // Calculate violation breakdown
                  const violationBreakdown = {
                    setup_violation: trackings?.filter(t => !t.followed_setup).length || 0,
                    sl_movement: trackings?.filter(t => !t.respected_sl).length || 0,
                    risk_exceeded: trackings?.filter(t => !t.respected_risk).length || 0,
                    house_money_violation: trackings?.filter(t => !t.respected_house_money).length || 0,
                    three_losses_violation: trackings?.filter(t => !t.respected_3_losses).length || 0
                  };

                  setChallengeStats({
                    total_days: 30,
                    completed_days: daysCompleted,
                    current_streak: daysCompleted,
                    longest_streak: daysCompleted,
                    total_violations: totalViolations,
                    average_daily_score: avgScore,
                    perfect_days: perfectDays,
                    violation_breakdown: violationBreakdown
                  });

          // Get today's tracking if exists
          const today = new Date().toISOString().split('T')[0];
          const todayTracking = trackings?.find(t => t.tracking_date === today);
          if (todayTracking) {
            setTodayTracking(todayTracking);
          }
        }
      } catch (error) {
        console.error('Error loading challenge:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [user?.id]);

  // Show setup wizard if no active challenge
  useEffect(() => {
    console.log('Setup wizard check:', { 
      loading, 
      hasChallenge: !!currentChallenge, 
      challengeId: currentChallenge?.id,
      showSetupWizard 
    });
    if (!loading && !currentChallenge) {
      console.log('Showing setup wizard - no active challenge found');
      setShowSetupWizard(true);
    } else if (currentChallenge) {
      console.log('Hiding setup wizard - challenge found:', currentChallenge.id);
      setShowSetupWizard(false);
    }
  }, [loading, currentChallenge]);

  const handleCreateChallenge = async (setup: ChallengeSetup) => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to start a challenge',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: challenge, error } = await supabase
        .from('discipline_challenges')
        .insert({
          user_id: user.id,
          challenge_name: '30-Day Discipline Challenge',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active',
          max_daily_losses: 3,
          max_risk_per_trade: 2.00,
          house_money_threshold: 3.00,
          must_follow_setup: true,
          no_sl_movement: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating challenge:', error);
        toast({
          title: 'Error',
          description: 'Failed to create challenge. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Challenge created successfully:', challenge);
      setCurrentChallenge(challenge);
      
      // Set initial progress
      setChallengeProgress({
        daysCompleted: 0,
        totalDays: 30,
        currentStreak: 0,
        longestStreak: 0,
        completionPercentage: 0
      });

      toast({
        title: 'Challenge Created!',
        description: 'Your 30-day discipline challenge has started!',
      });
      setShowSetupWizard(false);
      setActiveTab('overview');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRecordDailyDiscipline = async (form: DailyDisciplineForm) => {
    if (!currentChallenge || !user?.id) return;

    try {
      // Get today's trading data from trades table
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTrades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', `${today}T00:00:00.000Z`)
        .lt('entry_time', `${today}T23:59:59.999Z`);

      if (tradesError) {
        console.error('Error fetching today\'s trades:', tradesError);
      }

      // Calculate trading metrics (use form data if available, otherwise from trades)
      const tradesTaken = form.trades_taken || todayTrades?.length || 0;
      const profitableTrades = form.profitable_trades || todayTrades?.filter(trade => trade.pnl && trade.pnl > 0).length || 0;
      const losingTrades = form.losing_trades || todayTrades?.filter(trade => trade.pnl && trade.pnl < 0).length || 0;
      const totalPnl = form.total_pnl || todayTrades?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
      const maxRiskUsed = form.max_risk_used || todayTrades?.reduce((max, trade) => Math.max(max, trade.risk_amount || 0), 0) || 0;

      // Calculate daily score based on rules followed
      let dailyScore = 100;
      if (!form.followed_setup) dailyScore -= 20;
      if (!form.respected_sl) dailyScore -= 20;
      if (!form.respected_risk) dailyScore -= 20;
      if (!form.respected_house_money) dailyScore -= 20;
      if (!form.respected_3_losses) dailyScore -= 20;
      dailyScore = Math.max(0, dailyScore);

      const { data: tracking, error } = await supabase
        .from('daily_discipline_tracking')
        .insert({
          challenge_id: currentChallenge.id,
          user_id: user.id,
          tracking_date: today,
          day_number: currentChallenge.current_day || 1,
          followed_setup: form.followed_setup || false,
          respected_sl: form.respected_sl || false,
          respected_risk: form.respected_risk || false,
          respected_house_money: form.respected_house_money || false,
          respected_3_losses: form.respected_3_losses || false,
          trades_taken: tradesTaken,
          profitable_trades: profitableTrades,
          losing_trades: losingTrades,
          total_pnl: totalPnl,
          max_risk_used: maxRiskUsed,
          daily_score: dailyScore,
          discipline_notes: form.discipline_notes,
          is_completed: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording daily discipline:', error);
        toast({
          title: 'Error',
          description: 'Failed to record daily discipline. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setTodayTracking(tracking);

      console.log('Daily discipline recorded successfully, refreshing challenge data...');
      
      // Refresh challenge data to update overview
      await refreshChallengeData();

      toast({
        title: 'Daily Discipline Recorded!',
        description: `Day completed! ${tradesTaken} trades, ${profitableTrades} profitable, P&L: $${(totalPnl || 0).toFixed(2)}, Score: ${dailyScore}/100`,
      });
      setShowDailyForm(false);
    } catch (error) {
      console.error('Error recording daily discipline:', error);
      toast({
        title: 'Error',
        description: 'Failed to record daily discipline. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePauseChallenge = async () => {
    toast({
      title: 'Challenge Paused',
      description: 'Your discipline challenge has been paused (Demo mode)',
    });
  };

  const handleResumeChallenge = async () => {
    toast({
      title: 'Challenge Resumed',
      description: 'Your discipline challenge has been resumed (Demo mode)',
    });
  };

  const handleCompleteChallenge = async () => {
    toast({
      title: 'Challenge Completed!',
      description: 'Congratulations on completing your 30-day discipline challenge! (Demo mode)',
    });
  };

  const handleResetChallenge = async () => {
    if (!currentChallenge || !user?.id) return;

    try {
      // Delete all tracking records for this challenge
      const { error: trackingError } = await supabase
        .from('daily_discipline_tracking')
        .delete()
        .eq('challenge_id', currentChallenge.id);

      if (trackingError) {
        console.error('Error deleting trackings:', trackingError);
        toast({
          title: 'Error',
          description: 'Failed to reset challenge. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Delete the challenge
      const { error: challengeError } = await supabase
        .from('discipline_challenges')
        .delete()
        .eq('id', currentChallenge.id);

      if (challengeError) {
        console.error('Error deleting challenge:', challengeError);
        toast({
          title: 'Error',
          description: 'Failed to reset challenge. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Reset state
      setCurrentChallenge(null);
      setChallengeProgress(null);
      setChallengeStats(null);
      setTodayTracking(null);
      setShowSetupWizard(true);
      
      toast({
        title: 'Challenge Reset',
        description: 'Your discipline challenge has been reset. Start fresh!',
      });
    } catch (error) {
      console.error('Error resetting challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset challenge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (showSetupWizard || !currentChallenge) {
    return (
      <ChallengeSetupWizard
        onCreateChallenge={handleCreateChallenge}
        onCancel={() => setShowSetupWizard(false)}
      />
    );
  }

  const isTodayCompleted = todayTracking?.is_completed || false;
  const canRecordToday = !isTodayCompleted && currentChallenge.status === 'active';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentChallenge.challenge_name}</h1>
          <p className="text-muted-foreground">
            Day {challengeProgress?.daysCompleted || 1} of 30 • {currentChallenge.status?.toUpperCase() || 'ACTIVE'}
          </p>
        </div>
        <div className="flex gap-2">
          {currentChallenge.status === 'active' && (
            <>
              {!isTodayCompleted && (
                <Button onClick={() => setShowDailyForm(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Record Today
                </Button>
              )}
              <Button variant="outline" onClick={handlePauseChallenge}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            </>
          )}
          {currentChallenge.status === 'paused' && (
            <Button onClick={handleResumeChallenge}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {(challengeProgress?.daysCompleted || 0) >= 30 && currentChallenge.status === 'active' && (
            <Button onClick={handleCompleteChallenge}>
              <Trophy className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
          <Button variant="outline" onClick={handleResetChallenge}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overall Edge Score - Hero Card */}
          <Card className="bg-gradient-to-br from-purple-950/40 to-blue-950/40 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2">
                  <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
                  <h2 className="text-sm text-trading-muted uppercase tracking-wide">Your Edge Score</h2>
                </div>
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 mb-2">
                  {edgeMetrics.overallScore.toFixed(0)}
                </div>
                <p className="text-sm text-trading-muted mb-4">Out of 100 • Updates Live</p>
                <Progress value={edgeMetrics.overallScore} className="h-3" />
                <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-trading-muted">Trades Analyzed</div>
                    <div className="text-lg font-bold text-foreground">{trades.length}</div>
                  </div>
                  <div>
                    <div className="text-trading-muted">Closed Trades</div>
                    <div className="text-lg font-bold text-foreground">{closedTrades.length}</div>
                  </div>
                  <div>
                    <div className="text-trading-muted">Win Rate</div>
                    <div className="text-lg font-bold text-success">
                      {closedTrades.length > 0 
                        ? ((closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100).toFixed(0)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edge-Building Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Process Adherence (30%) */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    Process Adherence
                  </span>
                  <Badge variant="outline" className="text-xs">30% Weight</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-blue-400">
                    {edgeMetrics.processAdherence.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Following Your Plan</p>
                </div>
                <Progress value={edgeMetrics.processAdherence} className="mb-2" />
                <div className="text-xs text-trading-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Plan Followed:</span>
                    <span className="font-semibold text-foreground">{edgeMetrics.breakdown.planFollowed}/{trades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No Mistakes:</span>
                    <span className="font-semibold text-foreground">{edgeMetrics.breakdown.noMistakes}/{trades.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Risk Consistency (25%) */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    Risk Consistency
                  </span>
                  <Badge variant="outline" className="text-xs">25% Weight</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-emerald-400">
                    {edgeMetrics.riskConsistency.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Risk Management</p>
                </div>
                <Progress value={edgeMetrics.riskConsistency} className="mb-2" />
                <div className="text-xs text-trading-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Within Limits:</span>
                    <span className="font-semibold text-foreground">{edgeMetrics.breakdown.riskWithinLimits}/{closedTrades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range:</span>
                    <span className="font-semibold text-foreground">$100-$500</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Emotional Control (20%) */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    Emotional Control
                  </span>
                  <Badge variant="outline" className="text-xs">20% Weight</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-purple-400">
                    {edgeMetrics.emotionalControl.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Calm & Focused</p>
                </div>
                <Progress value={edgeMetrics.emotionalControl} className="mb-2" />
                <div className="text-xs text-trading-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Calm Entries:</span>
                    <span className="font-semibold text-foreground">{edgeMetrics.breakdown.emotionsCalm}/{trades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-semibold text-foreground">Stress ≤5, Focus ≥6</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Setup Quality (15%) */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-400" />
                    Setup Quality
                  </span>
                  <Badge variant="outline" className="text-xs">15% Weight</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-orange-400">
                    {edgeMetrics.setupQuality.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Using Defined Setups</p>
                </div>
                <Progress value={edgeMetrics.setupQuality} className="mb-2" />
                <div className="text-xs text-trading-muted">
                  <div className="flex justify-between">
                    <span>Valid Setups:</span>
                    <span className="font-semibold text-foreground">
                      {trades.filter((t: any) => t.model && t.model !== 'Unknown' && t.model !== 'Custom').length}/{trades.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Session Alignment (10%) */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    ICT Session Alignment
                  </span>
                  <Badge variant="outline" className="text-xs">10% Weight</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-cyan-400">
                    {edgeMetrics.sessionAlignment.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Optimal Killzones</p>
                </div>
                <Progress value={edgeMetrics.sessionAlignment} className="mb-2" />
                <div className="text-xs text-trading-muted">
                  <div className="flex justify-between">
                    <span>Premium Sessions:</span>
                    <span className="font-semibold text-foreground">{edgeMetrics.breakdown.sessionOptimal}/{trades.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. Trade Management */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-pink-400" />
                    Trade Management
                  </span>
                  <Badge variant="outline" className="text-xs">Bonus</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-pink-400">
                    {edgeMetrics.tradeManagement.toFixed(0)}%
                  </div>
                  <p className="text-xs text-trading-muted mt-1">Active Management</p>
                </div>
                <Progress value={edgeMetrics.tradeManagement} className="mb-2" />
                <div className="text-xs text-trading-muted">
                  <div className="flex justify-between">
                    <span>Managed Exits:</span>
                    <span className="font-semibold text-foreground">
                      {closedTrades.filter((t: any) => t.trade_management).length}/{closedTrades.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Performance Summary */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-trading-accent" />
                Live Performance Summary
              </CardTitle>
              <p className="text-sm text-trading-muted">Real-time metrics updated after each trade</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-trading-muted text-xs mb-1">Total Trades</div>
                  <div className="text-2xl font-bold text-foreground">{trades.length}</div>
                  <div className="text-xs text-trading-muted mt-1">
                    {closedTrades.length} closed
                  </div>
                </div>
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-trading-muted text-xs mb-1">Win Rate</div>
                  <div className={`text-2xl font-bold ${
                    closedTrades.length > 0 && (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) >= 0.5
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {closedTrades.length > 0 
                      ? ((closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100).toFixed(0)
                      : 0}%
                  </div>
                  <div className="text-xs text-trading-muted mt-1">
                    {closedTrades.filter(t => (t.pnl || 0) > 0).length} wins
                  </div>
                </div>
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-trading-muted text-xs mb-1">Avg R-Multiple</div>
                  <div className={`text-2xl font-bold ${
                    closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / (closedTrades.length || 1) > 1
                      ? 'text-success'
                      : 'text-destructive'
                  }`}>
                    {closedTrades.length > 0 
                      ? (closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / closedTrades.length).toFixed(2)
                      : '0.00'}R
                  </div>
                  <div className="text-xs text-trading-muted mt-1">
                    Expectancy
                  </div>
                </div>
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-trading-muted text-xs mb-1">Total P&L</div>
                  <div className={`text-2xl font-bold ${
                    closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0
                      ? 'text-success'
                      : 'text-destructive'
                  }`}>
                    ${closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-trading-muted mt-1">
                    Since start
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edge-Building Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What's Working */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-400" />
                  What's Building Your Edge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {edgeMetrics.processAdherence >= 70 && (
                  <div className="flex items-start gap-2 p-2 bg-green-950/20 border border-green-500/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Strong Process Adherence</div>
                      <div className="text-xs text-trading-muted">You're following your plan consistently</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.riskConsistency >= 80 && (
                  <div className="flex items-start gap-2 p-2 bg-green-950/20 border border-green-500/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Excellent Risk Management</div>
                      <div className="text-xs text-trading-muted">Consistent position sizing</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.emotionalControl >= 70 && (
                  <div className="flex items-start gap-2 p-2 bg-green-950/20 border border-green-500/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Good Emotional State</div>
                      <div className="text-xs text-trading-muted">Trading calm and focused</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.sessionAlignment >= 60 && (
                  <div className="flex items-start gap-2 p-2 bg-green-950/20 border border-green-500/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Smart Session Selection</div>
                      <div className="text-xs text-trading-muted">Trading optimal ICT killzones</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.overallScore >= 70 && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-950/20 border border-yellow-500/20 rounded">
                    <Star className="h-4 w-4 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">You're Building Real Edge!</div>
                      <div className="text-xs text-trading-muted">Overall score above 70%</div>
                    </div>
                  </div>
                )}
                {trades.length === 0 && (
                  <div className="text-center py-4 text-trading-muted text-sm">
                    Add trades to see what's working
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Areas to Improve */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {edgeMetrics.processAdherence < 70 && trades.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-950/20 border border-orange-500/20 rounded">
                    <XCircle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Process Adherence Low</div>
                      <div className="text-xs text-trading-muted">Follow your checklists more consistently</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.riskConsistency < 80 && closedTrades.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-950/20 border border-orange-500/20 rounded">
                    <XCircle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Risk Inconsistency</div>
                      <div className="text-xs text-trading-muted">Stick to $100-$500 risk per trade</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.emotionalControl < 70 && trades.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-950/20 border border-orange-500/20 rounded">
                    <XCircle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Emotional Trading</div>
                      <div className="text-xs text-trading-muted">Wait for calm, focused state before entering</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.setupQuality < 80 && trades.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-950/20 border border-orange-500/20 rounded">
                    <XCircle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Random Entries</div>
                      <div className="text-xs text-trading-muted">Define and use specific setups</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.sessionAlignment < 60 && trades.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-950/20 border border-orange-500/20 rounded">
                    <XCircle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Session Timing</div>
                      <div className="text-xs text-trading-muted">Focus on London Open, NY Killzone, or Silver Bullet</div>
                    </div>
                  </div>
                )}
                {edgeMetrics.overallScore >= 70 && trades.length > 0 && (
                  <div className="text-center py-4 text-success text-sm">
                    🎉 Excellent! Keep maintaining this level of discipline.
                  </div>
                )}
                {trades.length === 0 && (
                  <div className="text-center py-4 text-trading-muted text-sm">
                    Add trades to see improvement areas
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Progress Tab - Trade History with Edge Scores */}
        <TabsContent value="progress" className="space-y-6">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-trading-accent" />
                Your Trading Journey
              </CardTitle>
              <p className="text-sm text-trading-muted">Recent trades and edge development</p>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-12 text-trading-muted">
                  <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">No trades yet</p>
                  <p className="text-sm">Start trading to build your edge!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trades.slice(0, 10).map((trade: any) => (
                    <div key={trade.id} className="p-3 bg-secondary/20 rounded-lg border border-trading-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{trade.asset}</Badge>
                          <span className="text-sm font-medium">{trade.model || 'Unknown'}</span>
                        </div>
                        <div className={`text-sm font-bold ${(trade.pnl || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {trade.status === 'closed' ? (trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'Pending') : 'Open'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-trading-muted">
                        <div>
                          <span>Session: </span>
                          <span className="text-foreground">{trade.trading_session || 'N/A'}</span>
                        </div>
                        <div>
                          <span>R: </span>
                          <span className={`font-semibold ${(trade.r_multiple || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {trade.r_multiple ? `${trade.r_multiple.toFixed(2)}R` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span>Risk: </span>
                          <span className="text-foreground">${trade.risk_amount || 0}</span>
                        </div>
                      </div>
                      {trade.good_actions && trade.good_actions.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-green-400">Plan Followed</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {trades.length > 10 && (
                    <p className="text-center text-sm text-trading-muted">
                      Showing 10 of {trades.length} trades
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab - Edge-Building Principles */}
        <TabsContent value="rules" className="space-y-6">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Edge-Building Principles
              </CardTitle>
              <p className="text-sm text-trading-muted">Focus on these to build real trading edge</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Process Adherence */}
                <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-300 mb-1">Process Adherence (30%)</h4>
                      <p className="text-sm text-trading-muted">Follow your checklists and trading plan every single trade</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ Complete all checklist items before entry</li>
                    <li>✓ Mark "Plan Followed" in good actions</li>
                    <li>✓ Avoid impulsive deviations from plan</li>
                  </ul>
                </div>

                {/* Risk Consistency */}
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Shield className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-300 mb-1">Risk Consistency (25%)</h4>
                      <p className="text-sm text-trading-muted">Maintain consistent position sizing within limits</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ Risk $100-$500 per trade</li>
                    <li>✓ No over-sizing on "sure things"</li>
                    <li>✓ No under-sizing due to fear</li>
                  </ul>
                </div>

                {/* Emotional Control */}
                <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Brain className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-300 mb-1">Emotional Control (20%)</h4>
                      <p className="text-sm text-trading-muted">Trade only when calm and focused</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ Stress level ≤ 5 before entry</li>
                    <li>✓ Focus level ≥ 6 before entry</li>
                    <li>✓ Urge to recover ≤ 4 (no revenge trading)</li>
                  </ul>
                </div>

                {/* Setup Quality */}
                <div className="p-4 bg-orange-950/20 border border-orange-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Target className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-300 mb-1">Setup Quality (15%)</h4>
                      <p className="text-sm text-trading-muted">Use defined setups, avoid random entries</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ Create and name your setups in Settings</li>
                    <li>✓ Select specific setup for each trade</li>
                    <li>✓ Track what setups work for you</li>
                  </ul>
                </div>

                {/* Session Alignment */}
                <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Clock className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-cyan-300 mb-1">Session Alignment (10%)</h4>
                      <p className="text-sm text-trading-muted">Trade during optimal ICT killzones</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ London Open (3-5 AM EST)</li>
                    <li>✓ NY Killzone (8:30-11 AM EST)</li>
                    <li>✓ Silver Bullet (10-11 AM EST)</li>
                  </ul>
                </div>

                {/* Trade Management */}
                <div className="p-4 bg-pink-950/20 border border-pink-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-pink-500/20 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-pink-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-pink-300 mb-1">Trade Management (Bonus)</h4>
                      <p className="text-sm text-trading-muted">Actively manage your positions</p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-trading-muted">
                    <li>✓ Move stops to breakeven when possible</li>
                    <li>✓ Take partial profits at 2R</li>
                    <li>✓ Use trailing stops for runners</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab - Milestones */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Edge Score Milestones */}
            <Card className={`bg-trading-card border-trading-border ${edgeMetrics.overallScore >= 50 ? 'border-yellow-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className={`h-5 w-5 ${edgeMetrics.overallScore >= 50 ? 'text-yellow-400' : 'text-trading-muted'}`} />
                  Edge Score 50+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${edgeMetrics.overallScore >= 50 ? 'text-yellow-400' : 'text-trading-muted'}`}>
                    {edgeMetrics.overallScore >= 50 ? '🏆' : '🔒'}
                  </div>
                  <p className="text-sm text-trading-muted">
                    {edgeMetrics.overallScore >= 50 
                      ? '✅ Achieved! Building solid edge' 
                      : `${(50 - edgeMetrics.overallScore).toFixed(0)} points to go`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-trading-card border-trading-border ${edgeMetrics.overallScore >= 70 ? 'border-purple-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className={`h-5 w-5 ${edgeMetrics.overallScore >= 70 ? 'text-purple-400' : 'text-trading-muted'}`} />
                  Edge Score 70+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${edgeMetrics.overallScore >= 70 ? 'text-purple-400' : 'text-trading-muted'}`}>
                    {edgeMetrics.overallScore >= 70 ? '🎯' : '🔒'}
                  </div>
                  <p className="text-sm text-trading-muted">
                    {edgeMetrics.overallScore >= 70 
                      ? '✅ Achieved! Strong trading discipline' 
                      : `${(70 - edgeMetrics.overallScore).toFixed(0)} points to go`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-trading-card border-trading-border ${edgeMetrics.overallScore >= 85 ? 'border-emerald-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className={`h-5 w-5 ${edgeMetrics.overallScore >= 85 ? 'text-emerald-400' : 'text-trading-muted'}`} />
                  Edge Score 85+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${edgeMetrics.overallScore >= 85 ? 'text-emerald-400' : 'text-trading-muted'}`}>
                    {edgeMetrics.overallScore >= 85 ? '💎' : '🔒'}
                  </div>
                  <p className="text-sm text-trading-muted">
                    {edgeMetrics.overallScore >= 85 
                      ? '✅ Achieved! Elite trader discipline' 
                      : `${(85 - edgeMetrics.overallScore).toFixed(0)} points to go`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trade Count Milestones */}
            <Card className={`bg-trading-card border-trading-border ${trades.length >= 30 ? 'border-blue-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${trades.length >= 30 ? 'text-blue-400' : 'text-trading-muted'}`} />
                  30 Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-2">{trades.length}/30</div>
                  <p className="text-sm text-trading-muted">
                    {trades.length >= 30 ? '✅ Sample size achieved!' : `${30 - trades.length} more to go`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-trading-card border-trading-border ${closedTrades.length >= 50 ? 'border-blue-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className={`h-5 w-5 ${closedTrades.length >= 50 ? 'text-blue-400' : 'text-trading-muted'}`} />
                  50 Closed Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-2">{closedTrades.length}/50</div>
                  <p className="text-sm text-trading-muted">
                    {closedTrades.length >= 50 ? '✅ Consistent trader!' : `${50 - closedTrades.length} more to go`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-trading-card border-trading-border ${closedTrades.length >= 100 ? 'border-purple-500/30' : ''}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className={`h-5 w-5 ${closedTrades.length >= 100 ? 'text-orange-400' : 'text-trading-muted'}`} />
                  100 Closed Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-2">{closedTrades.length}/100</div>
                  <p className="text-sm text-trading-muted">
                    {closedTrades.length >= 100 ? '✅ Experienced trader!' : `${100 - closedTrades.length} more to go`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Daily Discipline Form Modal */}
      {showDailyForm && (
        <DailyForm
          challenge={currentChallenge}
          onRecord={handleRecordDailyDiscipline}
          onCancel={() => setShowDailyForm(false)}
        />
      )}
    </div>
  );
}
