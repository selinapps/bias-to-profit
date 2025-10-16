import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  BarChart3,
  Download,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface ReflectionAnalyticsData {
  reflection_date: string;
  total_trades: number;
  net_r_multiple: number;
  net_pnl: number;
  emotional_score: number;
  plan_adherence: number;
  bias_accuracy: number;
  session_discipline: number;
  top_mistakes: string[];
  positive_actions: string[];
}

interface ReflectionAnalyticsProps {
  viewMode: 'weekly' | 'monthly';
  dateRange: { start: Date; end: Date };
  userId?: string;
}

export function ReflectionAnalytics({ viewMode, dateRange, userId }: ReflectionAnalyticsProps) {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<ReflectionAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState<any>(null);

  // Load analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_reflection_analytics', {
          p_user_id: userId,
          p_days: viewMode === 'weekly' ? 7 : 30
        });

        if (error) throw error;

        const filteredData = (data || []).filter((item: any) => {
          const itemDate = new Date(item.reflection_date);
          return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });

        setAnalyticsData(filteredData);
        
        // Calculate aggregated stats
        if (filteredData.length > 0) {
          const stats = calculateAggregatedStats(filteredData);
          setAggregatedStats(stats);
        }
      } catch (error) {
        console.error('Error loading analytics data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [viewMode, dateRange, userId, toast]);

  const calculateAggregatedStats = (data: ReflectionAnalyticsData[]) => {
    const totalTrades = data.reduce((sum, item) => sum + item.total_trades, 0);
    const totalPnL = data.reduce((sum, item) => sum + item.net_pnl, 0);
    const totalRMultiple = data.reduce((sum, item) => sum + item.net_r_multiple, 0);
    
    const avgEmotionalScore = data.reduce((sum, item) => sum + (item.emotional_score || 0), 0) / data.length;
    const avgPlanAdherence = data.reduce((sum, item) => sum + (item.plan_adherence || 0), 0) / data.length;
    const avgBiasAccuracy = data.reduce((sum, item) => sum + (item.bias_accuracy || 0), 0) / data.length;
    const avgSessionDiscipline = data.reduce((sum, item) => sum + (item.session_discipline || 0), 0) / data.length;

    // Get most common mistakes and positive actions
    const allMistakes = data.flatMap(item => item.top_mistakes || []);
    const allPositiveActions = data.flatMap(item => item.positive_actions || []);
    
    const mistakeCounts = allMistakes.reduce((acc, mistake) => {
      acc[mistake] = (acc[mistake] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const actionCounts = allPositiveActions.reduce((acc, action) => {
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMistakes = Object.entries(mistakeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([mistake]) => mistake);

    const topPositiveActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action]) => action);

    return {
      totalTrades,
      totalPnL,
      totalRMultiple,
      avgEmotionalScore,
      avgPlanAdherence,
      avgBiasAccuracy,
      avgSessionDiscipline,
      topMistakes,
      topPositiveActions,
      daysWithData: data.length,
      totalDays: viewMode === 'weekly' ? 7 : 30
    };
  };

  const exportToPDF = () => {
    toast({
      title: 'Export Feature',
      description: 'PDF export will be available in a future update',
    });
  };

  const getPerformanceColor = (value: number, threshold: number = 0) => {
    if (value > threshold) return 'text-green-600';
    if (value < threshold) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getScoreColor = (value: number, highThreshold: number = 4, lowThreshold: number = 2) => {
    if (value >= highThreshold) return 'text-green-600';
    if (value <= lowThreshold) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getPercentageColor = (value: number, threshold: number = 70) => {
    if (value >= threshold) return 'text-green-600';
    if (value < threshold) return 'text-red-600';
    return 'text-yellow-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading analytics...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground text-center">
            No reflection data available for the selected {viewMode} period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Analytics</h2>
          <p className="text-muted-foreground">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
          </p>
        </div>
        <Button onClick={exportToPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Aggregated Summary */}
      {aggregatedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregatedStats.totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                {aggregatedStats.daysWithData} of {aggregatedStats.totalDays} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total R Multiple</CardTitle>
              {aggregatedStats.totalRMultiple >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(aggregatedStats.totalRMultiple)}`}>
                {aggregatedStats.totalRMultiple.toFixed(2)}R
              </div>
              <p className="text-xs text-muted-foreground">
                P&L: ${aggregatedStats.totalPnL.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Emotional Score</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(aggregatedStats.avgEmotionalScore)}`}>
                {aggregatedStats.avgEmotionalScore.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">out of 5</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Plan Adherence</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPercentageColor(aggregatedStats.avgPlanAdherence)}`}>
                {Math.round(aggregatedStats.avgPlanAdherence)}%
              </div>
              <p className="text-xs text-muted-foreground">checklist completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {aggregatedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                Bias Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getPercentageColor(aggregatedStats.avgBiasAccuracy)}`}>
                {Math.round(aggregatedStats.avgBiasAccuracy)}%
              </div>
              <p className="text-sm text-muted-foreground">trades aligned with bias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                Session Discipline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getPercentageColor(aggregatedStats.avgSessionDiscipline)}`}>
                {Math.round(aggregatedStats.avgSessionDiscipline)}%
              </div>
              <p className="text-sm text-muted-foreground">appropriate timing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
                Consistency Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round((aggregatedStats.avgPlanAdherence + aggregatedStats.avgBiasAccuracy + aggregatedStats.avgSessionDiscipline) / 3)}%
              </div>
              <p className="text-sm text-muted-foreground">overall discipline</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Mistakes and Positive Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aggregatedStats.topMistakes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                Top Mistakes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aggregatedStats.topMistakes.map((mistake: string, index: number) => (
                  <Badge key={index} variant="destructive" className="mr-2 mb-2">
                    {mistake}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {aggregatedStats.topPositiveActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Positive Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aggregatedStats.topPositiveActions.map((action: string, index: number) => (
                  <Badge key={index} variant="secondary" className="mr-2 mb-2">
                    {action}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.map((day) => (
              <div key={day.reflection_date} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium">
                    {format(new Date(day.reflection_date), 'MMM d')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{day.total_trades} trades</span>
                    <span className={`text-sm font-medium ${getPerformanceColor(day.net_r_multiple)}`}>
                      {day.net_r_multiple.toFixed(2)}R
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${getScoreColor(day.emotional_score)}`}>
                      {day.emotional_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${getPercentageColor(day.plan_adherence)}`}>
                      {Math.round(day.plan_adherence)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
