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
  MoreVertical,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { useTradingAnalytics } from '@/hooks/useTradingAnalytics';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { usePostTradeAnalytics } from '@/hooks/analytics/usePostTradeAnalytics';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { format } from 'date-fns';
import { useEffect } from 'react';

// Phase 2C: Chart components
import { EfficiencyScatterChart } from './Analytics/charts/EfficiencyScatterChart';
import { ContinuationBarChart } from './Analytics/charts/ContinuationBarChart';
import { ConfidenceBarChart } from './Analytics/charts/ConfidenceBarChart';
import { DisciplinePieChart } from './Analytics/charts/DisciplinePieChart';

// Phase 3: Recommendations
import { RecommendationsDashboard } from './RecommendationsDashboard';

export function TradingAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const { isMobile } = useMobileOptimizations();
  const { 
    bestHours, 
    weeklySummary, 
    dailyPerformance, 
    loading, 
    error, 
    refreshAnalytics 
  } = useTradingAnalytics(parseInt(selectedPeriod));
  
  const { closedTrades } = useTradesOptimized();
  
  // ✅ PHASE 2B: Post-trade analytics
  const postTradeAnalytics = usePostTradeAnalytics();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  // Load analytics data
  useEffect(() => {
    postTradeAnalytics.fetchAllAnalytics().then(data => {
      if (data) setAnalyticsData(data);
    });
  }, []);

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
    // ✅ UPDATED: Use new setup_name field instead of locations[0]
    const setupGroups: Record<string, any[]> = {};
    closedTrades.forEach(trade => {
      // Use new setup_name field with fallbacks
      let setupName = trade.setup_name || 
                      (Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : null) ||
                      trade.notes ||
                      'Unknown';
      
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
    // ✅ UPDATED: Setup performance analysis using new setup_name field
    const setupPerformance = closedTrades.reduce((acc, trade) => {
      // Use new setup_name field with fallbacks
      let setup = trade.setup_name || 
                  (Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : null) ||
                  trade.notes ||
                  'Unknown';
      
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
        
        {/* Actions Dropdown Menu (Desktop and Mobile) */}
        <div className="flex items-center gap-2">
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
        {/* Grouped Tab Navigation - Mobile Responsive */}
        <div className={`flex flex-wrap gap-2 items-center ${isMobile ? 'justify-center' : ''}`}>
          {/* Time Analysis Group */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <span className={`text-xs text-muted-foreground ${isMobile ? 'px-1' : 'px-2'}`}>Time</span>
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="best-hours" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Clock className="h-3 w-3 mr-1" />
                {!isMobile && 'Hours'}
              </TabsTrigger>
              <TabsTrigger value="weekly" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Calendar className="h-3 w-3 mr-1" />
                {!isMobile && 'Weekly'}
              </TabsTrigger>
              <TabsTrigger value="daily" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <BarChart3 className="h-3 w-3 mr-1" />
                {!isMobile && 'Daily'}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Performance Group */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <span className={`text-xs text-muted-foreground ${isMobile ? 'hidden' : 'px-2'}`}>Performance</span>
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="models" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Target className="h-3 w-3 mr-1" />
                {!isMobile && 'Setups'}
              </TabsTrigger>
              <TabsTrigger value="edge-diagnostics" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <PieChart className="h-3 w-3 mr-1" />
                {!isMobile && 'Edge'}
              </TabsTrigger>
              <TabsTrigger value="equity" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <LineChart className="h-3 w-3 mr-1" />
                {!isMobile && 'Equity'}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Advanced Analytics Group - Mobile Optimized (3 options) */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <span className={`text-xs text-muted-foreground ${isMobile ? 'hidden' : 'px-2'}`}>Advanced</span>
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="efficiency" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Zap className="h-3 w-3 mr-1 text-orange-400" />
                {!isMobile && <span className="text-orange-400">Efficiency</span>}
              </TabsTrigger>
              <TabsTrigger value="observations" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Activity className="h-3 w-3 mr-1 text-cyan-400" />
                {!isMobile && <span className="text-cyan-400">Observations</span>}
              </TabsTrigger>
              <TabsTrigger value="confidence" className={`text-xs ${isMobile ? 'px-2' : 'px-3'} data-[state=active]:bg-slate-800`}>
                <Brain className="h-3 w-3 mr-1 text-purple-400" />
                {!isMobile && <span className="text-purple-400">Confidence</span>}
              </TabsTrigger>
              {/* Show Discipline only on desktop */}
              {!isMobile && (
                <TabsTrigger value="discipline" className="text-xs px-3 data-[state=active]:bg-slate-800">
                  <Shield className="h-3 w-3 mr-1 text-blue-400" />
                  <span className="text-blue-400">Discipline</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Market Context Analytics - New Backtesting Tab */}
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-950/50 to-orange-950/50 rounded-lg p-1 border border-amber-500/30">
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="market-context" className={`text-xs ${isMobile ? 'px-2' : 'px-4'} data-[state=active]:bg-amber-900/50`}>
                <Activity className="h-3 w-3 mr-1 text-amber-400" />
                {!isMobile && <span className="text-amber-400 font-semibold">Market Context</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Recommendations - Standalone */}
          <div className="flex items-center gap-1 bg-gradient-to-r from-purple-950/50 to-pink-950/50 rounded-lg p-1 border border-purple-500/30">
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="recommendations" className={`text-xs ${isMobile ? 'px-2' : 'px-4'} data-[state=active]:bg-purple-900/50`}>
                <Sparkles className="h-3 w-3 mr-1 text-purple-400" />
                {!isMobile && <span className="text-purple-400 font-semibold">Recommendations</span>}
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Mobile: Discipline Tab in Dropdown */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-2 bg-slate-900/50">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => {
                  const disciplineTab = document.querySelector('[value="discipline"]') as HTMLElement;
                  if (disciplineTab) disciplineTab.click();
                }}>
                  <Shield className="h-4 w-4 mr-2 text-blue-400" />
                  Discipline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

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

        {/* ✅ PHASE 2B: TAB 7 - EFFICIENCY */}
        <TabsContent value="efficiency" className="space-y-4">
          {/* Phase 2C: Efficiency Scatter Chart */}
          <EfficiencyScatterChart 
            data={closedTrades}
            loading={loading}
            error={error}
          />

          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-400" />
                Execution Efficiency
              </CardTitle>
              <p className="text-sm text-trading-muted">
                How well you capture available R (r_multiple / mfe_r)
              </p>
            </CardHeader>
            <CardContent>
              {!analyticsData?.efficiencyBySetup || analyticsData.efficiencyBySetup.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No efficiency data yet. Close trades with MAE/MFE to see analysis.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Efficiency by Setup Table */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Setup Efficiency Ranking</h4>
                    <div className="space-y-2">
                      {analyticsData.efficiencyBySetup.map((setup: any, index: number) => (
                        <div 
                          key={setup.setup_name} 
                          className="p-4 bg-gradient-to-r from-orange-950/20 to-amber-950/10 border border-orange-500/20 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className="font-semibold text-orange-200">{setup.setup_name}</h5>
                              <p className="text-xs text-trading-muted">
                                {setup.trade_count} trades • {setup.trades_with_efficiency} with MAE/MFE data
                              </p>
                            </div>
                            <Badge variant="outline" className="text-lg px-3 py-1 border-orange-400/50">
                              {(setup.avg_efficiency * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-orange-300">{setup.avg_efficiency?.toFixed(3) || 'N/A'}</div>
                              <div className="text-xs text-trading-muted">Avg Efficiency</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-green-300">{setup.avg_mfe_r?.toFixed(2) || 'N/A'}R</div>
                              <div className="text-xs text-trading-muted">Avg MFE</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-red-300">{setup.avg_mae_r?.toFixed(2) || 'N/A'}R</div>
                              <div className="text-xs text-trading-muted">Avg MAE</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-trading-accent">{setup.avg_r_multiple?.toFixed(2) || 'N/A'}R</div>
                              <div className="text-xs text-trading-muted">Avg R Captured</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ PHASE 2B: TAB 8 - OBSERVATIONS */}
        <TabsContent value="observations" className="space-y-4">
          {/* Phase 2C: Continuation Bar Chart */}
          <ContinuationBarChart 
            data={analyticsData?.continuationBySetup || null}
            loading={postTradeAnalytics.loading}
            error={postTradeAnalytics.error}
          />

          {/* Observation Summary */}
          {analyticsData?.summary && (
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  Observation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-cyan-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-300">{analyticsData.summary.total_observations}</div>
                    <div className="text-xs text-trading-muted">Total Observations</div>
                  </div>
                  <div className="text-center p-3 bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-300">{analyticsData.summary.continuations}</div>
                    <div className="text-xs text-trading-muted">Continuations</div>
                  </div>
                  <div className="text-center p-3 bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-300">{analyticsData.summary.reversals}</div>
                    <div className="text-xs text-trading-muted">Reversals</div>
                  </div>
                  <div className="text-center p-3 bg-orange-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-300">
                      {analyticsData.summary.avg_r_moved >= 0 ? '+' : ''}{analyticsData.summary.avg_r_moved?.toFixed(2)}R
                    </div>
                    <div className="text-xs text-trading-muted">Avg R Impact</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continuation by Setup */}
          {analyticsData?.continuationBySetup && analyticsData.continuationBySetup.length > 0 && (
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Continuation After Target Hit
                </CardTitle>
                <p className="text-sm text-trading-muted">
                  How often price continued beyond your target (missed opportunities)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.continuationBySetup.map((setup: any) => (
                    <div key={setup.setup_name} className="p-4 bg-green-950/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-green-200">{setup.setup_name}</h5>
                        <Badge className="bg-green-600">{setup.continuation_rate?.toFixed(0)}% Continue</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-green-300">+{setup.avg_extra_r?.toFixed(2)}R</div>
                          <div className="text-xs text-trading-muted">Avg Extra R</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-cyan-300">+{setup.total_missed_r?.toFixed(2)}R</div>
                          <div className="text-xs text-trading-muted">Total Missed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{setup.continuations}/{setup.target_hit_trades}</div>
                          <div className="text-xs text-trading-muted">Continued Trades</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stop Quality */}
          {analyticsData?.reversalBySetup && analyticsData.reversalBySetup.length > 0 && (
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Stop Placement Quality
                </CardTitle>
                <p className="text-sm text-trading-muted">
                  How often price reversed after hitting your stop (higher = better stop placement)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.reversalBySetup.map((setup: any) => (
                    <div key={setup.setup_name} className="p-4 bg-blue-950/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-blue-200">{setup.setup_name}</h5>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            setup.stop_quality_score >= 70 ? 'bg-green-600' :
                            setup.stop_quality_score >= 50 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }>
                            {setup.stop_quality_score?.toFixed(0)}% Quality
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-blue-300">{setup.reversal_rate?.toFixed(0)}%</div>
                          <div className="text-xs text-trading-muted">Reversal Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-300">+{setup.avg_r_saved?.toFixed(2)}R</div>
                          <div className="text-xs text-trading-muted">Avg R Saved</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{setup.reversals}/{setup.stopped_trades}</div>
                          <div className="text-xs text-trading-muted">Reversed Stops</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Observations */}
          {analyticsData?.recentObservations && analyticsData.recentObservations.length > 0 && (
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-cyan-400" />
                  Recent Observations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analyticsData.recentObservations.slice(0, 10).map((obs: any) => (
                    <div key={obs.observation_id} className="p-3 bg-secondary/20 border border-trading-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{obs.asset}</span>
                          <Badge variant="outline" className="text-xs">{obs.setup_name}</Badge>
                        </div>
                        <Badge className={
                          obs.observation_insight === 'Good Stop Placement' ? 'bg-green-600' :
                          obs.observation_insight === 'Left R on Table' ? 'bg-orange-600' :
                          obs.observation_insight === 'Good Exit Timing' ? 'bg-blue-600' :
                          'bg-gray-600'
                        }>
                          {obs.observation_insight}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-trading-muted">Action:</span>{' '}
                          <span className="font-medium">{obs.price_action}</span>
                        </div>
                        <div>
                          <span className="text-trading-muted">Time:</span>{' '}
                          <span className="font-medium">{obs.observation_time}</span>
                        </div>
                        <div>
                          <span className="text-trading-muted">R Impact:</span>{' '}
                          <span className={`font-bold ${obs.r_moved >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {obs.r_moved >= 0 ? '+' : ''}{obs.r_moved?.toFixed(2)}R
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ✅ PHASE 2B: TAB 9 - CONFIDENCE */}
        <TabsContent value="confidence" className="space-y-4">
          {/* Phase 2C: Confidence Bar Chart */}
          <ConfidenceBarChart 
            data={analyticsData?.confidencePerf || null}
            loading={postTradeAnalytics.loading}
            error={postTradeAnalytics.error}
          />

          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Confidence Correlation
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Does higher confidence predict better results?
              </p>
            </CardHeader>
            <CardContent>
              {!analyticsData?.confidencePerf || analyticsData.confidencePerf.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No confidence data yet. Set confidence level when entering trades.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyticsData.confidencePerf.map((conf: any) => (
                    <div 
                      key={conf.confidence_level}
                      className="p-4 bg-purple-950/10 border border-purple-500/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
                            <span className="text-2xl font-bold text-purple-300">{conf.confidence_level}</span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-purple-200">
                              {conf.confidence_level === 1 && 'Very Low Confidence'}
                              {conf.confidence_level === 2 && 'Low Confidence'}
                              {conf.confidence_level === 3 && 'Medium Confidence'}
                              {conf.confidence_level === 4 && 'High Confidence'}
                              {conf.confidence_level === 5 && 'Very High Confidence'}
                            </h5>
                            <p className="text-xs text-trading-muted">{conf.trade_count} trades</p>
                          </div>
                        </div>
                        <Badge className={
                          conf.win_rate >= 60 ? 'bg-green-600' :
                          conf.win_rate >= 50 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }>
                          {conf.win_rate?.toFixed(0)}% Win Rate
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-purple-300">{conf.avg_r_multiple?.toFixed(2)}R</div>
                          <div className="text-xs text-trading-muted">Avg R</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-300">{conf.avg_efficiency?.toFixed(3) || 'N/A'}</div>
                          <div className="text-xs text-trading-muted">Avg Efficiency</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${conf.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(conf.avg_pnl)}
                          </div>
                          <div className="text-xs text-trading-muted">Avg P&L</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{conf.trade_count}</div>
                          <div className="text-xs text-trading-muted">Sample Size</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ PHASE 2B: TAB 10 - DISCIPLINE */}
        <TabsContent value="discipline" className="space-y-4">
          {/* Phase 2C: Discipline Pie Chart */}
          <DisciplinePieChart 
            data={analyticsData?.disciplinePerf || null}
            loading={postTradeAnalytics.loading}
            error={postTradeAnalytics.error}
          />

          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Discipline Impact Analysis
              </CardTitle>
              <p className="text-sm text-trading-muted">
                Performance by discipline classification (FOMO, Followed Plan, etc.)
              </p>
            </CardHeader>
            <CardContent>
              {!analyticsData?.disciplinePerf || analyticsData.disciplinePerf.length === 0 ? (
                <div className="text-center py-8 text-trading-muted">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No discipline data yet. Classify your entries using discipline tags.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analyticsData.disciplinePerf.map((disc: any) => (
                    <div 
                      key={disc.discipline_tag}
                      className={`p-4 border rounded-lg ${
                        disc.discipline_tag === 'followed_plan' || disc.discipline_tag === 'disciplined' || disc.discipline_tag === 'perfect_setup'
                          ? 'bg-green-950/10 border-green-500/20'
                          : disc.discipline_tag === 'fomo' || disc.discipline_tag === 'revenge' || disc.discipline_tag === 'emotional'
                            ? 'bg-red-950/10 border-red-500/20'
                            : 'bg-blue-950/10 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-semibold text-foreground capitalize">
                            {disc.discipline_tag.replace(/_/g, ' ')}
                          </h5>
                          <p className="text-xs text-trading-muted">{disc.trade_count} trades</p>
                        </div>
                        <Badge className={
                          disc.avg_r_multiple >= 0.5 ? 'bg-green-600' :
                          disc.avg_r_multiple >= 0 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }>
                          {disc.avg_r_multiple?.toFixed(2)}R Avg
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{disc.win_rate?.toFixed(0)}%</div>
                          <div className="text-xs text-trading-muted">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-300">{disc.avg_efficiency?.toFixed(3) || 'N/A'}</div>
                          <div className="text-xs text-trading-muted">Avg Efficiency</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${disc.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(disc.avg_pnl)}
                          </div>
                          <div className="text-xs text-trading-muted">Avg P&L</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-cyan-300">
                            {disc.avg_missed_r ? `+${disc.avg_missed_r.toFixed(2)}R` : 'N/A'}
                          </div>
                          <div className="text-xs text-trading-muted">Avg Missed R</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-trading-accent">{disc.trade_count}</div>
                          <div className="text-xs text-trading-muted">Sample Size</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ TAB 11 - MARKET CONTEXT ANALYTICS */}
        <TabsContent value="market-context" className="space-y-4">
          {(() => {
            // Calculate market context analytics
            const sessionBehaviors = closedTrades.reduce((acc, trade) => {
              const behavior = (trade as any).session_behavior;
              if (behavior) {
                if (!acc[behavior]) {
                  acc[behavior] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                }
                acc[behavior].trades.push(trade);
                acc[behavior].totalR += (trade.r_multiple || 0);
                acc[behavior].totalPnL += (trade.pnl || 0);
                if ((trade.r_multiple || 0) > 0) acc[behavior].wins++;
              }
              return acc;
            }, {} as Record<string, any>);

            const sessionScenarios = closedTrades.reduce((acc, trade) => {
              const scenario = (trade as any).session_scenario;
              if (scenario) {
                if (!acc[scenario]) {
                  acc[scenario] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                }
                acc[scenario].trades.push(trade);
                acc[scenario].totalR += (trade.r_multiple || 0);
                acc[scenario].totalPnL += (trade.pnl || 0);
                if ((trade.r_multiple || 0) > 0) acc[scenario].wins++;
              }
              return acc;
            }, {} as Record<string, any>);

            // Day of week performance
            const dayOfWeekPerf = closedTrades.reduce((acc, trade) => {
              if (trade.entry_time) {
                const day = format(new Date(trade.entry_time), 'EEEE');
                if (!acc[day]) {
                  acc[day] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                }
                acc[day].trades.push(trade);
                acc[day].totalR += (trade.r_multiple || 0);
                acc[day].totalPnL += (trade.pnl || 0);
                if ((trade.r_multiple || 0) > 0) acc[day].wins++;
              }
              return acc;
            }, {} as Record<string, any>);

            // Hour of day performance (NY time)
            const hourOfDayPerf = closedTrades.reduce((acc, trade) => {
              if (trade.entry_time) {
                // Convert entry_time (UTC) to NY time
                const entryDate = new Date(trade.entry_time);
                const nyTime = new Date(entryDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                const hour = nyTime.getHours();
                if (!acc[hour]) {
                  acc[hour] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                }
                acc[hour].trades.push(trade);
                acc[hour].totalR += (trade.r_multiple || 0);
                acc[hour].totalPnL += (trade.pnl || 0);
                if ((trade.r_multiple || 0) > 0) acc[hour].wins++;
              }
              return acc;
            }, {} as Record<string, any>);

            // Deep Analytics: Cross-correlation analysis
            const deepAnalytics = (() => {
              const insights: Array<{
                title: string;
                insight: string;
                performance: { winRate: number; avgR: number; sample: number; totalPnL: number };
                confidence: 'high' | 'medium' | 'low';
              }> = [];

              // 1. HTF Bias + Behavior combinations
              const biasBehaviorCombo = closedTrades.reduce((acc, trade) => {
                const bias = (trade as any).htf_bias;
                const behavior = (trade as any).session_behavior;
                if (bias && behavior) {
                  const key = `${bias}+${behavior}`;
                  if (!acc[key]) {
                    acc[key] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                  }
                  acc[key].trades.push(trade);
                  acc[key].totalR += (trade.r_multiple || 0);
                  acc[key].totalPnL += (trade.pnl || 0);
                  if ((trade.r_multiple || 0) > 0) acc[key].wins++;
                }
                return acc;
              }, {} as Record<string, any>);

              // Find best bias + behavior combo
              const bestBiasBehavior = Object.entries(biasBehaviorCombo)
                .filter(([_, data]: [string, any]) => data.trades.length >= 5)
                .sort((a, b) => b[1].totalPnL - a[1].totalPnL)[0];

              if (bestBiasBehavior) {
                const [combo, data] = bestBiasBehavior;
                const [bias, behavior] = combo.split('+');
                const winRate = (data.wins / data.trades.length) * 100;
                insights.push({
                  title: `Best Combo: ${bias} Bias + ${behavior.replace(/_/g, ' ')}`,
                  insight: `This combination of HTF bias and session behavior is your strongest edge. Trade more of this setup.`,
                  performance: {
                    winRate,
                    avgR: data.totalR / data.trades.length,
                    sample: data.trades.length,
                    totalPnL: data.totalPnL
                  },
                  confidence: data.trades.length >= 10 ? 'high' : data.trades.length >= 5 ? 'medium' : 'low'
                });
              }

              // 2. VWAP Band + FVA Position
              const vwapFvaCombo = closedTrades.reduce((acc, trade) => {
                const vwap = (trade as any).vwap_band;
                const fva = (trade as any).fva_position;
                if (vwap && fva) {
                  const key = `${vwap}+${fva}`;
                  if (!acc[key]) {
                    acc[key] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                  }
                  acc[key].trades.push(trade);
                  acc[key].totalR += (trade.r_multiple || 0);
                  acc[key].totalPnL += (trade.pnl || 0);
                  if ((trade.r_multiple || 0) > 0) acc[key].wins++;
                }
                return acc;
              }, {} as Record<string, any>);

              const bestVwapFva = Object.entries(vwapFvaCombo)
                .filter(([_, data]: [string, any]) => data.trades.length >= 3)
                .sort((a, b) => b[1].totalPnL - a[1].totalPnL)[0];

              if (bestVwapFva) {
                const [combo, data] = bestVwapFva;
                const [vwap, fva] = combo.split('+');
                const winRate = (data.wins / data.trades.length) * 100;
                insights.push({
                  title: `Optimal VWAP + FVA: ${vwap} + ${fva}`,
                  insight: `This specific value area setup performs exceptionally well for your strategy.`,
                  performance: {
                    winRate,
                    avgR: data.totalR / data.trades.length,
                    sample: data.trades.length,
                    totalPnL: data.totalPnL
                  },
                  confidence: data.trades.length >= 7 ? 'high' : data.trades.length >= 3 ? 'medium' : 'low'
                });
              }

              // 3. POI Type performance
              const poiPerf = closedTrades.reduce((acc, trade) => {
                const poi = (trade as any).poi_type;
                if (poi) {
                  if (!acc[poi]) {
                    acc[poi] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                  }
                  acc[poi].trades.push(trade);
                  acc[poi].totalR += (trade.r_multiple || 0);
                  acc[poi].totalPnL += (trade.pnl || 0);
                  if ((trade.r_multiple || 0) > 0) acc[poi].wins++;
                }
                return acc;
              }, {} as Record<string, any>);

              const top3POI = Object.entries(poiPerf)
                .filter(([_, data]: [string, any]) => data.trades.length >= 3)
                .sort((a, b) => b[1].totalPnL - a[1].totalPnL)
                .slice(0, 3);

              top3POI.forEach(([poi, data]: [string, any]) => {
                const winRate = (data.wins / data.trades.length) * 100;
                if (winRate >= 60 || data.totalPnL > 0) {
                  insights.push({
                    title: `Strong POI: ${poi}`,
                    insight: `This POI type consistently delivers strong results. Focus on these setups.`,
                    performance: {
                      winRate,
                      avgR: data.totalR / data.trades.length,
                      sample: data.trades.length,
                      totalPnL: data.totalPnL
                    },
                    confidence: data.trades.length >= 7 ? 'high' : 'medium'
                  });
                }
              });

              // 4. Time-based edge
              const bestHour = Object.entries(hourOfDayPerf)
                .filter(([_, data]: [string, any]) => data.trades.length >= 3)
                .sort((a, b) => b[1].totalPnL - a[1].totalPnL)[0];

              if (bestHour) {
                const [hour, data] = bestHour;
                const winRate = (data.wins / data.trades.length) * 100;
                insights.push({
                  title: `Best Trading Hour: ${formatHour(Number(hour))} NY`,
                  insight: `Your trades perform significantly better during this hour window. Consider focusing your trading activity here.`,
                  performance: {
                    winRate,
                    avgR: data.totalR / data.trades.length,
                    sample: data.trades.length,
                    totalPnL: data.totalPnL
                  },
                  confidence: data.trades.length >= 10 ? 'high' : 'medium'
                });
              }

              // 5. Scenario + Day combination
              const scenarioDay = closedTrades.reduce((acc, trade) => {
                const scenario = (trade as any).session_scenario;
                if (trade.entry_time && scenario) {
                  const day = format(new Date(trade.entry_time), 'EEEE');
                  const key = `${scenario}+${day}`;
                  if (!acc[key]) {
                    acc[key] = { trades: [], wins: 0, totalR: 0, totalPnL: 0 };
                  }
                  acc[key].trades.push(trade);
                  acc[key].totalR += (trade.r_multiple || 0);
                  acc[key].totalPnL += (trade.pnl || 0);
                  if ((trade.r_multiple || 0) > 0) acc[key].wins++;
                }
                return acc;
              }, {} as Record<string, any>);

              const bestScenarioDay = Object.entries(scenarioDay)
                .filter(([_, data]: [string, any]) => data.trades.length >= 3)
                .sort((a, b) => b[1].totalPnL - a[1].totalPnL)[0];

              if (bestScenarioDay) {
                const [combo, data] = bestScenarioDay;
                const [scenario, day] = combo.split('+');
                const winRate = (data.wins / data.trades.length) * 100;
                insights.push({
                  title: `${scenario} on ${day} Performance`,
                  insight: `This scenario type on ${day} shows exceptional results. Plan to trade this combination more actively.`,
                  performance: {
                    winRate,
                    avgR: data.totalR / data.trades.length,
                    sample: data.trades.length,
                    totalPnL: data.totalPnL
                  },
                  confidence: data.trades.length >= 7 ? 'high' : 'medium'
                });
              }

              return insights.slice(0, 5); // Top 5 insights
            })();

            return (
              <>
                {/* Session Behavior Performance */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-amber-400" />
                      Session Behavior Performance
                    </CardTitle>
                    <p className="text-sm text-trading-muted">
                      How different session behaviors performed in your backtest
                    </p>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(sessionBehaviors).length === 0 ? (
                      <div className="text-center py-8 text-trading-muted">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No session behavior data yet. Add behaviors when entering trades.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(sessionBehaviors)
                          .sort((a, b) => b[1].totalPnL - a[1].totalPnL)
                          .map(([behavior, data]: [string, any]) => (
                            <div
                              key={behavior}
                              className={`p-4 border rounded-lg ${
                                data.totalPnL > 0
                                  ? 'bg-green-950/10 border-green-500/20'
                                  : 'bg-red-950/10 border-red-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h5 className="font-semibold text-foreground capitalize">
                                    {behavior.replace(/_/g, ' ')}
                                  </h5>
                                  <p className="text-xs text-trading-muted">{data.trades.length} trades</p>
                                </div>
                                <Badge className={data.totalPnL >= 0 ? 'bg-green-600' : 'bg-red-600'}>
                                  {formatCurrency(data.totalPnL)}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="text-center">
                                  <div className="font-bold text-trading-accent">
                                    {data.trades.length > 0 ? ((data.wins / data.trades.length) * 100).toFixed(0) : 0}%
                                  </div>
                                  <div className="text-xs text-trading-muted">Win Rate</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-orange-300">
                                    {data.trades.length > 0 ? (data.totalR / data.trades.length).toFixed(2) : 0}R
                                  </div>
                                  <div className="text-xs text-trading-muted">Avg R Multiple</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-blue-300">{data.wins}</div>
                                  <div className="text-xs text-trading-muted">Wins</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-purple-300">
                                    {data.trades.length - data.wins}
                                  </div>
                                  <div className="text-xs text-trading-muted">Losses</div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 🎯 KEY INSIGHTS - Cross-Analysis */}
                {deepAnalytics.length > 0 && (
                  <Card className="bg-gradient-to-br from-amber-950/20 to-orange-950/20 border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        💎 Key Insights & Optimal Setups
                      </CardTitle>
                      <p className="text-sm text-trading-muted">
                        Cross-analysis of all market context inputs to identify your best-performing combinations
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {deepAnalytics.map((insight, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-lg border border-amber-500/30 bg-slate-900/50 backdrop-blur-sm"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <Lightbulb className={`h-5 w-5 ${
                                    insight.confidence === 'high' ? 'text-green-400' :
                                    insight.confidence === 'medium' ? 'text-yellow-400' :
                                    'text-orange-400'
                                  }`} />
                                </div>
                                <div>
                                  <h5 className="font-semibold text-foreground mb-1">
                                    {insight.title}
                                  </h5>
                                  <p className="text-sm text-trading-muted mb-2">
                                    {insight.insight}
                                  </p>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={
                                      insight.confidence === 'high' ? 'bg-green-600' :
                                      insight.confidence === 'medium' ? 'bg-yellow-600' :
                                      'bg-orange-600'
                                    }>
                                      {insight.confidence === 'high' ? 'High' :
                                       insight.confidence === 'medium' ? 'Medium' : 'Low'} Confidence
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {insight.performance.sample} trades
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${
                                  insight.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatCurrency(insight.performance.totalPnL)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-700">
                              <div className="text-center">
                                <div className="text-xs text-trading-muted mb-1">Win Rate</div>
                                <div className="font-semibold text-trading-accent">
                                  {insight.performance.winRate.toFixed(0)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-trading-muted mb-1">Avg R</div>
                                <div className="font-semibold text-orange-300">
                                  {insight.performance.avgR.toFixed(2)}R
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-trading-muted mb-1">Sample</div>
                                <div className="font-semibold text-purple-300">
                                  {insight.performance.sample} trades
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-trading-muted mb-1">Total P&L</div>
                                <div className={`font-semibold ${
                                  insight.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatCurrency(insight.performance.totalPnL)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {deepAnalytics.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div className="text-xs text-blue-200">
                              <strong>Pro Tip:</strong> Use these insights to focus your trading on the combinations that consistently perform best. 
                              Track 10+ trades per combination for high-confidence results.
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Session Scenarios (S1/S2/S3) */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-400" />
                      Trading Scenario Performance (S1/S2/S3)
                    </CardTitle>
                    <p className="text-sm text-trading-muted">
                      Which scenario worked best for your strategy
                    </p>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(sessionScenarios).length === 0 ? (
                      <div className="text-center py-8 text-trading-muted">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No scenario data yet. Track S1/S2/S3 on your trades.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['S1', 'S2', 'S3'].map(scenario => {
                          const data = sessionScenarios[scenario];
                          if (!data) return null;
                          return (
                            <div
                              key={scenario}
                              className={`p-4 border rounded-lg ${
                                data.totalPnL > 0
                                  ? 'bg-green-950/10 border-green-500/20'
                                  : 'bg-red-950/10 border-red-500/20'
                              }`}
                            >
                              <div className="text-center mb-3">
                                <h5 className="text-lg font-bold text-foreground mb-1">{scenario}</h5>
                                <p className="text-xs text-trading-muted">{data.trades.length} trades</p>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-trading-muted">Win Rate:</span>
                                  <span className="font-bold text-trading-accent">
                                    {data.trades.length > 0 ? ((data.wins / data.trades.length) * 100).toFixed(0) : 0}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-trading-muted">Avg R:</span>
                                  <span className="font-bold text-orange-300">
                                    {data.trades.length > 0 ? (data.totalR / data.trades.length).toFixed(2) : 0}R
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-trading-muted">Total P&L:</span>
                                  <span className={`font-bold ${data.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(data.totalPnL)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Day of Week Performance */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-400" />
                      Day of Week Analysis
                    </CardTitle>
                    <p className="text-sm text-trading-muted">
                      Which days are most profitable for your strategy
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                        const data = dayOfWeekPerf[day];
                        if (!data) return null;
                        return (
                          <div
                            key={day}
                            className={`p-3 border rounded-lg text-center ${
                              data.totalPnL > 0
                                ? 'bg-green-950/10 border-green-500/20'
                                : data.totalPnL < 0
                                  ? 'bg-red-950/10 border-red-500/20'
                                  : 'bg-muted/10 border-muted/20'
                            }`}
                          >
                            <div className="font-semibold text-sm mb-1">{day.slice(0, 3)}</div>
                            <div className="text-2xl font-bold mb-1 text-foreground">{data.trades.length}</div>
                            <div className={`text-xs font-semibold mb-1 ${data.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(data.totalPnL)}
                            </div>
                            <div className="text-xs text-trading-muted">
                              {data.trades.length > 0 ? ((data.wins / data.trades.length) * 100).toFixed(0) : 0}% WR
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Hour of Day Performance (NY Time) */}
                <Card className="bg-trading-card border-trading-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-400" />
                      Hour of Day Performance (NY Time)
                    </CardTitle>
                    <p className="text-sm text-trading-muted">
                      Best trading hours in New York timezone. Times are based on entry_time converted to NY timezone.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(hourOfDayPerf).length === 0 ? (
                      <div className="text-center py-4 text-trading-muted">No hourly data available</div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(hourOfDayPerf)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([hour, data]: [string, any]) => (
                            <div
                              key={hour}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-900/30"
                              title={`${hour}:00-${hour}:59 NY Time`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-semibold text-foreground w-20">
                                  {formatHour(Number(hour))} NY
                                </div>
                                <div className="text-xs text-trading-muted w-20">
                                  {data.trades.length} trades
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-xs text-trading-muted">Win Rate</div>
                                  <div className="font-semibold text-foreground">
                                    {data.trades.length > 0 ? ((data.wins / data.trades.length) * 100).toFixed(0) : 0}%
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-trading-muted">Avg R</div>
                                  <div className="font-semibold text-orange-300">
                                    {data.trades.length > 0 ? (data.totalR / data.trades.length).toFixed(2) : 0}R
                                  </div>
                                </div>
                                <div className="text-center w-24">
                                  <div className="text-xs text-trading-muted">Total P&L</div>
                                  <div className={`font-bold ${data.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(data.totalPnL)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* ✅ PHASE 3: TAB 12 - RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsDashboard />
        </TabsContent>

      </Tabs>
    </div>
  );
}
