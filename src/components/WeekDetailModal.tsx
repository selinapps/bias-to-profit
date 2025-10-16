import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Target,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Brain,
  Download,
  Edit,
  Plus,
  CalendarDays
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type Trade = Database['public']['Tables']['trades']['Row'];

interface WeekDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekNumber: number;
  weekStartDate: Date;
}

interface WeekTradeData {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  tradingDays: number;
  trades: Trade[];
  dailyBreakdown: { [key: string]: { date: Date; pnl: number; trades: number; winRate: number } };
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  strategyBreakdown: { [key: string]: { count: number; pnl: number } };
  dailyPerformance: Array<{ date: Date; dayName: string; pnl: number; trades: number; winRate: number }>;
}

export function WeekDetailModal({ isOpen, onClose, weekNumber, weekStartDate }: WeekDetailModalProps) {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<WeekTradeData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && weekStartDate && user) {
      fetchWeekData();
    }
  }, [isOpen, weekStartDate, user]);

  const fetchWeekData = async () => {
    if (!weekStartDate || !user) return;

    setLoading(true);
    try {
      const weekStart = startOfWeek(weekStartDate);
      const weekEnd = endOfWeek(weekStartDate);
      
      const startOfDay = new Date(weekStart);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(weekEnd);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch trades for the entire week
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', startOfDay.toISOString())
        .lte('entry_time', endOfDay.toISOString())
        .order('entry_time', { ascending: true });

      if (error) throw error;

      const closedTrades = trades?.filter(trade => trade.exit_time) || [];
      const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const totalTrades = closedTrades.length;
      const winRate = totalTrades > 0 ? (closedTrades.filter(trade => (trade.pnl || 0) > 0).length / totalTrades) * 100 : 0;

      // Find best and worst trades
      const bestTrade = closedTrades.reduce((best, trade) => 
        (trade.pnl || 0) > (best?.pnl || 0) ? trade : best, closedTrades[0] || null);
      
      const worstTrade = closedTrades.reduce((worst, trade) => 
        (trade.pnl || 0) < (worst?.pnl || 0) ? trade : worst, closedTrades[0] || null);

      // Daily breakdown
      const dailyBreakdown: { [key: string]: { date: Date; pnl: number; trades: number; winRate: number } } = {};
      const dailyPerformance: Array<{ date: Date; dayName: string; pnl: number; trades: number; winRate: number }> = [];
      
      // Initialize all days of the week
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const dateKey = format(dayDate, 'yyyy-MM-dd');
        const dayName = format(dayDate, 'EEEE');
        
        dailyBreakdown[dateKey] = {
          date: dayDate,
          pnl: 0,
          trades: 0,
          winRate: 0
        };
        
        dailyPerformance.push({
          date: dayDate,
          dayName,
          pnl: 0,
          trades: 0,
          winRate: 0
        });
      }

      // Populate with actual trade data
      closedTrades.forEach(trade => {
        const tradeDate = new Date(trade.entry_time);
        const dateKey = format(tradeDate, 'yyyy-MM-dd');
        
        if (dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey].pnl += trade.pnl || 0;
          dailyBreakdown[dateKey].trades++;
        }
      });

      // Calculate win rates for each day
      Object.keys(dailyBreakdown).forEach(dateKey => {
        const dayTrades = closedTrades.filter(trade => 
          format(new Date(trade.entry_time), 'yyyy-MM-dd') === dateKey
        );
        const dayWins = dayTrades.filter(trade => (trade.pnl || 0) > 0).length;
        dailyBreakdown[dateKey].winRate = dayTrades.length > 0 ? (dayWins / dayTrades.length) * 100 : 0;
      });

      // Update daily performance array
      dailyPerformance.forEach(day => {
        const dateKey = format(day.date, 'yyyy-MM-dd');
        if (dailyBreakdown[dateKey]) {
          day.pnl = dailyBreakdown[dateKey].pnl;
          day.trades = dailyBreakdown[dateKey].trades;
          day.winRate = dailyBreakdown[dateKey].winRate;
        }
      });

      // Strategy breakdown
      const strategyBreakdown: { [key: string]: { count: number; pnl: number } } = {};
      closedTrades.forEach(trade => {
        const strategy = trade.model || 'Unknown';
        if (!strategyBreakdown[strategy]) {
          strategyBreakdown[strategy] = { count: 0, pnl: 0 };
        }
        strategyBreakdown[strategy].count++;
        strategyBreakdown[strategy].pnl += trade.pnl || 0;
      });

      const tradingDays = Object.values(dailyBreakdown).filter(day => day.trades > 0).length;

      setWeekData({
        weekNumber,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalPnL,
        totalTrades,
        winRate,
        tradingDays,
        trades: closedTrades,
        dailyBreakdown,
        bestTrade,
        worstTrade,
        strategyBreakdown,
        dailyPerformance
      });
    } catch (error) {
      console.error('Error fetching week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getTradeIcon = (trade: Trade) => {
    if ((trade.pnl || 0) > 0) {
      return <ArrowUpRight className="h-4 w-4 text-success" />;
    } else if ((trade.pnl || 0) < 0) {
      return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    }
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />;
      case 'mean reversion':
        return <Brain className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  if (!weekStartDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-foreground" />
            Week {weekNumber} Performance - {format(weekStartDate, 'MMM d')} to {format(endOfWeek(weekStartDate), 'MMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : weekData ? (
          <div className="space-y-6">
            {/* Week Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    weekData.totalPnL > 0 ? 'text-success' : 
                    weekData.totalPnL < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatCurrency(weekData.totalPnL)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                  </div>
                  <div className="text-2xl font-bold mt-1 text-foreground">
                    {weekData.totalTrades}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    weekData.winRate >= 70 ? 'text-success' : 
                    weekData.winRate >= 50 ? 'text-yellow-500' : 'text-destructive'
                  }`}>
                    {weekData.winRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-foreground" />
                    <span className="text-sm text-muted-foreground">Trading Days</span>
                  </div>
                  <div className="text-2xl font-bold mt-1 text-foreground">
                    {weekData.tradingDays}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Avg P&L</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    weekData.totalTrades > 0 ? 
                      (weekData.totalPnL / weekData.totalTrades > 0 ? 'text-success' : 'text-destructive') :
                      'text-muted-foreground'
                  }`}>
                    {weekData.totalTrades > 0 ? 
                      formatCurrency(weekData.totalPnL / weekData.totalTrades) : 
                      '$0'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="daily" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
                <TabsTrigger value="trades">All Trades</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              {/* Daily Breakdown Tab */}
              <TabsContent value="daily" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Daily Performance Breakdown</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekData.dailyPerformance.map((day, index) => (
                    <Card key={index} className={`${day.trades > 0 ? 'bg-background' : 'bg-muted/10'}`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          {day.dayName}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {format(day.date, 'MMM d')}
                        </div>
                        <div className={`text-lg font-bold mb-1 ${
                          day.pnl > 0 ? 'text-success' : 
                          day.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {formatCurrency(day.pnl)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.trades} trades
                        </div>
                        {day.trades > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {day.winRate.toFixed(0)}% win rate
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* All Trades Tab */}
              <TabsContent value="trades" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">All Trades This Week</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </div>
                </div>

                {weekData.trades.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No trades found for this week</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {weekData.trades.map((trade) => (
                      <Card key={trade.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getTradeIcon(trade)}
                              <div>
                                <div className="font-semibold">{trade.asset}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(trade.entry_time), 'MMM d, HH:mm')} - {trade.exit_time ? format(new Date(trade.exit_time), 'HH:mm') : 'Open'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={`font-bold ${
                                (trade.pnl || 0) > 0 ? 'text-success' : 
                                (trade.pnl || 0) < 0 ? 'text-destructive' : 'text-muted-foreground'
                              }`}>
                                {formatCurrency(trade.pnl || 0)}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {getStrategyIcon(trade.model || '')}
                                <Badge variant="secondary" className="text-xs">
                                  {trade.model || 'Unknown'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Best/Worst Trades */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Best & Worst Trades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {weekData.bestTrade && (
                        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                          <div>
                            <div className="font-semibold text-success">Best Trade</div>
                            <div className="text-sm">{weekData.bestTrade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(weekData.bestTrade.entry_time), 'MMM d, HH:mm')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-success">
                              {formatCurrency(weekData.bestTrade.pnl || 0)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {weekData.bestTrade.model}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {weekData.worstTrade && weekData.worstTrade.id !== weekData.bestTrade?.id && (
                        <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <div>
                            <div className="font-semibold text-destructive">Worst Trade</div>
                            <div className="text-sm">{weekData.worstTrade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(weekData.worstTrade.entry_time), 'MMM d, HH:mm')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-destructive">
                              {formatCurrency(weekData.worstTrade.pnl || 0)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {weekData.worstTrade.model}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Strategy Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Strategy Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(weekData.strategyBreakdown).map(([strategy, data]) => (
                        <div key={strategy} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStrategyIcon(strategy)}
                            <span className="font-medium">{strategy}</span>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${
                              data.pnl > 0 ? 'text-success' : 
                              data.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {formatCurrency(data.pnl)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.count} trades
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Trading Consistency</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {weekData.tradingDays === 0 ? 'No trading activity' :
                           weekData.tradingDays <= 2 ? 'Light trading week' :
                           weekData.tradingDays <= 4 ? 'Moderate trading week' :
                           'Active trading week'}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Weekly Performance</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {weekData.totalPnL > 0 ? 'Profitable week' : 
                           weekData.totalPnL < 0 ? 'Losing week' : 'Break-even week'}
                          {weekData.totalTrades > 0 && ` | Avg: ${formatCurrency(weekData.totalPnL / weekData.totalTrades)}`}
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Strategy Diversity</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {Object.keys(weekData.strategyBreakdown).length > 1 ? 
                            `${Object.keys(weekData.strategyBreakdown).length} strategies used` : 
                            'Single strategy focus'
                          }
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Risk Management</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Win rate: {weekData.winRate.toFixed(1)}% | 
                          {weekData.winRate >= 70 ? ' Excellent consistency' :
                           weekData.winRate >= 50 ? ' Good performance' : ' Needs improvement'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available for this week</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
