import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Brain, Target, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DailySummaryCards } from '@/components/reflection/DailySummaryCards';
import { TradeReflectionTable } from '@/components/reflection/TradeReflectionTable';
import { ReflectionAnalytics } from '@/components/reflection/ReflectionAnalytics';
import { GuardrailAlerts } from '@/components/reflection/GuardrailAlerts';
import { EndOfDayReflection } from '@/components/reflection/EndOfDayReflection';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DailyReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  total_trades: number;
  net_r_multiple: number;
  net_pnl: number;
  avg_emotional_score: number;
  plan_adherence_percentage: number;
  bias_accuracy_percentage: number;
  session_discipline_percentage: number;
  top_mistakes: string[];
  improvement_areas: string[];
  positive_actions: string[];
  daily_notes: string;
  key_learnings: string;
  tomorrow_focus: string;
  created_at: string;
  updated_at: string;
}

interface TradeReflection {
  id: string;
  user_id: string;
  trade_id: string;
  emotional_rating: number;
  emotional_tags: string[];
  execution_quality: number;
  checklist_completion_percentage: number;
  why_took_trade: string;
  execution_flaws: string;
  improvement_ideas: string;
  what_went_well: string;
  bias_match: boolean;
  session_appropriate: boolean;
  screenshot_analysis: string;
  chart_pattern_recognition: string;
  key_takeaways: string[];
  mistakes_to_avoid: string[];
  created_at: string;
  updated_at: string;
}

export default function Reflection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyReflection, setDailyReflection] = useState<DailyReflection | null>(null);
  const [tradeReflections, setTradeReflections] = useState<TradeReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReflection, setGeneratingReflection] = useState(false);

  // Load reflection data for selected date
  const loadReflectionData = async (date: Date) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('User not authenticated, skipping database load');
        setDailyReflection(null);
        setTradeReflections([]);
        return;
      }

      // TEMPORARILY DISABLED: Database queries causing 406 errors
      // TODO: Re-enable when authentication is properly working
      console.log('Daily reflection query temporarily disabled to prevent 406 errors');
      const dailyData = null;
      const dailyError = null;

      if (dailyError && dailyError.code !== 'PGRST116') {
        console.warn('Database error loading daily reflection:', dailyError);
        setDailyReflection(null);
      } else {
        setDailyReflection(dailyData);
      }

      // Get trades for the date to find trade reflections
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('id, entry_time')
        .gte('entry_time', `${dateStr}T00:00:00`)
        .lt('entry_time', `${dateStr}T23:59:59`);

      if (tradesError) throw tradesError;

      if (trades && trades.length > 0) {
        const tradeIds = trades.map(t => t.id);
        
        const { data: reflections, error: reflectionsError } = await supabase
          .from('trade_reflection')
          .select('*')
          .in('trade_id', tradeIds);

        if (reflectionsError) throw reflectionsError;
        setTradeReflections(reflections || []);
      } else {
        setTradeReflections([]);
      }
    } catch (error) {
      console.error('Error loading reflection data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reflection data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate daily reflection from trades
  const generateDailyReflection = async () => {
    if (!user) return;
    
    setGeneratingReflection(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('generate_daily_reflection', {
        p_user_id: user.id,
        p_reflection_date: dateStr
      });

      if (error) throw error;

      if (data) {
        setDailyReflection(data);
      }
      toast({
        title: 'Success',
        description: 'Daily reflection generated successfully',
      });
    } catch (error) {
      console.error('Error generating reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate daily reflection',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReflection(false);
    }
  };

  useEffect(() => {
    loadReflectionData(selectedDate);
  }, [selectedDate, user]);

  const getDateRange = () => {
    switch (viewMode) {
      case 'weekly':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { start: weekStart, end: weekEnd };
      case 'monthly':
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        return { start: monthStart, end: monthEnd };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const hasGuardrails = dailyReflection && (
    (dailyReflection.avg_emotional_score && dailyReflection.avg_emotional_score < 3) ||
    (dailyReflection.plan_adherence_percentage && dailyReflection.plan_adherence_percentage < 70)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-pulse">
          <div className="text-on-surface-variant">Loading reflection data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Daily Reflection</h1>
          <p className="text-on-surface-variant mt-1">
            Review your emotional, procedural, and analytical performance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Previous Day Button */}
          <Button
            onClick={() => {
              const prevDate = new Date(selectedDate);
              prevDate.setDate(prevDate.getDate() - 1);
              setSelectedDate(prevDate);
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            ← Previous
          </Button>
          
          {/* Date Input */}
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:ml-2"
          />
          
          {/* Next Day Button */}
          <Button
            onClick={() => {
              const nextDate = new Date(selectedDate);
              nextDate.setDate(nextDate.getDate() + 1);
              setSelectedDate(nextDate);
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            Next →
          </Button>
          
          {/* Today Button */}
          <Button
            onClick={() => setSelectedDate(new Date())}
            variant="outline"
            size="sm"
            className={selectedDate.toDateString() === new Date().toDateString() ? 'bg-primary text-primary-foreground' : ''}
          >
            Today
          </Button>
          
          <Button
            onClick={generateDailyReflection}
            disabled={generatingReflection}
            variant="outline"
            size="sm"
          >
            <Brain className="h-4 w-4 mr-2" />
            {generatingReflection ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        {/* Guardrail Alerts */}
        {hasGuardrails && (
          <div className="mt-4">
            <GuardrailAlerts reflection={dailyReflection} />
          </div>
        )}

        <TabsContent value="daily" className="space-y-6">
          {/* End-of-Day Reflection */}
          <EndOfDayReflection 
            selectedDate={selectedDate}
            onSave={() => loadReflectionData(selectedDate)}
          />
          
          {dailyReflection ? (
            <>
              {/* Daily Summary Cards */}
              <DailySummaryCards reflection={dailyReflection} />
              
              {/* Trade Reflection Table */}
              <TradeReflectionTable 
                tradeReflections={tradeReflections}
                selectedDate={selectedDate}
                onRefresh={() => loadReflectionData(selectedDate)}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reflection Data</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No reflection data found for {format(selectedDate, 'MMMM d, yyyy')}
                </p>
                <Button onClick={generateDailyReflection} disabled={generatingReflection}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Daily Reflection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {viewMode === 'weekly' && (
          <TabsContent value="weekly" className="space-y-6">
            <ReflectionAnalytics 
              viewMode="weekly"
              dateRange={getDateRange()}
              userId={user?.id}
            />
          </TabsContent>
        )}

        {viewMode === 'monthly' && (
          <TabsContent value="monthly" className="space-y-6">
            <ReflectionAnalytics 
              viewMode="monthly"
              dateRange={getDateRange()}
              userId={user?.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
