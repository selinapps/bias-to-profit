import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock,
  Brain,
  AlertTriangle,
  Download,
  BarChart3,
  Activity,
  Shield,
  Timer,
  Zap,
  TrendingUpIcon,
  PieChart,
  LineChart
} from 'lucide-react';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { format, isToday } from 'date-fns';

export function DailyWrap() {
  const { closedTrades } = useTradesOptimized();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check if it's wrap time (21:00)
  const isWrapTime = currentTime.getHours() >= 21;

  // Get today's trades
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = closedTrades.filter(trade => 
    trade.exit_time && trade.exit_time.startsWith(today)
  );

  // Calculate stats
  const totalPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalR = todayTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0);
  const wins = todayTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const losses = todayTrades.filter(trade => (trade.pnl || 0) < 0).length;
  const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;
  const avgR = todayTrades.length > 0 ? totalR / todayTrades.length : 0;

  const winningTrades = todayTrades.filter(trade => (trade.r_multiple || 0) > 0);
  const losingTrades = todayTrades.filter(trade => (trade.r_multiple || 0) < 0);

  const bestTrade = winningTrades.reduce<typeof todayTrades[number] | null>((best, trade) => {
    if (!best) return trade;
    return (trade.r_multiple || 0) > (best.r_multiple || 0) ? trade : best;
  }, null);

  const worstTrade = losingTrades.reduce<typeof todayTrades[number] | null>((worst, trade) => {
    if (!worst) return trade;
    return (trade.r_multiple || 0) < (worst.r_multiple || 0) ? trade : worst;
  }, null);

  const formatRMultiple = (value?: number | null) => {
    if (typeof value !== 'number') return '0.00R';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}R`;
  };

  // Hour performance - Use exit_time for closed trades to show when they were actually closed
  const hourPerformance = todayTrades.reduce((acc, trade) => {
    // Only use exit_time for closed trades, skip trades without exit_time
    if (!trade.exit_time) return acc;

    const hour = new Date(trade.exit_time).getHours();
    if (!acc[hour]) acc[hour] = { trades: 0, pnl: 0 };
    acc[hour].trades++;
    acc[hour].pnl += trade.pnl || 0;
    return acc;
  }, {} as Record<number, { trades: number; pnl: number }>);

  const bestHour = Object.entries(hourPerformance).reduce<{ hour: number; data: { trades: number; pnl: number } } | null>((best, [hour, data]) => {
    // Only consider profitable hours
    if (data.pnl <= 0) return best;
    
    if (!best || data.pnl > best.data.pnl || (data.pnl === best.data.pnl && data.trades > best.data.trades)) {
      return { hour: parseInt(hour, 10), data };
    }
    return best;
  }, null);


  // Mistake analysis
  const allMistakes = todayTrades.flatMap(trade => trade.mistake_tags || []);
  const mistakeCount = allMistakes.reduce((acc, mistake) => {
    acc[mistake] = (acc[mistake] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topMistakes = Object.entries(mistakeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Emotion correlation
  const avgEmotions = todayTrades.reduce((acc, trade) => {
    if (trade.emotions) {
      Object.entries(trade.emotions as any).forEach(([key, value]) => {
        if (!acc[key]) acc[key] = { sum: 0, count: 0 };
        acc[key].sum += value as number;
        acc[key].count++;
      });
    }
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  const emotionAverages = Object.entries(avgEmotions).map(([key, data]) => ({
    emotion: key,
    average: data.sum / data.count
  }));

  // Advanced Metrics Calculations
  const advancedMetrics = (() => {
    // Total R (already calculated above)
    const totalRValue = totalR;
    
    // Expectancy (R) = (Win% × AvgWinR) - (Loss% × AvgLossR)
    const winningTrades = todayTrades.filter(trade => (trade.r_multiple || 0) > 0);
    const losingTrades = todayTrades.filter(trade => (trade.r_multiple || 0) < 0);
    
    const winRateDecimal = winRate / 100;
    const lossRateDecimal = 1 - winRateDecimal;
    
    const avgWinR = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / winningTrades.length 
      : 0;
    
    const avgLossR = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / losingTrades.length)
      : 0;
    
    const expectancy = (winRateDecimal * avgWinR) - (lossRateDecimal * avgLossR);
    
    // Profit Factor = ΣWins ÷ ΣLosses
    const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    
    // Average Hold Time
    const tradesWithDuration = todayTrades.filter(trade => trade.duration_minutes);
    const avgHoldTime = tradesWithDuration.length > 0 
      ? tradesWithDuration.reduce((sum, trade) => sum + (trade.duration_minutes || 0), 0) / tradesWithDuration.length
      : 0;
    
    // Rule Compliance % (trades without violation / total trades)
    const tradesWithoutViolations = todayTrades.filter(trade => 
      !trade.mistake_tags || trade.mistake_tags.length === 0
    );
    const ruleCompliance = todayTrades.length > 0 
      ? (tradesWithoutViolations.length / todayTrades.length) * 100 
      : 100;
    
    return {
      totalR: totalRValue,
      expectancy,
      profitFactor,
      avgHoldTime,
      ruleCompliance,
      avgWinR,
      avgLossR
    };
  })();

  // Trade Management Summary Calculations
  const tradeManagementSummary = (() => {
    // Analyze trades for BE moves, partial hits, etc.
    const tradesWithManagement = todayTrades.filter(trade => 
      trade.notes && trade.notes.toLowerCase().includes('be') || 
      trade.good_actions?.some(action => action.includes('BE') || action.includes('breakeven'))
    );
    
    // Partial hit tracking (trades that mention 2R partial)
    const partialHitTrades = todayTrades.filter(trade => 
      trade.notes?.toLowerCase().includes('2r') || 
      trade.notes?.toLowerCase().includes('partial') ||
      trade.good_actions?.some(action => action.includes('2R') || action.includes('partial'))
    );
    
    // BE before 2R tracking
    const beBefore2RTrades = tradesWithManagement.filter(trade => 
      trade.notes?.toLowerCase().includes('be') && 
      (trade.r_multiple || 0) < 2 && (trade.r_multiple || 0) > 0
    );
    
    // Average final R after partials
    const finalRTrades = partialHitTrades.filter(trade => (trade.r_multiple || 0) > 0);
    const avgFinalR = finalRTrades.length > 0 
      ? finalRTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / finalRTrades.length
      : 0;
    
    return {
      avgBEMove: tradesWithManagement.length > 0 ? 1.0 : 0, // Default assumption
      partialHitPercent: todayTrades.length > 0 ? (partialHitTrades.length / todayTrades.length) * 100 : 0,
      stoppedAtBEBefore2R: todayTrades.length > 0 ? (beBefore2RTrades.length / todayTrades.length) * 100 : 0,
      avgFinalRAfterPartial: avgFinalR
    };
  })();

  // Order Flow Performance Summary
  const orderFlowPerformance = (() => {
    // Group trades by setup/model
    const setupPerformance = todayTrades.reduce((acc, trade) => {
      // Get setup name from locations array
      const setup = (Array.isArray(trade.locations) && trade.locations.length > 0) 
        ? String(trade.locations[0]) 
        : (trade.notes || 'Unknown');
      if (!acc[setup]) {
        acc[setup] = { trades: 0, totalR: 0, wins: 0 };
      }
      acc[setup].trades++;
      acc[setup].totalR += (trade.r_multiple || 0);
      if ((trade.r_multiple || 0) > 0) acc[setup].wins++;
      return acc;
    }, {} as Record<string, { trades: number; totalR: number; wins: number }>);
    
    // Calculate avg R by setup
    const avgRBySetup = Object.entries(setupPerformance).map(([setup, data]) => ({
      setup,
      avgR: data.totalR / data.trades,
      winRate: (data.wins / data.trades) * 100,
      tradeCount: data.trades
    }));
    
    // Session performance
    const sessionPerformance = todayTrades.reduce((acc, trade) => {
      const session = trade.trading_session || 'Unknown';
      if (!acc[session]) {
        acc[session] = { trades: 0, totalR: 0, wins: 0 };
      }
      acc[session].trades++;
      acc[session].totalR += (trade.r_multiple || 0);
      if ((trade.r_multiple || 0) > 0) acc[session].wins++;
      return acc;
    }, {} as Record<string, { trades: number; totalR: number; wins: number }>);
    
    const avgRBySession = Object.entries(sessionPerformance).map(([session, data]) => ({
      session,
      avgR: data.totalR / data.trades,
      winRate: (data.wins / data.trades) * 100,
      tradeCount: data.trades
    }));
    
    return {
      avgRBySetup,
      avgRBySession
    };
  })();

  // Behavior & Discipline Insights
  const behaviorInsights = (() => {
    // Most common emotion
    const emotionCounts = todayTrades.reduce((acc, trade) => {
      if (trade.emotions) {
        Object.entries(trade.emotions as Record<string, any>).forEach(([emotion, intensity]) => {
          if (typeof intensity === 'number' && intensity > 5) { // High intensity emotions
            acc[emotion] = (acc[emotion] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
    
    // Average discipline score (based on rule compliance and good actions)
    const disciplineScores = todayTrades.map(trade => {
      let score = 5; // Start with perfect score
      
      // Deduct for mistakes
      if (trade.mistake_tags && trade.mistake_tags.length > 0) {
        score -= trade.mistake_tags.length * 0.5;
      }
      
      // Add for good actions
      if (trade.good_actions && trade.good_actions.length > 0) {
        score += trade.good_actions.length * 0.2;
      }
      
      return Math.max(1, Math.min(5, score)); // Clamp between 1-5
    });
    
    const avgDisciplineScore = disciplineScores.length > 0 
      ? disciplineScores.reduce((sum, score) => sum + score, 0) / disciplineScores.length 
      : 5;
    
    // Guardrail violations (trades with specific mistake patterns)
    const guardrailViolations = todayTrades.filter(trade => 
      trade.mistake_tags?.some(mistake => 
        mistake.includes('stop loss') || 
        mistake.includes('overtrade') || 
        mistake.includes('emotional')
      )
    ).length;
    
    // Trades near news (placeholder - would need news data)
    const tradesNearNews = 0; // Would need to implement news tracking
    
    return {
      mostCommonEmotion,
      avgDisciplineScore,
      guardrailViolations,
      tradesNearNews
    };
  })();

  const handleExportReport = () => {
    const report = {
      date: format(new Date(), 'yyyy-MM-dd'),
      summary: {
        totalTrades: todayTrades.length,
        totalPnL,
        totalR,
        winRate,
        avgR
      },
      advancedMetrics,
      tradeManagementSummary,
      orderFlowPerformance,
      behaviorInsights,
      trades: todayTrades.map(trade => ({
        asset: trade.asset,
        direction: trade.direction,
        model: (Array.isArray(trade.locations) && trade.locations.length > 0) 
          ? String(trade.locations[0]) 
          : (trade.notes || 'Unknown'),
        pnl: trade.pnl,
        rMultiple: trade.r_multiple,
        entryTime: trade.entry_time,
        emotions: trade.emotions,
        mistakes: trade.mistake_tags
      })),
      analysis: {
        bestHour: bestHour?.hour,
        topMistakes,
        emotionAverages
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-wrap-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (todayTrades.length === 0) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-trading-accent" />
            Daily Wrap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-trading-muted text-center py-8">
            No trades completed today. Start trading to see your daily wrap!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-trading-accent" />
            Daily Wrap - {format(new Date(), 'MMMM d, yyyy')}
          </CardTitle>
          {isWrapTime && (
            <Badge variant="default" className="bg-gradient-primary">
              Wrap Time
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${totalPnL.toFixed(2)}
              </div>
              <div className="text-sm text-trading-muted">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-trading-accent">{totalR.toFixed(2)}R</div>
              <div className="text-sm text-trading-muted">Total R</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{winRate.toFixed(0)}%</div>
              <div className="text-sm text-trading-muted">Win Rate</div>
              <Progress value={winRate} className="mt-1 h-1" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-trading-accent">{avgR.toFixed(2)}R</div>
              <div className="text-sm text-trading-muted">Avg R</div>
            </div>
          </div>

          {/* Trade Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-background border-trading-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">{todayTrades.length}</div>
                    <div className="text-sm text-trading-muted">Total Trades</div>
                  </div>
                  <Target className="h-8 w-8 text-trading-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-trading-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-success">{wins}</div>
                    <div className="text-sm text-trading-muted">Winners</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-trading-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-destructive">{losses}</div>
                    <div className="text-sm text-trading-muted">Losers</div>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best/Worst Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestTrade && (
              <Card className="bg-background border-success">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-success">Best Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{bestTrade.asset} {bestTrade.direction.toUpperCase()}</div>
                    <div className="text-sm text-trading-muted">
                      {format(new Date(bestTrade.exit_time || bestTrade.entry_time), 'HH:mm')} (closed)
                    </div>
                    <div className="text-success font-bold">{formatRMultiple(bestTrade.r_multiple)}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {worstTrade && (
              <Card className="bg-background border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-destructive">Worst Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{worstTrade.asset} {worstTrade.direction.toUpperCase()}</div>
                    <div className="text-sm text-trading-muted">
                      {format(new Date(worstTrade.exit_time || worstTrade.entry_time), 'HH:mm')} (closed)
                    </div>
                    <div className="text-destructive font-bold">{formatRMultiple(worstTrade.r_multiple)}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hour Performance */}
          {bestHour && (
            <Card className="bg-background border-trading-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Best Hour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-success">
                  {bestHour.hour}:00 - {bestHour.hour + 1}:00
                </div>
                <div className="text-sm text-trading-muted">
                  {bestHour.data.trades} trades • ${bestHour.data.pnl.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Mistakes */}
          {topMistakes.length > 0 && (
            <Card className="bg-background border-trading-border">
              <CardHeader>
                <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Top Mistakes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topMistakes.map(([mistake, count]) => (
                    <div key={mistake} className="flex justify-between items-center">
                      <span className="text-sm">{mistake}</span>
                      <Badge variant="destructive">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emotion Correlation */}
          {emotionAverages.length > 0 && (
            <Card className="bg-background border-trading-border">
              <CardHeader>
                <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Average Emotions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emotionAverages.map(({ emotion, average }) => (
                    <div key={emotion}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{emotion.replace('_', ' ↔ ')}</span>
                        <span className="font-bold">{average.toFixed(1)}</span>
                      </div>
                      <Progress value={average * 10} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Metrics */}
          <Card className="bg-background border-trading-border">
            <CardHeader>
              <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Advanced Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{advancedMetrics.totalR.toFixed(2)}R</div>
                  <div className="text-xs text-trading-muted">Total R</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${advancedMetrics.expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {advancedMetrics.expectancy.toFixed(2)}R
                  </div>
                  <div className="text-xs text-trading-muted">Expectancy</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{advancedMetrics.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-trading-muted">Profit Factor</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">
                    {Math.round(advancedMetrics.avgHoldTime / 60)}m
                  </div>
                  <div className="text-xs text-trading-muted">Avg Hold Time</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-trading-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-trading-muted">Rule Compliance</span>
                  <div className="flex items-center gap-2">
                    <Progress value={advancedMetrics.ruleCompliance} className="w-20 h-2" />
                    <span className="text-sm font-bold">{advancedMetrics.ruleCompliance.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Management Summary */}
          <Card className="bg-background border-trading-border">
            <CardHeader>
              <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                <Target className="h-4 w-4" />
                Trade Management Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{tradeManagementSummary.avgBEMove.toFixed(1)}R</div>
                  <div className="text-xs text-trading-muted">Avg BE Move</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-success">{tradeManagementSummary.partialHitPercent.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Partial Hit %</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">{tradeManagementSummary.stoppedAtBEBefore2R.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Stopped at BE &lt; 2R</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{tradeManagementSummary.avgFinalRAfterPartial.toFixed(2)}R</div>
                  <div className="text-xs text-trading-muted">Avg Final R</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Flow Performance */}
          {orderFlowPerformance.avgRBySetup.length > 0 && (
            <Card className="bg-background border-trading-border">
              <CardHeader>
                <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Order Flow Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Setup Performance</h4>
                    <div className="space-y-2">
                      {orderFlowPerformance.avgRBySetup.map(({ setup, avgR, winRate, tradeCount }) => (
                        <div key={setup} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                          <span className="text-sm">{setup.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="font-bold text-trading-accent">{avgR.toFixed(2)}R</span>
                            <span className="text-trading-muted">{winRate.toFixed(0)}%</span>
                            <Badge variant="outline">{tradeCount}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {orderFlowPerformance.avgRBySession.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Session Performance</h4>
                      <div className="space-y-2">
                        {orderFlowPerformance.avgRBySession.map(({ session, avgR, winRate, tradeCount }) => (
                          <div key={session} className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                            <span className="text-sm">{session}</span>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="font-bold text-trading-accent">{avgR.toFixed(2)}R</span>
                              <span className="text-trading-muted">{winRate.toFixed(0)}%</span>
                              <Badge variant="outline">{tradeCount}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behavior & Discipline Insights */}
          <Card className="bg-background border-trading-border">
            <CardHeader>
              <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Behavior & Discipline Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent capitalize">{behaviorInsights.mostCommonEmotion}</div>
                  <div className="text-xs text-trading-muted">Most Common Emotion</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{behaviorInsights.avgDisciplineScore.toFixed(1)}/5</div>
                  <div className="text-xs text-trading-muted">Avg Discipline Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">{behaviorInsights.guardrailViolations}</div>
                  <div className="text-xs text-trading-muted">Guardrail Violations</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{behaviorInsights.tradesNearNews}</div>
                  <div className="text-xs text-trading-muted">Trades Near News</div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Export Button */}
          <div className="flex justify-center">
            <Button onClick={handleExportReport} variant="outline" className="w-full max-w-xs">
              <Download className="h-4 w-4 mr-2" />
              Export Daily Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}