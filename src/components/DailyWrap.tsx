import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock,
  Brain,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { format, isToday } from 'date-fns';

export function DailyWrap() {
  const { closedTrades } = useTrades();
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

  // Best and worst trades
  const bestTrade = todayTrades.reduce((best, trade) => 
    !best || (trade.r_multiple || 0) > (best.r_multiple || 0) ? trade : best, 
    null as any
  );
  const worstTrade = todayTrades.reduce((worst, trade) => 
    !worst || (trade.r_multiple || 0) < (worst.r_multiple || 0) ? trade : worst, 
    null as any
  );

  // Hour performance
  const hourPerformance = todayTrades.reduce((acc, trade) => {
    const hour = new Date(trade.entry_time).getHours();
    if (!acc[hour]) acc[hour] = { trades: 0, pnl: 0 };
    acc[hour].trades++;
    acc[hour].pnl += trade.pnl || 0;
    return acc;
  }, {} as Record<number, { trades: number; pnl: number }>);

  const bestHour = Object.entries(hourPerformance).reduce(
    (best, [hour, data]) => !best || data.pnl > best.data.pnl ? { hour: parseInt(hour), data } : best,
    null as any
  );

  const worstHour = Object.entries(hourPerformance).reduce(
    (worst, [hour, data]) => !worst || data.pnl < worst.data.pnl ? { hour: parseInt(hour), data } : worst,
    null as any
  );

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
      trades: todayTrades.map(trade => ({
        asset: trade.asset,
        direction: trade.direction,
        model: trade.model,
        pnl: trade.pnl,
        rMultiple: trade.r_multiple,
        entryTime: trade.entry_time,
        emotions: trade.emotions,
        mistakes: trade.mistake_tags
      })),
      analysis: {
        bestHour: bestHour?.hour,
        worstHour: worstHour?.hour,
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
                      {format(new Date(bestTrade.entry_time), 'HH:mm')}
                    </div>
                    <div className="text-success font-bold">+{bestTrade.r_multiple?.toFixed(2)}R</div>
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
                      {format(new Date(worstTrade.entry_time), 'HH:mm')}
                    </div>
                    <div className="text-destructive font-bold">{worstTrade.r_multiple?.toFixed(2)}R</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hour Performance */}
          {(bestHour || worstHour) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {worstHour && (
                <Card className="bg-background border-trading-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-trading-muted flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Worst Hour
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-destructive">
                      {worstHour.hour}:00 - {worstHour.hour + 1}:00
                    </div>
                    <div className="text-sm text-trading-muted">
                      {worstHour.data.trades} trades • ${worstHour.data.pnl.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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