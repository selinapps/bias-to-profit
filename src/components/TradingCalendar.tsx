import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Settings, Calendar, TrendingUp, TrendingDown, DollarSign, CalendarDays, Target, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, addDays, getWeek, getDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradingCalendarProps {
  trades: Trade[];
}

interface DayData {
  date: Date;
  trades: Trade[];
  pnl: number;
  winRate: number;
  tradeCount: number;
}

interface WeekData {
  weekNumber: number;
  days: DayData[];
  totalPnL: number;
  tradingDays: number;
}

export function TradingCalendar({ trades }: TradingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { isMobile } = useMobileOptimizations();

  // Filter trades for the current month
  const monthTrades = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return trades.filter(trade => {
      if (trade.status !== 'closed' || !trade.exit_time) return false;
      const tradeDate = new Date(trade.exit_time);
      return tradeDate >= monthStart && tradeDate <= monthEnd;
    });
  }, [trades, currentDate]);

  // Group trades by day
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, DayData>();
    
    monthTrades.forEach(trade => {
      const tradeDate = new Date(trade.exit_time!);
      const dateKey = tradeDate.toISOString().split('T')[0];
      
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: tradeDate,
          trades: [],
          pnl: 0,
          winRate: 0,
          tradeCount: 0
        });
      }
      
      const dayData = dayMap.get(dateKey)!;
      dayData.trades.push(trade);
      dayData.pnl += trade.pnl || 0;
      dayData.tradeCount++;
    });
    
    // Calculate win rates
    dayMap.forEach(dayData => {
      const wins = dayData.trades.filter(trade => (trade.pnl || 0) > 0).length;
      dayData.winRate = dayData.tradeCount > 0 ? (wins / dayData.tradeCount) * 100 : 0;
    });
    
    return Array.from(dayMap.values());
  }, [monthTrades]);

  // Group days by week - include all weeks in the month
  const weeklyData = useMemo(() => {
    const weekMap = new Map<number, WeekData>();
    
    // First, add all weeks that have trading data
    dailyData.forEach(dayData => {
      const weekNumber = getWeek(dayData.date);
      
      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, {
          weekNumber,
          days: [],
          totalPnL: 0,
          tradingDays: 0
        });
      }
      
      const weekData = weekMap.get(weekNumber)!;
      weekData.days.push(dayData);
      weekData.totalPnL += dayData.pnl;
      if (dayData.tradeCount > 0) weekData.tradingDays++;
    });
    
    // Now add all weeks in the current month, even if they have no trades
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    let currentWeekStart = calendarStart;
    while (currentWeekStart <= calendarEnd) {
      const weekNumber = getWeek(currentWeekStart);
      
      // Only add if this week is not already in the map
      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, {
          weekNumber,
          days: [],
          totalPnL: 0,
          tradingDays: 0
        });
      }
      
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  }, [dailyData, currentDate]);

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const totalPnL = dailyData.reduce((sum, day) => sum + day.pnl, 0);
    const tradingDays = dailyData.filter(day => day.tradeCount > 0).length;
    
    return { totalPnL, tradingDays };
  }, [dailyData]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const days = [];
    let currentDay = calendarStart;
    
    while (currentDay <= calendarEnd) {
      const dayData = dailyData.find(day => isSameDay(day.date, currentDay));
      days.push({
        date: currentDay,
        isCurrentMonth: isSameMonth(currentDay, currentDate),
        data: dayData
      });
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  }, [currentDate, dailyData]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const getDayColor = (dayData: DayData | undefined) => {
    if (!dayData || dayData.tradeCount === 0) return 'bg-muted/20';
    if (dayData.pnl > 0) return 'bg-success/20 border-success/30';
    return 'bg-destructive/20 border-destructive/30';
  };

  const getWeekColor = (weekData: WeekData) => {
    if (weekData.tradingDays === 0) return 'text-muted-foreground';
    if (weekData.totalPnL > 0) return 'text-success';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Monthly Stats Card */}
      <div className="space-y-4">
        {/* Month Navigation */}
        <Card className="bg-trading-card border-trading-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="h-8 w-8 p-0 hover:bg-trading-accent/10 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="h-8 w-8 p-0 hover:bg-trading-accent/10 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="text-sm hover:bg-trading-accent/10 transition-colors"
                >
                  This month
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-trading-accent/10 transition-colors">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Enhanced Monthly Stats Card */}
        <Card className="bg-gradient-to-br from-trading-card to-trading-card/80 border-trading-border shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-trading-accent/10 rounded-lg group-hover:bg-trading-accent/20 transition-colors">
                  <BarChart3 className="h-5 w-5 text-trading-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Monthly Performance</h3>
                  <p className="text-sm text-trading-muted">{format(currentDate, 'MMMM yyyy')} Overview</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`px-3 py-1 self-start sm:self-auto ${
                  monthlyStats.totalPnL >= 0 
                    ? 'bg-green-500/10 text-green-400 border-green-400/30' 
                    : 'bg-red-500/10 text-red-400 border-red-400/30'
                }`}
              >
                {monthlyStats.totalPnL >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {monthlyStats.totalPnL >= 0 ? 'Profitable' : 'Loss'}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6`}>
              {/* P&L Card */}
              <div className="bg-background/50 border border-trading-border rounded-xl p-3 sm:p-4 hover:bg-background/70 hover:scale-105 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-trading-accent group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-trading-muted">Total P&L</span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold transition-colors ${
                  monthlyStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {monthlyStats.totalPnL >= 0 ? '+' : ''}${Math.abs(monthlyStats.totalPnL).toFixed(0)}
                </div>
                <div className="text-xs text-trading-muted mt-1">
                  {monthlyStats.totalPnL >= 0 ? 'Profit' : 'Loss'}
                </div>
              </div>

              {/* Trading Days Card */}
              <div className="bg-background/50 border border-trading-border rounded-xl p-3 sm:p-4 hover:bg-background/70 hover:scale-105 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-trading-accent group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-trading-muted">Trading Days</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {monthlyStats.tradingDays}
                </div>
                <div className="text-xs text-trading-muted mt-1">
                  Active days
                </div>
              </div>

              {/* Win Rate Card */}
              <div className="bg-background/50 border border-trading-border rounded-xl p-3 sm:p-4 hover:bg-background/70 hover:scale-105 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-trading-accent group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-trading-muted">Win Rate</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {monthlyStats.tradingDays > 0 
                    ? ((dailyData.filter(day => day.pnl > 0).length / dailyData.filter(day => day.tradeCount > 0).length) * 100).toFixed(0)
                    : 0}%
                </div>
                <div className="text-xs text-trading-muted mt-1">
                  Success rate
                </div>
              </div>

              {/* Average Daily P&L Card */}
              <div className="bg-background/50 border border-trading-border rounded-xl p-3 sm:p-4 hover:bg-background/70 hover:scale-105 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-trading-accent group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-trading-muted">Avg Daily</span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold transition-colors ${
                  monthlyStats.tradingDays > 0 && (monthlyStats.totalPnL / monthlyStats.tradingDays) >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {monthlyStats.tradingDays > 0 
                    ? `${(monthlyStats.totalPnL / monthlyStats.tradingDays) >= 0 ? '+' : ''}$${Math.abs(monthlyStats.totalPnL / monthlyStats.tradingDays).toFixed(0)}`
                    : '$0'
                  }
                </div>
                <div className="text-xs text-trading-muted mt-1">
                  Per trading day
                </div>
              </div>
            </div>

            {/* Progress Bar for Month Completion */}
            <div className="mt-4 sm:mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-trading-muted">Month Progress</span>
                <span className="text-sm text-trading-muted font-medium">
                  {Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-trading-accent via-trading-accent/90 to-trading-accent/70 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${Math.min((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100, 100)}%` 
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-trading-muted">
                <span>Start of month</span>
                <span>End of month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isMobile ? (
        /* Mobile Layout - List View */
        <div className="space-y-4">
          {/* Trading Days List */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Trading Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dailyData
                .filter(day => day.tradeCount > 0)
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((dayData) => (
                  <div
                    key={dayData.date.toISOString()}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      dayData.pnl >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {format(dayData.date, 'MMM d')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(dayData.date, 'EEEE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        dayData.pnl >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayData.tradeCount} trades • {dayData.winRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              {dailyData.filter(day => day.tradeCount > 0).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trading days this month</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Summary - Mobile */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Weekly Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {weeklyData.map((week) => (
                  <div
                    key={week.weekNumber}
                    className={`p-3 rounded-lg border ${
                      week.tradingDays === 0 
                        ? 'bg-muted/10 border-muted/20' 
                        : week.totalPnL >= 0 
                          ? 'bg-success/10 border-success/20' 
                          : 'bg-destructive/10 border-destructive/20'
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Week {week.weekNumber}
                    </div>
                    <div className={`text-sm font-semibold ${
                      week.tradingDays === 0 
                        ? 'text-muted-foreground' 
                        : week.totalPnL >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                    }`}>
                      {week.totalPnL >= 0 ? '+' : ''}${week.totalPnL.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {week.tradingDays} days
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Desktop Layout - Calendar Grid */
        <div className="flex gap-6">
          {/* Calendar Grid */}
          <div className="flex-1">
            <Card className="bg-trading-card border-trading-border">
              <CardContent className="p-6">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[80px] p-2 rounded-lg border ${
                        day.isCurrentMonth ? 'bg-background' : 'bg-muted/10'
                      } ${getDayColor(day.data)}`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(day.date, 'd')}
                      </div>
                      {day.data && day.data.tradeCount > 0 && (
                        <div className="space-y-1">
                          <div className={`text-xs font-semibold ${
                            day.data.pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            ${day.data.pnl.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {day.data.tradeCount} trades
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {day.data.winRate.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Summary Sidebar */}
          <div className="w-64">
            <Card className="bg-trading-card border-trading-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Weekly Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyData.map((week, index) => (
                  <div key={week.weekNumber} className="space-y-1">
                    <div className="text-sm font-medium">
                      Week {week.weekNumber}
                    </div>
                    <div className={`text-sm ${getWeekColor(week)}`}>
                      {week.totalPnL >= 0 ? '+' : ''}${week.totalPnL.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {week.tradingDays} days
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
