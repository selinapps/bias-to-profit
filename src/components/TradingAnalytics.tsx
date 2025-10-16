import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  RefreshCw,
  Target,
  DollarSign,
  Activity,
  Shield,
  PieChart,
  LineChart,
  Download,
  FileText,
  Brain,
  Zap,
  Timer,
  MoreVertical
} from 'lucide-react';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
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

  // Export Functions
  const exportToCSV = () => {
    const headers = [
      'Date', 'Asset', 'Direction', 'Model', 'Entry Price', 'Exit Price', 'Stop Loss',
      'Lot Size', 'Risk Amount', 'P&L', 'R Multiple', 'Duration (min)', 'Session',
      'Emotions', 'Mistakes', 'Good Actions', 'Notes', 'Screenshot URL'
    ];
    
    const csvData = closedTrades.map(trade => [
      trade.entry_time ? format(new Date(trade.entry_time), 'yyyy-MM-dd HH:mm') : '',
      trade.asset || '',
      trade.direction || '',
      Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : (trade.notes || ''),
      trade.entry_price || '',
      trade.exit_price || '',
      trade.stop_loss || '',
      trade.lot_size || '',
      (trade as Record<string, any>).risk_amount || '',
      trade.pnl || '',
      trade.r_multiple || '',
      trade.duration_minutes || '',
      trade.trading_session || '',
      JSON.stringify(trade.emotions || {}),
      JSON.stringify(trade.mistake_tags || []),
      JSON.stringify(trade.good_actions || []),
      trade.notes || '',
      trade.screenshot_url || ''
    ]);

    const csv = [headers, ...csvData].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWeeklyReport = () => {
    const reportData = {
      reportDate: format(new Date(), 'yyyy-MM-dd'),
      period: `${selectedPeriod} days`,
      summary: {
        totalTrades: closedTrades.length,
        totalPnL: closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
        totalR: weeklyAnalytics.totalR,
        expectancy: weeklyAnalytics.expectancy,
        profitFactor: weeklyAnalytics.profitFactor,
        consistency: weeklyAnalytics.consistency,
        ruleCompliance: weeklyAnalytics.ruleCompliance
      },
      weeklyAnalytics,
      edgeDiagnostics,
      managementEfficiency,
      behaviorSummary,
      equityData,
      bestHours: bestHours.slice(0, 10),
      weeklySummary,
      dailyPerformance: dailyPerformance.slice(0, 20),
      modelPerformance
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-trading-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const compareWithPreviousWeek = () => {
    // This would require historical data - for now, show current vs previous period
    const currentWeekTrades = closedTrades;
    const previousWeekTrades = closedTrades.slice(0, Math.floor(closedTrades.length / 2)); // Simulate previous week
    
    const currentWeekStats = {
      totalTrades: currentWeekTrades.length,
      totalPnL: currentWeekTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
      winRate: currentWeekTrades.length > 0 ? 
        (currentWeekTrades.filter(trade => (trade.pnl || 0) > 0).length / currentWeekTrades.length) * 100 : 0,
      totalR: currentWeekTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0)
    };
    
    const previousWeekStats = {
      totalTrades: previousWeekTrades.length,
      totalPnL: previousWeekTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
      winRate: previousWeekTrades.length > 0 ? 
        (previousWeekTrades.filter(trade => (trade.pnl || 0) > 0).length / previousWeekTrades.length) * 100 : 0,
      totalR: previousWeekTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0)
    };
    
    const comparison = {
      currentWeek: currentWeekStats,
      previousWeek: previousWeekStats,
      changes: {
        pnlChange: currentWeekStats.totalPnL - previousWeekStats.totalPnL,
        winRateChange: currentWeekStats.winRate - previousWeekStats.winRate,
        tradesChange: currentWeekStats.totalTrades - previousWeekStats.totalTrades,
        rChange: currentWeekStats.totalR - previousWeekStats.totalR
      }
    };

    const blob = new Blob([JSON.stringify(comparison, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `week-comparison-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate setup performance (group by setup name)
  const setupPerformance = (() => {
    // Group trades by setup name (stored in locations array - first element)
    const setupGroups: Record<string, any[]> = {};
    closedTrades.forEach(trade => {
      // Get setup name from locations array (where actual setup name is stored)
      let setupName = 'Unknown';
      if (Array.isArray(trade.locations) && trade.locations.length > 0) {
        setupName = String(trade.locations[0]);
      } else if (trade.notes) {
        // Fallback to notes if locations is empty
        setupName = trade.notes;
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
      const validRMultiples = trades
        .filter(trade => trade.r_multiple !== null && trade.r_multiple !== undefined && trade.r_multiple !== 0)
        .map(trade => trade.r_multiple!);
      const avgR = validRMultiples.length > 0 
        ? validRMultiples.reduce((sum, r) => sum + r, 0) / validRMultiples.length 
        : 0;
      
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
    
    // Sort by most traded
    return setupStats.sort((a, b) => b.count - a.count);
  })();

  // Weekly Analytics Calculations
  const weeklyAnalytics = (() => {
    // Calculate weekly KPIs
    const totalR = closedTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0);
    
    // Expectancy calculation for all trades
    const winningTrades = closedTrades.filter(trade => (trade.r_multiple || 0) > 0);
    const losingTrades = closedTrades.filter(trade => (trade.r_multiple || 0) < 0);
    
    const winRateDecimal = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;
    const lossRateDecimal = 1 - winRateDecimal;
    
    const avgWinR = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / winningTrades.length 
      : 0;
    
    const avgLossR = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / losingTrades.length)
      : 0;
    
    const expectancy = (winRateDecimal * avgWinR) - (lossRateDecimal * avgLossR);
    
    // Profit Factor
    const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    
    // Consistency % (profitable days / total trading days)
    const tradingDays = new Set(closedTrades.map(trade => 
      trade.entry_time ? trade.entry_time.split('T')[0] : ''
    )).size;
    
    const profitableDays = new Set(closedTrades
      .filter(trade => (trade.pnl || 0) > 0)
      .map(trade => trade.entry_time ? trade.entry_time.split('T')[0] : '')
    ).size;
    
    const consistency = tradingDays > 0 ? (profitableDays / tradingDays) * 100 : 0;
    
    // Rule Compliance %
    const tradesWithoutViolations = closedTrades.filter(trade => 
      !trade.mistake_tags || trade.mistake_tags.length === 0
    );
    const ruleCompliance = closedTrades.length > 0 
      ? (tradesWithoutViolations.length / closedTrades.length) * 100 
      : 100;
    
    return {
      totalR,
      expectancy,
      profitFactor,
      consistency,
      ruleCompliance,
      tradingDays,
      profitableDays
    };
  })();

  // Plan adherence across closed trades
  const planAdherence = (() => {
    if (closedTrades.length === 0) return 0;
    const followed = closedTrades.filter((t) => Array.isArray((t as any).good_actions) && (t as any).good_actions.includes('Plan Followed')).length;
    return (followed / closedTrades.length) * 100;
  })();

  // Edge Diagnostics
  const edgeDiagnostics = (() => {
    // Setup performance analysis
    const setupPerformance = closedTrades.reduce((acc, trade) => {
      // Get setup name from locations array (where actual setup name is stored)
      let setup = 'Unknown';
      if (Array.isArray(trade.locations) && trade.locations.length > 0) {
        setup = String(trade.locations[0]);
      } else if (trade.notes) {
        setup = trade.notes;
      }
      
      if (!acc[setup]) {
        acc[setup] = { trades: 0, totalR: 0, wins: 0, totalPnL: 0 };
      }
      acc[setup].trades++;
      acc[setup].totalR += (trade.r_multiple || 0);
      acc[setup].totalPnL += (trade.pnl || 0);
      if ((trade.r_multiple || 0) > 0) acc[setup].wins++;
      return acc;
    }, {} as Record<string, { trades: number; totalR: number; wins: number; totalPnL: number }>);
    
    const setupStats = Object.entries(setupPerformance).map(([setup, data]) => ({
      setup,
      avgR: data.totalR / data.trades,
      winRate: (data.wins / data.trades) * 100,
      tradeCount: data.trades,
      totalPnL: data.totalPnL
    }));
    
    // Session performance analysis
    const sessionPerformance = closedTrades.reduce((acc, trade) => {
      const session = trade.trading_session || 'Unknown';
      if (!acc[session]) {
        acc[session] = { trades: 0, totalR: 0, wins: 0, totalPnL: 0 };
      }
      acc[session].trades++;
      acc[session].totalR += (trade.r_multiple || 0);
      acc[session].totalPnL += (trade.pnl || 0);
      if ((trade.r_multiple || 0) > 0) acc[session].wins++;
      return acc;
    }, {} as Record<string, { trades: number; totalR: number; wins: number; totalPnL: number }>);
    
    const sessionStats = Object.entries(sessionPerformance).map(([session, data]) => ({
      session,
      avgR: data.totalR / data.trades,
      winRate: (data.wins / data.trades) * 100,
      tradeCount: data.trades,
      totalPnL: data.totalPnL
    }));
    
    // SL vs R correlation (simplified)
    const slAnalysis = closedTrades
      .filter(trade => trade.stop_loss && trade.entry_price)
      .map(trade => {
        const entry = Number(trade.entry_price);
        const stop = Number(trade.stop_loss);
        const slDistance = Math.abs(entry - stop);
        return {
          slDistance,
          rMultiple: trade.r_multiple || 0
        };
      });
    
    return {
      setupStats,
      sessionStats,
      slAnalysis
    };
  })();

  // Management Efficiency
  const managementEfficiency = (() => {
    // Analyze trade management patterns
    const partialHitTrades = closedTrades.filter(trade => 
      trade.notes?.toLowerCase().includes('2r') || 
      trade.notes?.toLowerCase().includes('partial') ||
      trade.good_actions?.some(action => action.includes('2R') || action.includes('partial'))
    );
    
    const beBefore2RTrades = closedTrades.filter(trade => 
      trade.notes?.toLowerCase().includes('be') && 
      (trade.r_multiple || 0) < 2 && (trade.r_multiple || 0) > 0
    );
    
    const finalRTrades = partialHitTrades.filter(trade => (trade.r_multiple || 0) > 0);
    const avgFinalR = finalRTrades.length > 0 
      ? finalRTrades.reduce((sum, trade) => sum + (trade.r_multiple || 0), 0) / finalRTrades.length
      : 0;
    
    return {
      partialHitPercent: closedTrades.length > 0 ? (partialHitTrades.length / closedTrades.length) * 100 : 0,
      beBefore2RPercent: closedTrades.length > 0 ? (beBefore2RTrades.length / closedTrades.length) * 100 : 0,
      avgFinalRAfterPartial: avgFinalR,
      totalPartialTrades: partialHitTrades.length
    };
  })();

  // Behavior Summary
  const behaviorSummary = (() => {
    // Most common emotions across all trades
    const emotionCounts = closedTrades.reduce((acc, trade) => {
      if (trade.emotions) {
        Object.entries(trade.emotions as Record<string, unknown>).forEach(([emotion, intensity]) => {
          if (typeof intensity === 'number' && intensity > 5) {
            acc[emotion] = (acc[emotion] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
    
    // Average discipline score
    const disciplineScores = closedTrades.map(trade => {
      let score = 5;
      if (trade.mistake_tags && trade.mistake_tags.length > 0) {
        score -= trade.mistake_tags.length * 0.5;
      }
      if (trade.good_actions && trade.good_actions.length > 0) {
        score += trade.good_actions.length * 0.2;
      }
      return Math.max(1, Math.min(5, score));
    });
    
    const avgDisciplineScore = disciplineScores.length > 0 
      ? disciplineScores.reduce((sum, score) => sum + score, 0) / disciplineScores.length 
      : 5;
    
    // Top mistakes
    const allMistakes = closedTrades.flatMap(trade => trade.mistake_tags || []);
    const mistakeCount = allMistakes.reduce((acc, mistake) => {
      acc[mistake] = (acc[mistake] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topMistakes = Object.entries(mistakeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    // Rule compliance trend (simplified - could be enhanced with daily data)
    const complianceTrend = weeklyAnalytics.ruleCompliance;
    
    return {
      mostCommonEmotion,
      avgDisciplineScore,
      topMistakes,
      complianceTrend
    };
  })();

  // Equity & Growth Visualization Data
  const equityData = (() => {
    // Calculate cumulative R and P&L over time
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.entry_time || 0).getTime() - new Date(b.entry_time || 0).getTime()
    );
    
    let cumulativeR = 0;
    let cumulativePnL = 0;
    
    const equityPoints = sortedTrades.map(trade => {
      cumulativeR += (trade.r_multiple || 0);
      cumulativePnL += (trade.pnl || 0);
      return {
        date: trade.entry_time ? new Date(trade.entry_time).toISOString().split('T')[0] : '',
        cumulativeR,
        cumulativePnL
      };
    });
    
    return equityPoints;
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
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Trading Analytics</h2>
          <p className="text-sm text-trading-muted hidden sm:block">Performance insights and trading patterns</p>
        </div>
        
        {/* Desktop: Side-by-side buttons, Mobile: Dropdown menu */}
        <div className="flex items-center gap-2">
          {/* Mobile: Dropdown menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportWeeklyReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={compareWithPreviousWeek}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                </DropdownMenuItem>
                <DropdownMenuItem onClick={refreshAnalytics}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop: Individual buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="hover:bg-trading-accent/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={exportWeeklyReport}
              variant="outline"
              size="sm"
              className="hover:bg-trading-accent/10"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button
              onClick={compareWithPreviousWeek}
              variant="outline"
              size="sm"
              className="hover:bg-trading-accent/10"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare
            </Button>
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 grid-rows-2 sm:grid-rows-1 h-16 sm:h-10">
          <TabsTrigger value="best-hours" className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Hours</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-foreground" />
            <span>Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            <span>Daily</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            <span>Setups</span>
          </TabsTrigger>
          <TabsTrigger value="edge-diagnostics" className="flex items-center gap-2 text-sm">
            <PieChart className="h-4 w-4" />
            <span>Edge</span>
          </TabsTrigger>
          <TabsTrigger value="equity" className="flex items-center gap-2 text-sm">
            <LineChart className="h-4 w-4" />
            <span>Equity</span>
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
          {/* Weekly KPIs */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-trading-accent" />
                Weekly KPIs
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Key performance indicators for the selected period
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-trading-accent">{weeklyAnalytics.totalR.toFixed(2)}R</div>
                  <div className="text-xs text-trading-muted">Total R</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${weeklyAnalytics.expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>{weeklyAnalytics.expectancy.toFixed(2)}R</div>
                  <div className="text-xs text-trading-muted">Expectancy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-trading-accent">{weeklyAnalytics.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-trading-muted">Profit Factor</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-trading-accent">{weeklyAnalytics.consistency.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Consistency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-trading-accent">{planAdherence.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Plan Adherence</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-trading-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-trading-muted">Rule Compliance</span>
                  <div className="flex items-center gap-2">
                    <Progress value={weeklyAnalytics.ruleCompliance} className="w-20 h-2" />
                    <span className="text-sm font-bold">{weeklyAnalytics.ruleCompliance.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Efficiency */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-trading-accent" />
                Management Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-success">{managementEfficiency.partialHitPercent.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Partial Hit %</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">{managementEfficiency.beBefore2RPercent.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">BE before 2R %</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{managementEfficiency.avgFinalRAfterPartial.toFixed(2)}R</div>
                  <div className="text-xs text-trading-muted">Avg Final R</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{managementEfficiency.totalPartialTrades}</div>
                  <div className="text-xs text-trading-muted">Partial Trades</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Behavior Summary */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-trading-accent" />
                Behavior Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent capitalize">{behaviorSummary.mostCommonEmotion}</div>
                  <div className="text-xs text-trading-muted">Most Common Emotion</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{behaviorSummary.avgDisciplineScore.toFixed(1)}/5</div>
                  <div className="text-xs text-trading-muted">Avg Discipline Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{behaviorSummary.complianceTrend.toFixed(0)}%</div>
                  <div className="text-xs text-trading-muted">Rule Compliance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-trading-accent">{behaviorSummary.topMistakes.length}</div>
                  <div className="text-xs text-trading-muted">Top Mistakes</div>
                </div>
              </div>
              {behaviorSummary.topMistakes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-trading-border">
                  <h4 className="text-sm font-semibold mb-2">Top Mistakes</h4>
                  <div className="space-y-1">
                    {behaviorSummary.topMistakes.map(([mistake, count]) => (
                      <div key={mistake} className="flex justify-between items-center text-sm">
                        <span>{mistake}</span>
                        <Badge variant="destructive">{count}x</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Weekly Summary */}
          {weeklySummary.length > 0 && (
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-trading-accent" />
                  Weekly Breakdown
                </CardTitle>
                <p className="text-sm text-trading-muted">
                  Week-by-week performance breakdown
                </p>
              </CardHeader>
              <CardContent>
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
            </CardContent>
          </Card>
          )}
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
                Setup Performance
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Performance comparison between your trading setups
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {setupPerformance.length === 0 ? (
                  <div className="text-center py-8 text-trading-muted">
                    <p>No setup data available yet. Add trades to see performance metrics.</p>
                  </div>
                ) : (
                  setupPerformance.map((setup, index) => (
                    <div 
                      key={setup.setupName} 
                      className={`bg-gradient-to-r ${
                        index === 0 ? 'from-blue-950/20 to-blue-950/10 border-blue-500/20' :
                        index === 1 ? 'from-purple-950/20 to-purple-950/10 border-purple-500/20' :
                        index === 2 ? 'from-emerald-950/20 to-emerald-950/10 border-emerald-500/20' :
                        'from-slate-950/20 to-slate-950/10 border-slate-500/20'
                      } border rounded-lg p-4`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${
                          index === 0 ? 'text-blue-300' :
                          index === 1 ? 'text-purple-300' :
                          index === 2 ? 'text-emerald-300' :
                          'text-slate-300'
                        }`}>
                          {setup.setupName}
                        </h3>
                        <Badge variant="outline" className="text-sm">
                          {setup.count} trades
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-blue-300' :
                            index === 1 ? 'text-purple-300' :
                            index === 2 ? 'text-emerald-300' :
                            'text-slate-300'
                          }`}>
                            {setup.winRate.toFixed(0)}%
                          </div>
                          <div className="text-xs text-trading-muted">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${setup.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(setup.totalPnL)}
                          </div>
                          <div className="text-xs text-trading-muted">Total P&L</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-blue-300' :
                            index === 1 ? 'text-purple-300' :
                            index === 2 ? 'text-emerald-300' :
                            'text-slate-300'
                          }`}>
                            {setup.avgR.toFixed(2)}R
                          </div>
                          <div className="text-xs text-trading-muted">Avg R Multiple</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-blue-300' :
                            index === 1 ? 'text-purple-300' :
                            index === 2 ? 'text-emerald-300' :
                            'text-slate-300'
                          }`}>
                            {setup.profitFactor.toFixed(2)}
                          </div>
                          <div className="text-xs text-trading-muted">Profit Factor</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Diagnostics */}
        <TabsContent value="edge-diagnostics" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-trading-accent" />
                Edge Diagnostics
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Detailed analysis of setup and session performance
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Setup Performance */}
                {edgeDiagnostics.setupStats.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Setup Performance</h4>
                    <div className="space-y-3">
                      {edgeDiagnostics.setupStats.map(({ setup, avgR, winRate, tradeCount, totalPnL }) => (
                        <div key={setup} className="p-4 bg-secondary/30 rounded-lg border border-trading-border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-foreground">{setup.replace(/_/g, ' ')}</h5>
                            <Badge variant="outline">{tradeCount} trades</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-trading-accent">{avgR.toFixed(2)}R</div>
                              <div className="text-trading-muted">Avg R</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-success">{winRate.toFixed(0)}%</div>
                              <div className="text-trading-muted">Win Rate</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(totalPnL)}
                              </div>
                              <div className="text-trading-muted">Total P&L</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-trading-accent">
                                {tradeCount > 0 ? (totalPnL / tradeCount).toFixed(0) : '0'}
                              </div>
                              <div className="text-trading-muted">Avg P&L</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Performance */}
                {edgeDiagnostics.sessionStats.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Session Performance</h4>
                    <div className="space-y-3">
                      {edgeDiagnostics.sessionStats.map(({ session, avgR, winRate, tradeCount, totalPnL }) => (
                        <div key={session} className="p-4 bg-secondary/30 rounded-lg border border-trading-border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-foreground">{session}</h5>
                            <Badge variant="outline">{tradeCount} trades</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-trading-accent">{avgR.toFixed(2)}R</div>
                              <div className="text-trading-muted">Avg R</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-success">{winRate.toFixed(0)}%</div>
                              <div className="text-trading-muted">Win Rate</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(totalPnL)}
                              </div>
                              <div className="text-trading-muted">Total P&L</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-trading-accent">
                                {tradeCount > 0 ? (totalPnL / tradeCount).toFixed(0) : '0'}
                              </div>
                              <div className="text-trading-muted">Avg P&L</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SL vs R Analysis */}
                {edgeDiagnostics.slAnalysis.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Stop Loss Analysis</h4>
                    <div className="p-4 bg-secondary/30 rounded-lg border border-trading-border">
                      <p className="text-sm text-trading-muted mb-4">
                        Correlation between stop loss distance and R multiple results
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{edgeDiagnostics.slAnalysis.length}</div>
                          <div className="text-trading-muted">Trades Analyzed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">
                            {edgeDiagnostics.slAnalysis.length > 0 
                              ? (edgeDiagnostics.slAnalysis.reduce((sum, item) => sum + item.slDistance, 0) / edgeDiagnostics.slAnalysis.length).toFixed(3)
                              : '0.000'
                            }
                          </div>
                          <div className="text-trading-muted">Avg SL Distance</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">
                            {edgeDiagnostics.slAnalysis.length > 0 
                              ? (edgeDiagnostics.slAnalysis.reduce((sum, item) => sum + item.rMultiple, 0) / edgeDiagnostics.slAnalysis.length).toFixed(2)
                              : '0.00'
                            }R
                          </div>
                          <div className="text-trading-muted">Avg R Multiple</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equity & Growth Visualization */}
        <TabsContent value="equity" className="space-y-4">
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-trading-accent" />
                Equity & Growth Visualization
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Cumulative performance tracking over time
              </p>
            </CardHeader>
            <CardContent>
              {equityData.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No equity data available for visualization</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <div className="text-2xl font-bold text-trading-accent">
                        {equityData[equityData.length - 1]?.cumulativeR.toFixed(2)}R
                      </div>
                      <div className="text-xs text-trading-muted">Total R Multiple</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <div className={`text-2xl font-bold ${
                        (equityData[equityData.length - 1]?.cumulativePnL || 0) >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(equityData[equityData.length - 1]?.cumulativePnL || 0)}
                      </div>
                      <div className="text-xs text-trading-muted">Total P&L</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <div className="text-2xl font-bold text-trading-accent">{equityData.length}</div>
                      <div className="text-xs text-trading-muted">Total Trades</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                      <div className="text-2xl font-bold text-trading-accent">
                        {equityData.length > 0 
                          ? ((equityData[equityData.length - 1]?.cumulativeR || 0) / equityData.length).toFixed(2)
                          : '0.00'
                        }R
                      </div>
                      <div className="text-xs text-trading-muted">Avg R per Trade</div>
                    </div>
                  </div>

                  {/* Equity Curve Data Points */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold">Equity Progression</h4>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {equityData.slice(-20).map((point, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm">
                          <span className="text-trading-muted">{point.date}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-trading-accent">{point.cumulativeR.toFixed(2)}R</span>
                            <span className={`font-bold ${point.cumulativePnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(point.cumulativePnL)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="flex gap-2 pt-4 border-t border-trading-border">
                    <Button variant="outline" size="sm" className="flex-1" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={exportWeeklyReport}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
