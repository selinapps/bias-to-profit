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
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type Trade = Database['public']['Tables']['trades']['Row'];

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onAddTrade?: (date: Date) => void;
}

interface DayTradeData {
  date: Date;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  trades: Trade[];
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  strategyBreakdown: { [key: string]: { count: number; pnl: number } };
  hourlyBreakdown: { [key: number]: { count: number; pnl: number } };
}

export function DayDetailModal({ isOpen, onClose, selectedDate, onAddTrade }: DayDetailModalProps) {
  const { user } = useAuth();
  const [dayData, setDayData] = useState<DayTradeData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDate && user) {
      fetchDayData();
    }
  }, [isOpen, selectedDate, user]);

  const fetchDayData = async () => {
    if (!selectedDate || !user) return;

    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch trades for the selected day
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

      // Hourly breakdown
      const hourlyBreakdown: { [key: number]: { count: number; pnl: number } } = {};
      closedTrades.forEach(trade => {
        const hour = new Date(trade.entry_time).getHours();
        if (!hourlyBreakdown[hour]) {
          hourlyBreakdown[hour] = { count: 0, pnl: 0 };
        }
        hourlyBreakdown[hour].count++;
        hourlyBreakdown[hour].pnl += trade.pnl || 0;
      });

      setDayData({
        date: selectedDate,
        totalPnL,
        totalTrades,
        winRate,
        trades: closedTrades,
        bestTrade,
        worstTrade,
        strategyBreakdown,
        hourlyBreakdown
      });
    } catch (error) {
      console.error('Error fetching day data:', error);
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

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-foreground" />
            Trading Performance - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dayData ? (
          <div className="space-y-6">
            {/* Day Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    dayData.totalPnL > 0 ? 'text-success' : 
                    dayData.totalPnL < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatCurrency(dayData.totalPnL)}
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
                    {dayData.totalTrades}
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
                    dayData.winRate >= 70 ? 'text-success' : 
                    dayData.winRate >= 50 ? 'text-yellow-500' : 'text-destructive'
                  }`}>
                    {dayData.winRate.toFixed(1)}%
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
                    dayData.totalTrades > 0 ? 
                      (dayData.totalPnL / dayData.totalTrades > 0 ? 'text-success' : 'text-destructive') :
                      'text-muted-foreground'
                  }`}>
                    {dayData.totalTrades > 0 ? 
                      formatCurrency(dayData.totalPnL / dayData.totalTrades) : 
                      '$0'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="trades" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              {/* Trades Tab */}
              <TabsContent value="trades" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Trade Details</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (selectedDate && onAddTrade) {
                          onAddTrade(selectedDate);
                          onClose();
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </div>
                </div>

                {dayData.trades.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No trades found for this day</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {dayData.trades.map((trade) => (
                      <Card key={trade.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getTradeIcon(trade)}
                              <div>
                                <div className="font-semibold">{trade.asset}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatTime(trade.entry_time)} - {trade.exit_time ? formatTime(trade.exit_time) : 'Open'}
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
                      {dayData.bestTrade && (
                        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                          <div>
                            <div className="font-semibold text-success">Best Trade</div>
                            <div className="text-sm">{dayData.bestTrade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(dayData.bestTrade.entry_time)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-success">
                              {formatCurrency(dayData.bestTrade.pnl || 0)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {dayData.bestTrade.model}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {dayData.worstTrade && dayData.worstTrade.id !== dayData.bestTrade?.id && (
                        <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <div>
                            <div className="font-semibold text-destructive">Worst Trade</div>
                            <div className="text-sm">{dayData.worstTrade.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(dayData.worstTrade.entry_time)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-destructive">
                              {formatCurrency(dayData.worstTrade.pnl || 0)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {dayData.worstTrade.model}
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
                      {Object.entries(dayData.strategyBreakdown).map(([strategy, data]) => (
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

                {/* Hourly Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trading Activity by Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const data = dayData.hourlyBreakdown[hour];
                        if (!data) return null;
                        
                        return (
                          <div key={hour} className="text-center p-2 bg-muted/10 dark:bg-muted/20 rounded">
                            <div className="text-xs font-medium">{hour}:00</div>
                            <div className={`text-xs font-bold ${
                              data.pnl > 0 ? 'text-success' : 
                              data.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {formatCurrency(data.pnl)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.count} trades
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Trading Intensity</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {dayData.totalTrades === 0 ? 'No trades' :
                           dayData.totalTrades <= 3 ? 'Light trading day' :
                           dayData.totalTrades <= 7 ? 'Moderate trading activity' :
                           'High trading activity'}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Risk Management</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {dayData.worstTrade && dayData.bestTrade ? 
                            `Max loss: ${formatCurrency(dayData.worstTrade.pnl || 0)} | Max gain: ${formatCurrency(dayData.bestTrade.pnl || 0)}` :
                            'No risk data available'
                          }
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Strategy Effectiveness</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {Object.keys(dayData.strategyBreakdown).length > 1 ? 
                            'Multiple strategies used' : 
                            'Single strategy focus'
                          }
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Consistency</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Win rate: {dayData.winRate.toFixed(1)}% | 
                          {dayData.winRate >= 70 ? ' Excellent' :
                           dayData.winRate >= 50 ? ' Good' : ' Needs improvement'}
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
            <p>No data available for this day</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
