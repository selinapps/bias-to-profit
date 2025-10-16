import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Flame, CheckCircle, XCircle } from 'lucide-react';
import type { DisciplineChallenge, ChallengeProgress, DailyDisciplineTracking } from '@/types/discipline';

interface ChallengeProgressCardProps {
  challenge: DisciplineChallenge;
  progress?: ChallengeProgress | null;
  todayTracking?: DailyDisciplineTracking | null;
}

export function ChallengeProgressCard({ challenge, progress, todayTracking }: ChallengeProgressCardProps) {
  const completionPercentage = progress?.completionPercentage || progress?.completion_percentage || challenge.completion_percentage || 0;
  
  console.log('ChallengeProgressCard received:', {
    hasProgress: !!progress,
    completionPercentage,
    progressCompletionPercentage: progress?.completionPercentage,
    challengeCompletionPercentage: challenge.completion_percentage,
    daysCompleted: progress?.daysCompleted
  });
  const daysCompleted = progress?.daysCompleted || 0;
  const currentDay = progress?.current_day || challenge.current_day || daysCompleted + 1;
  const totalDays = progress?.total_days || 30;
  const currentStreak = progress?.currentStreak || progress?.current_streak || challenge.current_streak || daysCompleted;
  const longestStreak = progress?.longestStreak || progress?.longest_streak || challenge.longest_streak || daysCompleted;
  const totalViolations = progress?.totalViolations || progress?.total_violations || challenge.total_rule_violations || 0;
  const dailyScore = todayTracking?.daily_score || 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-green-600';
    if (streak >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Challenge Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-sm font-bold ${getProgressColor(completionPercentage)}`}>
              {Math.round(completionPercentage * 10) / 10}%
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Day {currentDay} of {totalDays}</span>
            <span>{daysCompleted} days completed</span>
          </div>
        </div>

        {/* Current Streak */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium flex items-center">
              <Flame className="h-4 w-4 mr-1" />
              Current Streak
            </span>
            <span className={`text-sm font-bold ${getStreakColor(currentStreak)}`}>
              {currentStreak} days
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Best streak: {longestStreak} days</span>
            <span>Total violations: {totalViolations}</span>
          </div>
        </div>

        {/* Today's Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Today's Status</span>
            <div className="flex items-center gap-2">
              {todayTracking?.is_completed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <Badge variant={todayTracking?.is_completed ? "default" : "destructive"}>
                {todayTracking?.is_completed ? "Completed" : "Pending"}
              </Badge>
            </div>
          </div>
          {todayTracking && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Score: {dailyScore}/100</span>
              <span>Violations: {todayTracking.violation_count}</span>
            </div>
          )}
        </div>

        {/* Challenge Status */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Challenge Status</span>
            <Badge 
              variant={
                challenge.status === 'active' ? 'default' :
                challenge.status === 'completed' ? 'default' :
                challenge.status === 'paused' ? 'secondary' : 'destructive'
              }
            >
              {challenge.status.toUpperCase()}
            </Badge>
          </div>
          {challenge.status === 'active' && (
            <p className="text-xs text-muted-foreground mt-1">
              {30 - currentDay} days remaining
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
