import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Flame, 
  Calendar, 
  Target, 
  Trophy, 
  Lock,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { Achievement } from '@/types/discipline';

interface AchievementCardProps {
  achievement: Achievement;
  challengeStats?: any;
  todayTracking?: any;
}

export function AchievementCard({ achievement, challengeStats, todayTracking }: AchievementCardProps) {
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Star: <Star className="h-5 w-5" />,
      Flame: <Flame className="h-5 w-5" />,
      Calendar: <Calendar className="h-5 w-5" />,
      Target: <Target className="h-5 w-5" />,
      Trophy: <Trophy className="h-5 w-5" />
    };
    return icons[iconName] || <Star className="h-5 w-5" />;
  };

  const getRequirementText = () => {
    switch (achievement.requirement.type) {
      case 'streak':
        return `Maintain ${achievement.requirement.value} day streak`;
      case 'perfect_days':
        return `${achievement.requirement.value} perfect day${achievement.requirement.value > 1 ? 's' : ''}`;
      case 'completion':
        return `Complete ${achievement.requirement.value} days`;
      case 'violation_free':
        return 'Zero rule violations';
      default:
        return 'Complete requirement';
    }
  };

  const getProgressPercentage = () => {
    if (achievement.unlocked) return 100;
    
    // Calculate progress based on achievement type
    let percentage = 0;
    switch (achievement.requirement.type) {
      case 'perfect_days':
        const perfectDays = challengeStats?.perfect_days || 0;
        percentage = Math.min((perfectDays / achievement.requirement.value) * 100, 100);
        break;
      
      case 'streak':
        const currentStreak = challengeStats?.current_streak || 0;
        percentage = Math.min((currentStreak / achievement.requirement.value) * 100, 100);
        break;
      
      case 'completion':
        const completedDays = challengeStats?.completed_days || 0;
        percentage = Math.min((completedDays / achievement.requirement.value) * 100, 100);
        break;
      
      case 'violation_free':
        // Check if today has zero violations
        const todayViolations = todayTracking?.violation_count || 0;
        percentage = todayViolations === 0 ? 100 : 0;
        break;
      
      default:
        percentage = 0;
    }
    
    // Round to 1 decimal place for better display
    return Math.round(percentage * 10) / 10;
  };

  return (
    <Card className={`transition-all ${
      achievement.unlocked 
        ? 'border-green-200 bg-green-50/50 shadow-md' 
        : 'border-muted hover:border-primary/50'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              achievement.unlocked 
                ? 'bg-green-100 text-green-600' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {achievement.unlocked ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                getIcon(achievement.icon)
              )}
            </div>
            <span className={achievement.unlocked ? 'text-green-800' : 'text-muted-foreground'}>
              {achievement.name}
            </span>
          </div>
          {achievement.unlocked ? (
            <Badge variant="default" className="bg-green-600">
              Unlocked
            </Badge>
          ) : (
            <Badge variant="outline">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className={`text-sm ${
          achievement.unlocked ? 'text-green-700' : 'text-muted-foreground'
        }`}>
          {achievement.description}
        </p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Requirement</span>
            <span className="font-medium">{getRequirementText()}</span>
          </div>
          
          {!achievement.unlocked && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-1" />
            </div>
          )}
          
          {achievement.unlocked && achievement.unlocked_at && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Clock className="h-3 w-3" />
              <span>Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}