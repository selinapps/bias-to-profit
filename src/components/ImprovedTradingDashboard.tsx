import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Target,
  AlertTriangle,
  Download,
  Plus,
  LogOut,
  Settings,
  Bell,
  Zap,
  Shield,
  Brain,
  Calendar,
  Activity,
  Trophy,
  X,
  Upload
} from 'lucide-react';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAuth } from '@/hooks/useAuth';
import type { BiasValue, MarketStateValue } from '@/types/bias';
import { useSettings } from '@/hooks/useSettings';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AddTradeBottomSheet } from './AddTradeBottomSheet';
import { SimplifiedAddTradeSheet } from './SimplifiedAddTradeSheet';
import { SetupManager } from './SetupManager';
import { DailyWrap } from './DailyWrap';
import { TradeHeatmap } from './TradeHeatmap';
import { TradingCalendar } from './TradingCalendar';
import { TradingAnalytics } from './TradingAnalytics';
import { BiasStateCard } from './BiasStateCard';
import { BiasQuizModal } from './BiasQuizModal';
import { TradeCard } from './TradeCard';
import { MobileTradeCard } from './MobileTradeCard';
import { EditTradeModal } from './EditTradeModal';
import { CTraderImportModal } from './CTraderImportModal';
// import { ChallengeStatusCard } from './ChallengeStatusCard'; // Disabled due to RPC function issues
import { DisciplineChallengeDashboard } from './DisciplineChallengeDashboard';
import { useBiasState } from '@/hooks/useBiasState';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { SettingsModal } from './SettingsModal';
import { ResponsiveFooter } from './ResponsiveFooter';
import { DebugPanel } from './DebugPanel';
import { format } from 'date-fns';
import { TRADING_SESSIONS, getActiveSession, isMarketOpen, type TradingSession } from '@/lib/tradingSessions';
import ReflectionPage from '@/pages/Reflection';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

const EST_TIME_ZONE = 'America/New_York';

const getWeekendClosureStatus = (date: Date) => {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: EST_TIME_ZONE }));
  const day = estDate.getDay();
  const minutes = estDate.getHours() * 60 + estDate.getMinutes();

  const MINUTES_PER_DAY = 1440;
  const WEEKEND_START_MINUTE = 5 * MINUTES_PER_DAY + 17 * 60;
  const WEEKEND_END_MINUTE = 7 * MINUTES_PER_DAY + 17 * 60;

  let adjustedMinuteOfWeek = day * MINUTES_PER_DAY + minutes;
  if (day === 0) {
    adjustedMinuteOfWeek += 7 * MINUTES_PER_DAY;
  }

  const isClosed =
    adjustedMinuteOfWeek >= WEEKEND_START_MINUTE &&
    adjustedMinuteOfWeek < WEEKEND_END_MINUTE;

  if (!isClosed) {
    return { isClosed, countdown: '' };
  }

  const minutesUntilReopen = WEEKEND_END_MINUTE - adjustedMinuteOfWeek;
  const days = Math.floor(minutesUntilReopen / MINUTES_PER_DAY);
  const hours = Math.floor((minutesUntilReopen % MINUTES_PER_DAY) / 60);
  const minutesRemaining = minutesUntilReopen % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutesRemaining > 0 || parts.length === 0) parts.push(`${minutesRemaining}m`);

  return { isClosed, countdown: parts.join(' ') };
};

interface ImprovedTradingDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function ImprovedTradingDashboard({ 
  activeTab: externalActiveTab, 
  onTabChange: externalOnTabChange 
}: ImprovedTradingDashboardProps = {}) {
  const { signOut, user } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { trades, openTrades, closedTrades, canAddTrade, dailyLosses, refreshTrades } = useTradesOptimized();
  const { toast } = useToast();
  
  // Mobile optimizations
  const {
    isMobile,
    isOnline,
    isLowBandwidth,
    orientation,
    touchSupport,
    enableHapticFeedback,
    enableOfflineMode,
    disableOfflineMode,
    isOfflineMode,
  } = useMobileOptimizations();
  
  const {
    isOffline,
    pendingChanges,
    saveOffline,
    syncPendingChanges,
    clearOfflineData,
  } = useOfflineStorage();
  
  const {
    isSupported: notificationsSupported,
    isEnabled: notificationsEnabled,
    requestPermission: requestNotificationPermission,
    showTradeAlert,
    showBiasAlert,
    showSessionAlert,
  } = usePushNotifications();
  
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCTraderImport, setShowCTraderImport] = useState(false);
  const [showSetupManager, setShowSetupManager] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(getActiveSession());
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState('dashboard');
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addTradeWithDate, setAddTradeWithDate] = useState<Date | null>(null);
  
  // Use external tab state if provided, otherwise use internal state
  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = externalOnTabChange ?? setInternalActiveTab;
  const { biasState, loading: biasLoading, saveBiasState, schemaMessage } = useBiasState();

  // Edit handlers
  const handleEditTrade = (trade: any) => {
    setEditingTrade(trade);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTrade(null);
  };

  // Real-time sync and mobile optimizations
  const { isConnected, lastSyncTime, forceSync } = useRealtimeSync({
    onTradeUpdate: () => {
      logger.realtime('Trade updated via real-time sync');
    },
    onBiasStateUpdate: () => {
      logger.realtime('Bias state updated via real-time sync');
    },
  });

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      setCurrentSession(getActiveSession(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate today's stats - use entry_time for today's trades
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = closedTrades.filter(trade => 
    trade.entry_time && trade.entry_time.startsWith(today)
  );
  
  const todayPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const todayR = todayTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0);
  const todayWins = todayTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const todayLosses = todayTrades.filter(trade => (trade.pnl || 0) < 0).length;
  const winRate = todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : 0;

  // Calculate setup performance with memoization (replacing old model performance)
  const setupPerformance = useMemo(() => {
    // Group trades by setup name (stored in model field)
    const setupGroups: Record<string, any[]> = {};
    closedTrades.forEach(trade => {
      // Clean up legacy model names and use proper setup names
      let setupName = trade.model || 'Unknown';
      
      // Map legacy database values to readable names
      if (setupName === 'trend' || setupName === 'Trend') {
        setupName = 'Trend Setup (Legacy)';
      } else if (setupName === 'mean_reversion' || setupName === 'MeanReversion' || setupName === 'Mean Reversion') {
        setupName = 'Mean Reversion Setup (Legacy)';
      }
      
      if (!setupGroups[setupName]) {
        setupGroups[setupName] = [];
      }
      setupGroups[setupName].push(trade);
    });
    
    // Calculate metrics for each setup
    const setupStats = Object.entries(setupGroups).map(([setupName, trades]) => {
      const wins = trades.filter(trade => (trade.pnl || 0) > 0).length;
      const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Calculate average R multiple
      const totalR = trades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0);
      const avgR = trades.length > 0 ? totalR / trades.length : 0;
      
      // Calculate profit factor
      const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0);
      const losingTrades = trades.filter(trade => (trade.pnl || 0) < 0);
      const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
      
      return {
        setupName,
        trades,
        count: trades.length,
        wins,
        winRate,
        totalPnL,
        avgR,
        profitFactor
      };
    });
    
    // Sort by most traded and return top 3 for dashboard card
    return setupStats.sort((a, b) => b.count - a.count);
  }, [closedTrades]);

  // Plan adherence KPI and consistency (reuse quick calc similar to analytics)
  const planAdherence = useMemo(() => {
    if (closedTrades.length === 0) return 0;
    const followed = closedTrades.filter((t: any) => Array.isArray(t.good_actions) && t.good_actions.includes('Plan Followed')).length;
    return (followed / closedTrades.length) * 100;
  }, [closedTrades]);

  const setupLeaderboard = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; totalR: number; totalPnL: number }>= {};
    closedTrades.forEach((t: any) => {
      const setupName = Array.isArray(t.locations) && t.locations.length > 0 ? String(t.locations[0]) : 'Unknown';
      if (!map[setupName]) map[setupName] = { trades: 0, wins: 0, totalR: 0, totalPnL: 0 };
      map[setupName].trades += 1;
      map[setupName].totalR += t.r_multiple || 0;
      map[setupName].totalPnL += t.pnl || 0;
      if ((t.pnl || 0) > 0) map[setupName].wins += 1;
    });
    const rows = Object.entries(map).map(([setup, data]) => ({
      setup,
      tradeCount: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      avgR: data.trades > 0 ? data.totalR / data.trades : 0,
      totalPnL: data.totalPnL,
    }));
    // Top by avgR, then by winRate
    return rows.sort((a, b) => (b.avgR - a.avgR) || (b.winRate - a.winRate)).slice(0, 3);
  }, [closedTrades]);

  const handleExportCSV = () => {
    const headers = [
      'Date', 'Asset', 'Direction', 'Model', 'Entry', 'Exit', 'Stop', 
      'PnL', 'R Multiple', 'Risk Tier', 'Duration', 'Emotions', 'Notes'
    ];
    
    const csvData = closedTrades.map(trade => [
      format(new Date(trade.entry_time), 'yyyy-MM-dd HH:mm'),
      trade.asset,
      trade.direction,
      trade.model,
      trade.entry_price,
      trade.exit_price || '',
      trade.stop_loss,
      trade.pnl || '',
      trade.r_multiple || '',
      trade.risk_tier.toUpperCase(),
      trade.duration_minutes || '',
      JSON.stringify(trade.emotions),
      trade.notes || ''
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const weekendStatus = getWeekendClosureStatus(currentTime);
  const displaySession = weekendStatus.isClosed ? null : currentSession;

  const handleQuizComplete = async (result: any) => {
    await saveBiasState(result);
    toast({
      title: 'Bias updated',
      description: 'Execution context saved for today.',
    });
  };

  // Export functions for ResponsiveHeader
  const handleExportReport = (format: 'md' | 'csv' | 'json') => {
    const date = new Date().toLocaleDateString();
    const report = `# Trading Journal - ${date}

## Daily Summary
- **Total Trades**: ${closedTrades.length}
- **Win Rate**: ${todayWins > 0 ? Math.round((todayWins / todayTrades.length) * 100) : 0}%
- **Total P&L**: $${todayPnL.toFixed(0)}
- **Average R**: ${todayTrades.length > 0 ? (todayR / todayTrades.length).toFixed(2) : 0}R

## Closed Trades
${todayTrades.map(trade => 
  `- ${trade.exit_time?.split('T')[1]} | ${trade.asset} ${trade.direction} | ${trade.r_multiple?.toFixed(2)}R | $${trade.pnl?.toFixed(0)}`
).join('\n')}

## Notes
- Market bias: ${biasState?.bias || 'Not set'}
- Market state: ${biasState?.market_state || 'Not set'}
`;
    
    if (format === 'md') {
      navigator.clipboard.writeText(report);
      toast({ title: "Report Copied", description: "Markdown report copied to clipboard." });
    } else if (format === 'csv') {
      const csvData = todayTrades.map(t => 
        `${t.exit_time},${t.asset},${t.direction},${t.model},${t.entry_price},${t.exit_price},${t.r_multiple?.toFixed(2)},${t.pnl?.toFixed(0)}`
      ).join('\n');
      const header = 'Timestamp,Asset,Direction,Model,Entry,Exit,R Multiple,P&L\n';
      navigator.clipboard.writeText(header + csvData);
      toast({ title: "CSV Copied", description: "CSV data copied to clipboard." });
    } else if (format === 'json') {
      navigator.clipboard.writeText(JSON.stringify({ trades: todayTrades, stats: { totalTrades: todayTrades.length, totalPnL: todayPnL, winRate: todayWins > 0 ? Math.round((todayWins / todayTrades.length) * 100) : 0 } }, null, 2));
      toast({ title: "JSON Copied", description: "JSON data copied to clipboard." });
    }
  };

  const handleResetDay = async () => {
    if (confirm('Are you sure you want to reset the day? This will clear all today\'s trades and reset your bias state.')) {
      try {
        // Reset bias state
        if (biasState) {
          await saveBiasState({
            bias: 'FLAT' as BiasValue,
            market_state: 'UNCLEAR' as MarketStateValue,
            confidence: null,
            tags: []
          });
        }
        
        // Clear today's trades from database
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('trades')
          .delete()
          .eq('user_id', user?.id)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);
        
        // Also reset today's challenge daily state to clear banked profits and build phase
        if (!error && user?.id) {
          // Get active challenge
          const { data: activeChallenge } = await supabase
            .from('challenge_phases')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          if (activeChallenge) {
            // Reset today's daily state using direct SQL
            await supabase.rpc('reset_challenge_daily_state' as any, {
              p_challenge_id: activeChallenge.id,
              p_date: today
            });
          }
        }
        
        if (error) {
          logger.error('Error resetting day:', error);
          toast({ 
            title: "Reset Failed", 
            description: "Failed to reset day. Please try again.",
            variant: "destructive"
          });
        } else {
          toast({ 
            title: "Day Reset", 
            description: "All today's trades and bias state have been cleared." 
          });
        }
      } catch (error) {
        logger.error('Error in reset day:', error);
        toast({ 
          title: "Reset Failed", 
          description: "An error occurred while resetting the day.",
          variant: "destructive"
        });
      }
    }
  };

  // Quick stats for header
  // Don't render if settings are still loading
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-trading-muted">Loading settings...</div>
      </div>
    );
  }

  const quickStats = [
    { label: 'Open Trades', value: openTrades.length, icon: Activity },
    { label: 'Today P&L', value: `$${todayPnL.toFixed(2)}`, icon: TrendingUp, color: todayPnL >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, icon: Target },
    { label: 'Daily Losses', value: `${dailyLosses}/${settings.maxDailyLosses}`, icon: AlertTriangle, color: dailyLosses >= settings.maxDailyLosses ? 'text-destructive' : 'text-muted-foreground' }
  ];

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Mobile Debug Info - Remove in production */}
      {isMobile && settings.debugMode && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black text-xs p-2 z-50">
          Mobile Debug: {JSON.stringify({
            isMobile,
            isOnline,
            isConnected: !isOffline,
            pendingChanges: pendingChanges.length,
            settingsLoaded: Object.keys(settings).length > 0,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
          }, null, 0)}
        </div>
      )}
      
      {/* Session Information Box */}
      <div className="bg-surface border border-outline rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-on-surface-variant" />
              <span className="text-sm text-on-surface-variant">
                {currentTime.toLocaleTimeString('en-US', {
                  timeZone: 'America/New_York',
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                })} NY
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isMarketOpen(currentTime) ? 'bg-success' : 'bg-error'
              }`}></div>
              <span className="text-sm text-on-surface-variant">
                {displaySession?.name || (isMarketOpen(currentTime) ? 'Market Open' : 'Market Closed')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>{todayTrades.length} trades today</span>
            <span>•</span>
            <span className={todayPnL >= 0 ? 'text-success' : 'text-error'}>
              {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <div className={`container mx-auto ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        <div className={`${settings.compactMode ? 'space-y-3' : 'space-y-6'}`}>
          {/* Bias State & Alerts */}
          <div className={`${settings.compactMode ? 'space-y-2' : 'space-y-3'}`}>
            {!isMobile && (
              <BiasStateCard
                value={biasState}
                onEdit={() => {
                  if (isMobile) {
                    enableHapticFeedback();
                  }
                  setIsQuizOpen(true);
                }}
                loading={biasLoading}
              />
            )}

            {schemaMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                <span className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-100">Bias tracking configuration missing</p>
                  <p className="text-xs text-amber-200/90">{schemaMessage}</p>
                </div>
              </div>
            )}

            {/* Trading Status Alerts */}
            {!canAddTrade && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">
                <span className="mt-0.5 rounded-full bg-red-500/20 p-1 text-red-300">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-100">Trading Disabled</p>
                  <p className="text-xs text-red-200/90">
                    Daily loss limit reached ({dailyLosses}/{settings.maxDailyLosses}). 
                    {settings.enableStopRule ? ' Trading disabled for today.' : ' Consider reducing risk.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main Content - Tab-based rendering */}
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Performance Overview - Ultra Compact Mobile */}
                {isMobile ? (
                  /* Single Compact Mobile Card */
                  <Card className="bg-trading-card border-trading-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-xs text-trading-muted">P&L</div>
                            <div className={`text-lg font-bold ${todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${todayPnL.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-trading-muted">R</div>
                            <div className="text-lg font-bold text-trading-accent">{todayR.toFixed(1)}R</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-trading-muted">Win</div>
                            <div className="text-lg font-bold text-foreground">{winRate.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-trading-muted">Trades</div>
                          <div className="text-lg font-bold text-foreground">{todayTrades.length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Desktop Grid Layout */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-trading-card border-trading-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-success" />
                          Today's Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">P&L:</span>
                            <span className={`font-bold text-base ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                              ${todayPnL.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">R Multiple:</span>
                            <span className="font-bold text-base text-trading-accent">{todayR.toFixed(2)}R</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Win Rate:</span>
                            <span className="font-bold text-base text-foreground">{winRate.toFixed(0)}%</span>
                          </div>
                          <Progress value={winRate} className="mt-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-trading-card border-trading-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                          <Target className="h-4 w-4 text-trading-accent" />
                          Setup Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {setupPerformance.length === 0 ? (
                            <div className="text-center py-4 text-trading-muted text-xs">
                              No setup data yet. Add trades to see performance.
                            </div>
                          ) : (
                            setupPerformance.slice(0, 3).map((setup, index) => (
                              <div 
                                key={setup.setupName}
                                className={`bg-gradient-to-r ${
                                  index === 0 ? 'from-blue-950/20 to-blue-950/10 border-blue-500/20' :
                                  index === 1 ? 'from-purple-950/20 to-purple-950/10 border-purple-500/20' :
                                  'from-emerald-950/20 to-emerald-950/10 border-emerald-500/20'
                                } border rounded-lg p-3`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`text-sm font-medium ${
                                    index === 0 ? 'text-blue-300' :
                                    index === 1 ? 'text-purple-300' :
                                    'text-emerald-300'
                                  }`}>
                                    {setup.setupName}
                                  </span>
                                  <Badge variant="outline" className="text-xs">{setup.count} trades</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-trading-muted">Win Rate:</span>
                                    <span className={`font-bold ml-1 ${
                                      index === 0 ? 'text-blue-300' :
                                      index === 1 ? 'text-purple-300' :
                                      'text-emerald-300'
                                    }`}>
                                      {setup.winRate.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-trading-muted">P&L:</span>
                                    <span className={`font-bold ml-1 ${setup.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      ${setup.totalPnL.toFixed(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-trading-muted">Avg R:</span>
                                    <span className={`font-bold ml-1 ${
                                      index === 0 ? 'text-blue-300' :
                                      index === 1 ? 'text-purple-300' :
                                      'text-emerald-300'
                                    }`}>
                                      {setup.avgR.toFixed(2)}R
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-trading-muted">Profit Factor:</span>
                                    <span className={`font-bold ml-1 ${
                                      index === 0 ? 'text-blue-300' :
                                      index === 1 ? 'text-purple-300' :
                                      'text-emerald-300'
                                    }`}>
                                      {setup.profitFactor.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}

                          <Separator />
                          <div className="flex justify-between text-xs">
                            <span className="text-trading-muted">Total Setups:</span>
                            <span className="font-bold">{setupPerformance.length} setups</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-trading-card border-trading-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                          <Activity className="h-4 w-4 text-trading-accent" />
                          Active Positions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Open Trades:</span>
                            <Badge variant="outline">{openTrades.length}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Daily Losses:</span>
                            <Badge variant={dailyLosses >= settings.maxDailyLosses ? 'destructive' : 'outline'}>
                              {dailyLosses}/{settings.maxDailyLosses}
                            </Badge>
                          </div>
                          {!canAddTrade && (
                            <div className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Day disabled
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-trading-card border-trading-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                          <Clock className="h-4 w-4 text-trading-accent" />
                          Session Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {displaySession ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="font-medium text-foreground">{displaySession.name}</span>
                              </div>
                              <p className="text-xs text-trading-muted">{displaySession.localTime}</p>
                              {displaySession.description && (
                                <p className="text-xs text-muted-foreground">{displaySession.description}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-trading-muted">No active session</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Challenge Status Card */}
                {/* <ChallengeStatusCard /> */} {/* Disabled due to RPC function issues */}

                {/* Edge Health */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                      <Brain className="h-4 w-4 text-trading-accent" />
                      Edge Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-trading-accent">
                          {setupPerformance.length > 0 
                            ? (setupPerformance.reduce((sum, s) => sum + s.profitFactor, 0) / setupPerformance.length).toFixed(2)
                            : '0.00'}
                        </div>
                        <div className="text-xs text-trading-muted">Profit Factor</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-trading-accent">{planAdherence.toFixed(0)}%</div>
                        <div className="text-xs text-trading-muted">Plan Adherence</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${winRate >= 50 ? 'text-success' : 'text-destructive'}`}>{winRate.toFixed(0)}%</div>
                        <div className="text-xs text-trading-muted">Win Rate (Today)</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-trading-accent">{todayR.toFixed(2)}R</div>
                        <div className="text-xs text-trading-muted">Total R (Today)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Setup Leaderboard */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                      <Target className="h-4 w-4 text-trading-accent" />
                      Top Setups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {setupLeaderboard.length === 0 ? (
                      <div className="text-xs text-trading-muted">No setup data yet</div>
                    ) : (
                      <div className="space-y-2">
                        {setupLeaderboard.map((row) => (
                          <div key={row.setup} className="flex items-center justify-between p-3 rounded-lg border border-trading-border">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">{row.tradeCount} trades</Badge>
                              <span className="font-semibold text-foreground">{row.setup.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-trading-muted">Win:</span>
                              <span className="font-bold">{row.winRate.toFixed(0)}%</span>
                              <span className="text-trading-muted">Avg R:</span>
                              <span className="font-bold">{row.avgR.toFixed(2)}R</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DailyWrap />
              </div>
            )}

            {activeTab === 'trades' && (
              <div className="space-y-4">
              {/* Import Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCTraderImport(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import from cTrader
                </Button>
              </div>
              
              {/* Open Trades */}
              <Card className="bg-trading-card border-trading-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-trading-accent" />
                    Open Trades ({openTrades.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {openTrades.length > 0 ? (
                    <div className={isMobile ? "space-y-2" : "space-y-4"}>
                      {openTrades.map(trade => (
                        isMobile ? (
                          <MobileTradeCard 
                            key={trade.id} 
                            trade={trade} 
                            isOpen={true}
                            onEdit={handleEditTrade}
                          />
                        ) : (
                          <TradeCard 
                            key={trade.id} 
                            trade={trade} 
                            isOpen={true}
                            onEdit={handleEditTrade}
                          />
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-trading-muted">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No open trades found</p>
                      <p className="text-sm mt-2">Add a trade using the + button to see it here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Closed Trades */}
              <Card className="bg-trading-card border-trading-border">
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={isMobile ? "space-y-1" : "space-y-3"}>
                    {closedTrades.slice(0, isMobile ? 8 : 10).map(trade => (
                      isMobile ? (
                        <MobileTradeCard 
                          key={trade.id} 
                          trade={trade} 
                          isOpen={false}
                          onEdit={handleEditTrade}
                        />
                      ) : (
                        <TradeCard 
                          key={trade.id} 
                          trade={trade} 
                          isOpen={false}
                          onEdit={handleEditTrade}
                        />
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <TradingAnalytics />
                <TradingCalendar 
                  trades={closedTrades} 
                  onAddTrade={(date) => {
                    setAddTradeWithDate(date);
                    setShowAddTrade(true);
                  }}
                />
                <TradeHeatmap trades={closedTrades} />
              </div>
            )}

            {activeTab === 'challenge' && (
              <DisciplineChallengeDashboard />
            )}

            {activeTab === 'reflection' && (
              <ReflectionPage />
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Floating Add Button with Polish */}
      <Button
        onClick={() => {
          if (isMobile) {
            enableHapticFeedback();
          }
          setShowAddTrade(true);
        }}
        className={`fixed ${isMobile ? 'bottom-20 right-4 h-14 w-14' : 'bottom-24 right-8 h-20 w-20'} 
          rounded-full shadow-2xl bg-gradient-to-br from-trading-accent via-purple-600 to-blue-600 
          hover:scale-110 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
          active:scale-95 
          transition-all duration-300 ease-out
          z-40 
          border-2 border-white/20
          backdrop-blur-sm
          group
          disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
          mobile-touch-target mobile-haptic`}
        size="icon"
        disabled={!canAddTrade && dailyLosses >= settings.maxDailyLosses}
      >
        <Plus className={`${isMobile ? 'h-6 w-6' : 'h-10 w-10'} 
          text-white drop-shadow-lg 
          transition-transform duration-300 
          group-hover:rotate-90`} 
        />
        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-20" />
      </Button>

      <BiasQuizModal
        open={isQuizOpen}
        onOpenChange={setIsQuizOpen}
        onComplete={handleQuizComplete}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Add Trade Bottom Sheet - Conditional based on journal mode */}
      {settings.journalMode === 'simple' ? (
        <SimplifiedAddTradeSheet
          isOpen={showAddTrade}
          onClose={() => {
            setShowAddTrade(false);
            setAddTradeWithDate(null);
          }}
          onManageSetups={() => setShowSetupManager(true)}
        />
      ) : (
        <AddTradeBottomSheet
          isOpen={showAddTrade}
          onClose={() => {
            setShowAddTrade(false);
            setAddTradeWithDate(null);
          }}
          biasState={biasState}
          onRequestBiasEdit={() => setIsQuizOpen(true)}
          refreshTrades={refreshTrades}
          presetDate={addTradeWithDate}
          onManageSetups={() => setShowSetupManager(true)}
        />
      )}

      {/* Setup Manager Modal */}
      <SetupManager
        isOpen={showSetupManager}
        onClose={() => setShowSetupManager(false)}
      />

      {/* Edit Trade Modal */}
      <EditTradeModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        trade={editingTrade}
      />

      {/* cTrader Import Modal */}
      <CTraderImportModal
        isOpen={showCTraderImport}
        onClose={() => setShowCTraderImport(false)}
        onImportComplete={refreshTrades}
      />

      {/* Footer Navigation - only show if not using external navigation */}
      {!externalOnTabChange && (
        <ResponsiveFooter
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isMobile={isMobile}
        />
      )}

      {/* Debug Panel - Development Only */}
      <DebugPanel />
    </div>
  );
}
