import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Settings, Calendar, TrendingUp, TrendingDown, DollarSign, CalendarDays, Target, BarChart3, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, addDays, getWeek, getDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DayDetailModal } from './DayDetailModal';
import { WeekDetailModal } from './WeekDetailModal';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradingCalendarProps {
  trades: Trade[];
  onAddTrade?: (date: Date) => void;
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

export function TradingCalendar({ trades: propTrades, onAddTrade }: TradingCalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<Date | null>(null);
  const [isWeekDetailOpen, setIsWeekDetailOpen] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const { isMobile } = useMobileOptimizations();

  // Fetch trades directly from database to ensure consistency with DayDetailModal
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('entry_time', { ascending: false });

        if (error) throw error;
        
        // Filter for closed trades like DayDetailModal does
        const closedTrades = data?.filter(trade => trade.exit_time) || [];
        
        // Debug logging can be removed after verification
        setTrades(closedTrades);
      } catch (error) {
        console.error('Error fetching trades for calendar:', error);
        // Fallback to prop trades if database fetch fails
        setTrades(propTrades);
      }
    };

    fetchTrades();
  }, [user, currentDate, propTrades]);

  // Filter trades for the current month
  const monthTrades = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const filtered = trades.filter(trade => {
      // Use entry_time to be consistent with DayDetailModal
      const tradeDate = new Date(trade.entry_time);
      return tradeDate >= monthStart && tradeDate <= monthEnd;
    });
    
    // Debug logging can be removed after verification
    
    return filtered;
  }, [trades, currentDate]);

  // Fetch day-specific data using same logic as DayDetailModal
  const [dailyDataMap, setDailyDataMap] = useState<Map<string, DayData>>(new Map());

  useEffect(() => {
    const fetchDailyData = async () => {
      if (!user) return;

      const newDailyDataMap = new Map<string, DayData>();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      // Get all days in the month
      const daysInMonth = [];
      let currentDay = monthStart;
      while (currentDay <= monthEnd) {
        daysInMonth.push(new Date(currentDay));
        currentDay = addDays(currentDay, 1);
      }

      // Fetch data for each day using DayDetailModal logic
      for (const day of daysInMonth) {
        try {
          const startOfDay = new Date(day);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(day);
          endOfDay.setHours(23, 59, 59, 999);

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

          const dateKey = day.toISOString().split('T')[0];
          newDailyDataMap.set(dateKey, {
            date: day,
            trades: closedTrades,
            pnl: totalPnL,
            winRate: winRate,
            tradeCount: totalTrades
          });
        } catch (error) {
          console.error(`Error fetching data for ${day.toISOString().split('T')[0]}:`, error);
        }
      }

      setDailyDataMap(newDailyDataMap);
    };

    fetchDailyData();
  }, [user, currentDate]);

  const dailyData = useMemo(() => {
    return Array.from(dailyDataMap.values());
  }, [dailyDataMap]);

  // Group days by week - include all weeks in the month
  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, WeekData>();
    
    // Get calendar weeks for the current month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    // Create week entries for all weeks in the calendar view
    let currentWeekStart = calendarStart;
    let weekIndex = 1;
    
    while (currentWeekStart <= calendarEnd) {
      const weekKey = `${currentWeekStart.getFullYear()}-${currentWeekStart.getMonth()}-${weekIndex}`;
      
      weekMap.set(weekKey, {
        weekNumber: weekIndex,
        days: [],
        totalPnL: 0,
        tradingDays: 0
      });
      
      currentWeekStart = addDays(currentWeekStart, 7);
      weekIndex++;
    }
    
    // Now populate with actual trading data - show complete week performance
    dailyData.forEach(dayData => {
      // Find which week this day belongs to
      let currentWeekStart = calendarStart;
      let weekIndex = 1;
      
      while (currentWeekStart <= calendarEnd) {
        const weekEnd = addDays(currentWeekStart, 6);
        
        if (dayData.date >= currentWeekStart && dayData.date <= weekEnd) {
          const weekKey = `${currentWeekStart.getFullYear()}-${currentWeekStart.getMonth()}-${weekIndex}`;
          const weekData = weekMap.get(weekKey);
          
          if (weekData) {
            // Include all days of the week for complete weekly performance
            weekData.days.push(dayData);
            weekData.totalPnL += dayData.pnl; // Sum all days in the week
            // Count trading days like WeekDetailModal does
            if (dayData.tradeCount > 0) weekData.tradingDays++;
          }
          break;
        }
        
        currentWeekStart = addDays(currentWeekStart, 7);
        weekIndex++;
      }
    });
    
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

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDayDetailOpen(true);
  };

  const handleWeekClick = (weekData: WeekData) => {
    // Calculate the week start date based on the week number
    const monthStart = startOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    
    // Calculate the start date for this week number
    const weekStartDate = addDays(calendarStart, (weekData.weekNumber - 1) * 7);
    
    setSelectedWeekNumber(weekData.weekNumber);
    setSelectedWeekStartDate(weekStartDate);
    setIsWeekDetailOpen(true);
  };

  const closeDayDetail = () => {
    setIsDayDetailOpen(false);
    setSelectedDate(null);
  };

  const closeWeekDetail = () => {
    setIsWeekDetailOpen(false);
    setSelectedWeekNumber(null);
    setSelectedWeekStartDate(null);
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
                  <CalendarDays className="h-4 w-4 text-foreground group-hover:scale-110 transition-transform" />
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
                <Calendar className="h-4 w-4 text-foreground" />
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
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-foreground opacity-50" />
                  <p>No trading days this month</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Summary - Mobile */}
          <Card className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-foreground" />
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
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2 truncate">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date.toISOString().split('T')[0];
                    const dayData = dailyDataMap.get(dateKey);
                    
                    return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day.date)}
                      className={`h-[90px] p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 ${
                        day.isCurrentMonth ? 'bg-background' : 'bg-muted/10 opacity-50'
                      } ${getDayColor(dayData)} overflow-hidden flex flex-col`}
                    >
                      <div className={`text-xs font-medium mb-2 text-center ${
                        day.isCurrentMonth ? '' : 'text-muted-foreground/60'
                      }`}>
                        {format(day.date, 'd')}
                      </div>
                      {dayData && dayData.tradeCount > 0 ? (
                        <div className="flex flex-col justify-center items-center flex-1 space-y-1">
                          <div className={`text-xs font-semibold leading-none text-center ${
                            dayData.pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            ${dayData.pnl.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground leading-none text-center">
                            {dayData.tradeCount}t
                          </div>
                          <div className="text-xs text-muted-foreground leading-none text-center">
                            {dayData.winRate.toFixed(1)}%
                          </div>
                        </div>
                      ) : day.isCurrentMonth && onAddTrade ? (
                        <div className="flex flex-col justify-center items-center flex-1 space-y-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-primary/20 mb-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTrade(day.date);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <div className="text-xs text-muted-foreground text-center">No trades</div>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center flex-1">
                          <div className="text-xs text-muted-foreground text-center">No trades</div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Summary Sidebar */}
          <div className="w-64">
            <Card className="bg-trading-card border-trading-border">
              <CardContent className="p-6">
                {/* Week header to match calendar day headers */}
                <div className="text-center text-sm font-medium text-muted-foreground py-2 mb-4">
                  Weekly Performance
                </div>
                
                {/* Weekly summary rows aligned with calendar rows */}
                <div className="space-y-1">
                  {weeklyData.map((week, index) => (
                    <div 
                      key={week.weekNumber} 
                      onClick={() => handleWeekClick(week)}
                      className={`h-[90px] p-3 rounded-lg border bg-background cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col ${
                        week.tradingDays === 0 ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="text-center text-xs font-medium mb-2">
                        Week {week.weekNumber}
                      </div>
                      <div className="flex flex-col justify-center items-center flex-1 space-y-1">
                        <div className={`text-xs font-semibold leading-tight text-center ${getWeekColor(week)}`}>
                          {week.totalPnL >= 0 ? '+' : ''}${week.totalPnL.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight text-center">
                          {week.tradingDays} days
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
        <DayDetailModal
          isOpen={isDayDetailOpen}
          onClose={closeDayDetail}
          selectedDate={selectedDate}
          onAddTrade={onAddTrade}
        />

      {/* Week Detail Modal */}
      <WeekDetailModal
        isOpen={isWeekDetailOpen}
        onClose={closeWeekDetail}
        weekNumber={selectedWeekNumber || 0}
        weekStartDate={selectedWeekStartDate || new Date()}
      />
    </div>
  );
}
