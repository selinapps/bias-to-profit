import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Flame, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Award
} from 'lucide-react';
import type { ChallengeStats, DailyDisciplineTracking } from '@/types/discipline';

interface DisciplineProgressChartProps {
  stats: ChallengeStats;
  dailyTracking: DailyDisciplineTracking[];
  className?: string;
}

export function DisciplineProgressChart({ stats, dailyTracking, className }: DisciplineProgressChartProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-green-600';
    if (streak >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate streak data
  const streakData = dailyTracking.map((day, index) => ({
    day: index + 1,
    score: day.daily_score,
    perfect: day.daily_score === 100,
    violations: day.violation_count
  }));

  // Find longest perfect streak
  let currentPerfectStreak = 0;
  let longestPerfectStreak = 0;
  
  streakData.forEach(day => {
    if (day.perfect) {
      currentPerfectStreak++;
      longestPerfectStreak = Math.max(longestPerfectStreak, currentPerfectStreak);
    } else {
      currentPerfectStreak = 0;
    }
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Challenge Progress</span>
              <Badge variant="outline">
                {stats.completed_days}/30 days
              </Badge>
            </div>
            <Progress value={(stats.completed_days / 30) * 100} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{((stats.completed_days / 30) * 100).toFixed(1)}% complete</span>
              <span>{30 - stats.completed_days} days remaining</span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.completed_days}</div>
              <div className="text-xs text-muted-foreground">Days Completed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(stats.average_daily_score)}`}>
                {stats.average_daily_score.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.perfect_days}</div>
              <div className="text-xs text-muted-foreground">Perfect Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.total_violations}</div>
              <div className="text-xs text-muted-foreground">Violations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flame className="h-5 w-5 mr-2" />
            Streak Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getStreakColor(stats.current_streak)}`}>
                {stats.current_streak}
              </div>
              <div className="text-sm text-muted-foreground">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.longest_streak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{longestPerfectStreak}</div>
              <div className="text-sm text-muted-foreground">Perfect Streak</div>
            </div>
          </div>

          {/* Streak Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Streak Progress</span>
              <span>{stats.current_streak} days</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(30, stats.completed_days) }, (_, i) => {
                const day = streakData[i];
                if (!day) return null;
                
                return (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      day.perfect 
                        ? 'bg-green-500' 
                        : day.score >= 80 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    title={`Day ${i + 1}: ${day.score}/100`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Score Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Daily Score Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Score Distribution */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score Distribution</span>
                <span>Last 7 days</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {streakData.slice(-7).map((day, index) => (
                  <div key={index} className="text-center">
                    <div className={`h-8 rounded flex items-center justify-center text-xs font-bold ${
                      day.perfect 
                        ? 'bg-green-500 text-white' 
                        : day.score >= 80 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {day.score}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      D{day.day}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {streakData.filter(d => d.perfect).length}
                </div>
                <div className="text-xs text-muted-foreground">Perfect Days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {streakData.filter(d => d.score >= 80 && !d.perfect).length}
                </div>
                <div className="text-xs text-muted-foreground">Good Days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {streakData.filter(d => d.score < 80).length}
                </div>
                <div className="text-xs text-muted-foreground">Poor Days</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violation Breakdown */}
      {stats.total_violations > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              Violation Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.violation_breakdown).map(([rule, count]) => {
                if (count === 0) return null;
                
                const ruleNames: Record<string, string> = {
                  setup_violation: 'Setup Violations',
                  sl_movement: 'Stop Loss Movements',
                  risk_exceeded: 'Risk Exceeded',
                  house_money_violation: 'House Money Violations',
                  three_losses_violation: 'Three Losses Violations'
                };

                const ruleColors: Record<string, string> = {
                  setup_violation: 'bg-blue-500',
                  sl_movement: 'bg-red-500',
                  risk_exceeded: 'bg-orange-500',
                  house_money_violation: 'bg-green-500',
                  three_losses_violation: 'bg-purple-500'
                };

                return (
                  <div key={rule} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${ruleColors[rule]}`} />
                      <span className="text-sm font-medium">{ruleNames[rule]}</span>
                    </div>
                    <Badge variant="destructive">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
