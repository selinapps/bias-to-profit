import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  DollarSign,
  BarChart3
} from 'lucide-react';

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

interface DailySummaryCardsProps {
  reflection: DailyReflection;
}

export function DailySummaryCards({ reflection }: DailySummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
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

  console.log('DailySummaryCards rendering with reflection:', reflection);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Trades */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{reflection.total_trades}</div>
          <p className="text-xs text-muted-foreground">
            {reflection.total_trades === 0 ? 'No trades today' : 
             reflection.total_trades === 1 ? '1 trade executed' : 
             `${reflection.total_trades} trades executed`}
          </p>
        </CardContent>
      </Card>

      {/* Net R Multiple / P&L */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net R Multiple</CardTitle>
          {reflection.net_r_multiple >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(reflection.net_r_multiple || 0)}`}>
            {(reflection.net_r_multiple || 0).toFixed(2)}R
          </div>
          <p className="text-xs text-muted-foreground">
            P&L: {formatCurrency(reflection.net_pnl)}
          </p>
        </CardContent>
      </Card>

      {/* Average Emotional Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Emotional Score</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(reflection.avg_emotional_score)}`}>
            {reflection.avg_emotional_score ? reflection.avg_emotional_score.toFixed(1) : 'N/A'}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(reflection.avg_emotional_score / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">/5</span>
          </div>
        </CardContent>
      </Card>

      {/* Plan Adherence */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plan Adherence</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPercentageColor(reflection.plan_adherence_percentage)}`}>
            {formatPercentage(reflection.plan_adherence_percentage)}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${reflection.plan_adherence_percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">checklist</span>
          </div>
        </CardContent>
      </Card>

      {/* Bias Accuracy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bias Accuracy</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPercentageColor(reflection.bias_accuracy_percentage)}`}>
            {formatPercentage(reflection.bias_accuracy_percentage)}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${reflection.bias_accuracy_percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">aligned</span>
          </div>
        </CardContent>
      </Card>

      {/* Session Discipline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Session Discipline</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPercentageColor(reflection.session_discipline_percentage)}`}>
            {formatPercentage(reflection.session_discipline_percentage)}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${reflection.session_discipline_percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">timing</span>
          </div>
        </CardContent>
      </Card>

      {/* Top Mistakes */}
      {reflection.top_mistakes && reflection.top_mistakes.length > 0 ? (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
              Top Mistakes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {reflection.top_mistakes.map((mistake, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
                  {mistake}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Positive Actions */}
      {reflection.positive_actions && reflection.positive_actions.length > 0 ? (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Positive Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {reflection.positive_actions.map((action, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {action}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
