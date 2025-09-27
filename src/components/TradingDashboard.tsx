import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import { AddTradeBottomSheet } from './AddTradeBottomSheet';
import { DailyWrap } from './DailyWrap';
import { HypothesisMode } from './HypothesisMode';
import { TradeHeatmap } from './TradeHeatmap';
import { format } from 'date-fns';
import { TRADING_SESSIONS, getActiveSession, type TradingSession } from '@/lib/tradingSessions';
import { BiasStateCard } from './BiasStateCard';
import { BiasQuizModal } from './BiasQuizModal';
import { useBiasState } from '@/hooks/useBiasState';
import type { BiasQuizResult } from '@/types/bias';
import { useToast } from '@/hooks/use-toast';
import { isMeanReversionModel, isTrendModel } from '@/lib/executionModels';

const EST_TIME_ZONE = 'America/New_York';
const MINUTES_PER_DAY = 1440;
const WEEKEND_START_MINUTE = 5 * MINUTES_PER_DAY + 17 * 60;
const WEEKEND_END_MINUTE = 7 * MINUTES_PER_DAY + 17 * 60;

const getWeekendClosureStatus = (date: Date) => {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: EST_TIME_ZONE }));
  const day = estDate.getDay();
  const minutes = estDate.getHours() * 60 + estDate.getMinutes();

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

export function TradingDashboard() {
  const { signOut } = useAuth();
  const { trades, openTrades, closedTrades, canAddTrade, dailyLosses } = useTrades();
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(getActiveSession());
  const [isSessionCardExpanded, setIsSessionCardExpanded] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const { biasState, loading: biasLoading, saveBiasState } = useBiasState();
  const { toast } = useToast();

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

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = closedTrades.filter(trade => 
    trade.exit_time && trade.exit_time.startsWith(today)
  );
  
  const todayPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const todayR = todayTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0);
  const todayWins = todayTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const winRate = todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : 0;

  // Calculate model performance
  const trendTrades = closedTrades.filter(trade => isTrendModel(trade.model));
  const mrTrades = closedTrades.filter(trade => isMeanReversionModel(trade.model));
  
  const trendWins = trendTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const mrWins = mrTrades.filter(trade => (trade.pnl || 0) > 0).length;
  
  const trendWinRate = trendTrades.length > 0 ? (trendWins / trendTrades.length) * 100 : 0;
  const mrWinRate = mrTrades.length > 0 ? (mrWins / mrTrades.length) * 100 : 0;

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

  const handleQuizComplete = async (result: BiasQuizResult) => {
    await saveBiasState(result);
    toast({
      title: 'Bias updated',
      description: 'Execution context saved for today.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-trading-card border-b border-trading-border shadow-trading">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-primary">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Bias to Profit</h1>
                  <p className="text-sm text-trading-muted">
                    {format(currentTime, 'EEEE, MMMM d, yyyy • HH:mm')}
                  </p>
                  <div className="mt-1 space-y-1 text-xs sm:text-sm">
                    {weekendStatus.isClosed ? (
                      <div className="flex items-center gap-2 text-destructive">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span>
                          Market closed for the weekend — reopens in {weekendStatus.countdown}.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-trading-muted">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          {displaySession ? (
                            <span>
                              {displaySession.name}
                              <span className="hidden sm:inline"> • {displaySession.localTime}</span>
                            </span>
                          ) : (
                            <span>No active session</span>
                          )}
                        </div>
                        {displaySession?.description && (
                          <p className="text-xs text-muted-foreground">
                            {displaySession.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <BiasStateCard
            value={biasState ?? undefined}
            onEdit={() => setIsQuizOpen(true)}
            loading={biasLoading}
          />

          {/* Current Session & Quick Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-0">
                <button
                type="button"
                onClick={() => setIsSessionCardExpanded(prev => !prev)}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={isSessionCardExpanded}
              >
                <div>
                  <CardTitle className="text-sm text-trading-muted">Active Sessions</CardTitle>
                  <p className="text-xs text-trading-muted/80">
                    {isSessionCardExpanded ? 'Hide session overview' : 'Tap to view all session windows'}
                  </p>
                </div>
                <span className="rounded-md border border-trading-border p-1 text-trading-muted">
                  {isSessionCardExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              {isSessionCardExpanded ? (
                <div className="space-y-3">
                  {TRADING_SESSIONS.map(session => {
                    const isActive = !weekendStatus.isClosed && displaySession?.id === session.id;
                    return (
                      <div
                        key={session.id}
                        className={`rounded-md border px-3 py-2 text-xs sm:text-sm transition-colors ${
                          isActive
                            ? session.color ?? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/50'
                            : 'border-trading-border text-trading-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-2 w-2 rounded-full ${
                                isActive ? 'bg-emerald-400' : 'bg-muted'
                              }`}
                            />
                            <span className="font-medium">{session.name}</span>
                          </div>
                          <span className={`text-xs ${isActive ? 'text-foreground/80' : 'text-trading-muted'}`}>
                            {session.localTime}
                          </span>
                        </div>
                        <p className={`mt-1 text-xs ${isActive ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                          {session.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {displaySession ? (
                    <div className="rounded-md border border-trading-border px-3 py-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="font-medium text-foreground">{displaySession.name}</span>
                        </div>
                        <span className="text-xs text-trading-muted">{displaySession.localTime}</span>
                      </div>
                      {displaySession.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {displaySession.description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-trading-border px-3 py-4 text-center text-xs text-trading-muted">
                      No active session — tap to view the full schedule.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            </Card>

            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-trading-muted">Today's Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">P&L:</span>
                  <span className={`font-bold ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${todayPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">R Multiple:</span>
                  <span className="font-bold text-trading-accent">{todayR.toFixed(2)}R</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Win Rate:</span>
                  <span className="font-bold text-foreground">{winRate.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-trading-card border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-trading-muted">Trading Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Open Trades:</span>
                  <Badge variant="outline">{openTrades.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Daily Losses:</span>
                  <Badge variant={dailyLosses >= 3 ? 'destructive' : 'outline'}>
                    {dailyLosses}/3
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
          </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-trading-card">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Model Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-trading-card border-trading-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Trend Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Trades:</span>
                      <span className="font-bold">{trendTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <span className="font-bold text-success">{trendWinRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg R:</span>
                      <span className="font-bold text-trading-accent">
                        {trendTrades.length > 0 ? 
                          (trendTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trendTrades.length).toFixed(2) : 
                          '0.00'
                        }R
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-trading-card border-trading-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-trading-accent" />
                    Mean Reversion Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Trades:</span>
                      <span className="font-bold">{mrTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <span className="font-bold text-success">{mrWinRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg R:</span>
                      <span className="font-bold text-trading-accent">
                        {mrTrades.length > 0 ? 
                          (mrTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / mrTrades.length).toFixed(2) : 
                          '0.00'
                        }R
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DailyWrap />
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            {/* Open Trades */}
            {openTrades.length > 0 && (
              <Card className="bg-trading-card border-trading-border">
                <CardHeader>
                  <CardTitle>Open Trades ({openTrades.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {openTrades.map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-trading-border">
                        <div>
                          <div className="font-medium">{trade.asset}</div>
                          <div className="text-sm text-trading-muted">
                            {trade.direction.toUpperCase()} • Entry: {trade.entry_price} • Stop: {trade.stop_loss}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-trading-muted">Risk: ${trade.risk_amount}</div>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Closed Trades */}
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {closedTrades.slice(0, 10).map(trade => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-trading-border">
                      <div>
                        <div className="font-medium">{trade.asset}</div>
                        <div className="text-sm text-trading-muted">
                          {format(new Date(trade.entry_time), 'MMM d, HH:mm')} • {trade.direction.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${(trade.pnl || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${trade.pnl?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-trading-accent">
                          {trade.r_multiple?.toFixed(2) || '0.00'}R
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <TradeHeatmap trades={closedTrades} />
          </TabsContent>

          <TabsContent value="hypothesis">
            <HypothesisMode />
          </TabsContent>
        </Tabs>
      </div>
      </div>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowAddTrade(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-primary hover:opacity-90 z-40"
        size="icon"
        disabled={!canAddTrade && dailyLosses >= 3}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BiasQuizModal
        open={isQuizOpen}
        onOpenChange={setIsQuizOpen}
        onComplete={handleQuizComplete}
      />

      {/* Add Trade Bottom Sheet */}
      <AddTradeBottomSheet
        isOpen={showAddTrade}
        onClose={() => setShowAddTrade(false)}
        biasState={biasState}
        onRequestBiasEdit={() => setIsQuizOpen(true)}
      />
    </div>
  );
}