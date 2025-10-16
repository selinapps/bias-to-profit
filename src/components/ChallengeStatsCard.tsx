import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { DisciplineChallenge, ChallengeStats, ChallengeProgress } from '@/types/discipline';

interface ChallengeStatsCardProps {
  challenge: DisciplineChallenge;
  stats?: ChallengeStats | null;
  progress?: ChallengeProgress | null;
}

export function ChallengeStatsCard({ challenge, stats, progress }: ChallengeStatsCardProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Challenge Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const perfectDayPercentage = stats.completed_days > 0 ? (stats.perfect_days / stats.completed_days) * 100 : 0;
  const averageScore = stats.average_daily_score || 0;

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

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Overall Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Completion Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.completed_days}</div>
              <div className="text-xs text-muted-foreground">Days Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.perfect_days}</div>
              <div className="text-xs text-muted-foreground">Perfect Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.current_streak}</div>
              <div className="text-xs text-muted-foreground">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.longest_streak}</div>
              <div className="text-xs text-muted-foreground">Best Streak</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Daily Score</span>
                <Badge variant={getScoreBadgeVariant(averageScore)}>
                  {averageScore.toFixed(1)}/100
                </Badge>
              </div>
              <Progress value={averageScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Perfect Days Rate</span>
                <Badge variant={perfectDayPercentage >= 50 ? 'default' : 'secondary'}>
                  {perfectDayPercentage.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={perfectDayPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Rule Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.total_violations}</div>
              <div className="text-sm text-muted-foreground">Total Violations</div>
            </div>

            {stats.total_violations > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Violation Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(stats.violation_breakdown).map(([rule, count]) => {
                    if (count === 0) return null;
                    
                    const ruleNames: Record<string, string> = {
                      setup_violation: 'Setup Violations',
                      sl_movement: 'Stop Loss Movements',
                      risk_exceeded: 'Risk Exceeded',
                      house_money_violation: 'House Money Violations',
                      three_losses_violation: 'Three Losses Violations'
                    };

                    const ruleIcons: Record<string, React.ReactNode> = {
                      setup_violation: <Target className="h-4 w-4" />,
                      sl_movement: <XCircle className="h-4 w-4" />,
                      risk_exceeded: <AlertTriangle className="h-4 w-4" />,
                      house_money_violation: <TrendingUp className="h-4 w-4" />,
                      three_losses_violation: <XCircle className="h-4 w-4" />
                    };

                    return (
                      <div key={rule} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          {ruleIcons[rule]}
                          <span className="text-sm">{ruleNames[rule]}</span>
                        </div>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}