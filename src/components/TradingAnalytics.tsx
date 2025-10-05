import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  RefreshCw,
  Target,
  DollarSign,
  Activity
} from 'lucide-react';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { isMeanReversionModel, isTrendModel } from '@/lib/executionModels';
import { format } from 'date-fns';

export function TradingAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const { 
    bestHours, 
    weeklySummary, 
    dailyPerformance, 
    loading, 
    error, 
    refreshAnalytics 
  } = useTradingAnalytics(parseInt(selectedPeriod));
  
  const { closedTrades } = useTradesOptimized();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Calculate model performance
  const modelPerformance = (() => {
    const trendTrades = closedTrades.filter(trade => isTrendModel(trade.model));
    const mrTrades = closedTrades.filter(trade => isMeanReversionModel(trade.model));
    
    const trendWins = trendTrades.filter(trade => (trade.pnl || 0) > 0).length;
    const mrWins = mrTrades.filter(trade => (trade.pnl || 0) > 0).length;
    
    const trendWinRate = trendTrades.length > 0 ? (trendWins / trendTrades.length) * 100 : 0;
    const mrWinRate = mrTrades.length > 0 ? (mrWins / mrTrades.length) * 100 : 0;
    
    // Calculate P&L and R multiples
    const trendPnL = trendTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const mrPnL = mrTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // Calculate R multiples - only include trades with valid R multiples
    const trendValidRMultiples = trendTrades
      .filter(trade => trade.r_multiple !== null && trade.r_multiple !== undefined && trade.r_multiple !== 0)
      .map(trade => trade.r_multiple!);
    
    const mrValidRMultiples = mrTrades
      .filter(trade => trade.r_multiple !== null && trade.r_multiple !== undefined && trade.r_multiple !== 0)
      .map(trade => trade.r_multiple!);
    
    const avgTrendR = trendValidRMultiples.length > 0 
      ? trendValidRMultiples.reduce((sum, r) => sum + r, 0) / trendValidRMultiples.length 
      : 0;
    
    const avgMrR = mrValidRMultiples.length > 0 
      ? mrValidRMultiples.reduce((sum, r) => sum + r, 0) / mrValidRMultiples.length 
      : 0;
    
    // Calculate profit factor
    const trendWinningTrades = trendTrades.filter(trade => (trade.pnl || 0) > 0);
    const trendLosingTrades = trendTrades.filter(trade => (trade.pnl || 0) < 0);
    const trendGrossProfit = trendWinningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const trendGrossLoss = Math.abs(trendLosingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const trendProfitFactor = trendGrossLoss > 0 ? trendGrossProfit / trendGrossLoss : 0;
    
    const mrWinningTrades = mrTrades.filter(trade => (trade.pnl || 0) > 0);
    const mrLosingTrades = mrTrades.filter(trade => (trade.pnl || 0) < 0);
    const mrGrossProfit = mrWinningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const mrGrossLoss = Math.abs(mrLosingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const mrProfitFactor = mrGrossLoss > 0 ? mrGrossProfit / mrGrossLoss : 0;
    
    return {
      trendTrades,
      mrTrades,
      trendWins,
      mrWins,
      trendWinRate,
      mrWinRate,
      trendPnL,
      mrPnL,
      avgTrendR,
      avgMrR,
      trendProfitFactor,
      mrProfitFactor
    };
  })();

  if (loading) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-trading-accent" />
            <span className="ml-2 text-trading-muted">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p>{error}</p>
            <Button 
              onClick={refreshAnalytics}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trading Analytics</h2>
          <p className="text-trading-muted">Performance insights and trading patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refreshAnalytics}
            variant="outline"
            size="sm"
            className="hover:bg-trading-accent/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['7', '30', '90'] as const).map((period) => (
          <Button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
          >
            {period} days
          </Button>
        ))}
      </div>

      <Tabs defaultValue="best-hours" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 grid-rows-2 sm:grid-rows-1 h-12 sm:h-10">
          <TabsTrigger value="best-hours" className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Hours</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            <span>Daily</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            <span>Models</span>
          </TabsTrigger>
        </TabsList>

        {/* Best Trading Hours */}
        <TabsContent value="best-hours" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-trading-accent" />
                Best Trading Hours
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Hours ranked by profitability over the last {selectedPeriod} days
              </p>
            </CardHeader>
            <CardContent>
              {bestHours.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trading data available for analysis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bestHours.slice(0, 10).map((hour, index) => (
                    <div
                      key={hour.hour_of_day}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        index < 3 
                          ? 'bg-success/10 border-success/20' 
                          : hour.total_pnl > 0 
                            ? 'bg-success/5 border-success/10' 
                            : 'bg-destructive/5 border-destructive/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 
                            ? 'bg-success text-success-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {formatHour(hour.hour_of_day)}
                          </div>
                          <div className="text-xs text-trading-muted">
                            {hour.trade_count} trades • {hour.win_rate.toFixed(1)}% win rate
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          hour.total_pnl > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {formatCurrency(hour.total_pnl)}
                        </div>
                        <div className="text-xs text-trading-muted">
                          {hour.avg_r_multiple.toFixed(2)}R avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Summary */}
        <TabsContent value="weekly" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-trading-accent" />
                Weekly Summary
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Weekly performance breakdown
              </p>
            </CardHeader>
            <CardContent>
              {weeklySummary.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No weekly data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weeklySummary.map((week, index) => (
                    <div
                      key={week.week_start}
                      className={`p-4 rounded-lg border ${
                        week.total_pnl > 0 
                          ? 'bg-success/10 border-success/20' 
                          : week.total_pnl < 0 
                            ? 'bg-destructive/10 border-destructive/20'
                            : 'bg-muted/10 border-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            Week of {format(new Date(week.week_start), 'MMM d')}
                          </div>
                          <div className="text-xs text-trading-muted">
                            {week.trading_days} trading days • {week.trade_count} trades
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            week.total_pnl > 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {formatCurrency(week.total_pnl)}
                          </div>
                          <div className="text-xs text-trading-muted">
                            {week.win_rate.toFixed(1)}% win rate
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          <span>{week.avg_r_multiple.toFixed(2)}R avg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span>{week.trading_days} active days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Performance */}
        <TabsContent value="daily" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-trading-accent" />
                Daily Performance
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Day-by-day trading results
              </p>
            </CardHeader>
            <CardContent>
              {dailyPerformance.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No daily data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyPerformance.slice(0, 20).map((day) => (
                    <div
                      key={day.trade_date}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        day.total_pnl > 0 
                          ? 'bg-success/10 border-success/20' 
                          : day.total_pnl < 0 
                            ? 'bg-destructive/10 border-destructive/20'
                            : 'bg-muted/10 border-muted/20'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {format(new Date(day.trade_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-trading-muted">
                          {day.trade_count} trades • {day.wins}W/{day.losses}L
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          day.total_pnl > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {formatCurrency(day.total_pnl)}
                        </div>
                        <div className="text-xs text-trading-muted">
                          {day.win_rate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Performance */}
        <TabsContent value="models" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-trading-accent" />
                Model Performance
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Performance comparison between trading models
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Trend Model Stats */}
                <div className="bg-gradient-to-r from-blue-950/20 to-blue-950/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-300">Trend Model</h3>
                    <Badge variant="outline" className="text-sm">
                      {modelPerformance.trendTrades.length} trades
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">
                        {modelPerformance.trendWinRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-trading-muted">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${modelPerformance.trendPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(modelPerformance.trendPnL)}
                      </div>
                      <div className="text-xs text-trading-muted">Total P&L</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">
                        {modelPerformance.avgTrendR.toFixed(2)}R
                      </div>
                      <div className="text-xs text-trading-muted">Avg R Multiple</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">
                        {modelPerformance.trendProfitFactor.toFixed(2)}
                      </div>
                      <div className="text-xs text-trading-muted">Profit Factor</div>
                    </div>
                  </div>
                </div>

                {/* Mean Reversion Model Stats */}
                <div className="bg-gradient-to-r from-purple-950/20 to-purple-950/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-300">Mean Reversion Model</h3>
                    <Badge variant="outline" className="text-sm">
                      {modelPerformance.mrTrades.length} trades
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-300">
                        {modelPerformance.mrWinRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-trading-muted">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${modelPerformance.mrPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(modelPerformance.mrPnL)}
                      </div>
                      <div className="text-xs text-trading-muted">Total P&L</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-300">
                        {modelPerformance.avgMrR.toFixed(2)}R
                      </div>
                      <div className="text-xs text-trading-muted">Avg R Multiple</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-300">
                        {modelPerformance.mrProfitFactor.toFixed(2)}
                      </div>
                      <div className="text-xs text-trading-muted">Profit Factor</div>
                    </div>
                  </div>
                </div>

                {/* Model Comparison */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Model Comparison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Total Trades:</span>
                        <span className="font-bold">
                          {modelPerformance.trendTrades.length + modelPerformance.mrTrades.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Trend Model:</span>
                        <span className="font-bold text-blue-300">
                          {modelPerformance.trendTrades.length} trades
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Mean Reversion:</span>
                        <span className="font-bold text-purple-300">
                          {modelPerformance.mrTrades.length} trades
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Best Win Rate:</span>
                        <span className={`font-bold ${modelPerformance.trendWinRate > modelPerformance.mrWinRate ? 'text-blue-300' : 'text-purple-300'}`}>
                          {Math.max(modelPerformance.trendWinRate, modelPerformance.mrWinRate).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Best P&L:</span>
                        <span className={`font-bold ${modelPerformance.trendPnL > modelPerformance.mrPnL ? 'text-blue-300' : 'text-purple-300'}`}>
                          {formatCurrency(Math.max(modelPerformance.trendPnL, modelPerformance.mrPnL))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-trading-muted">Best Profit Factor:</span>
                        <span className={`font-bold ${modelPerformance.trendProfitFactor > modelPerformance.mrProfitFactor ? 'text-blue-300' : 'text-purple-300'}`}>
                          {Math.max(modelPerformance.trendProfitFactor, modelPerformance.mrProfitFactor).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
