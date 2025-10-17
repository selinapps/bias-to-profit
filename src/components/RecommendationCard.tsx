import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, CheckCircle2, Lightbulb, Target, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Recommendation = Database['public']['Tables']['recommendations']['Row'];

interface RecommendationCardProps {
  recommendation: Recommendation;
  onImplement: (id: string) => void;
  onDismiss: (id: string) => void;
}

const priorityConfig = {
  critical: {
    color: 'border-l-red-500 bg-red-950/20',
    badge: 'destructive' as const,
    icon: AlertTriangle,
    iconColor: 'text-red-400',
  },
  high: {
    color: 'border-l-orange-500 bg-orange-950/20',
    badge: 'default' as const,
    icon: TrendingUp,
    iconColor: 'text-orange-400',
  },
  medium: {
    color: 'border-l-blue-500 bg-blue-950/20',
    badge: 'secondary' as const,
    icon: Lightbulb,
    iconColor: 'text-blue-400',
  },
  low: {
    color: 'border-l-gray-500 bg-gray-950/20',
    badge: 'outline' as const,
    icon: Target,
    iconColor: 'text-gray-400',
  },
};

const categoryLabels: Record<string, string> = {
  discipline: 'Discipline',
  continuation: 'Trade Management',
  confidence: 'Confidence Calibration',
  stop: 'Stop Placement',
  exit: 'Exit Timing',
  session: 'Session Selection',
  risk: 'Risk Management',
};

export function RecommendationCard({ recommendation, onImplement, onDismiss }: RecommendationCardProps) {
  const config = priorityConfig[recommendation.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.color} transition-all hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`h-5 w-5 mt-0.5 ${config.iconColor} shrink-0`} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight mb-2">
                {recommendation.title}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={config.badge} className="text-xs">
                  {recommendation.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {categoryLabels[recommendation.category] || recommendation.category}
                </Badge>
                {recommendation.potential_impact !== null && recommendation.potential_impact !== 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${recommendation.potential_impact > 0 ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'}`}
                  >
                    {recommendation.potential_impact > 0 ? '+' : ''}{recommendation.potential_impact.toFixed(1)}R
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {recommendation.description}
        </p>

        {/* Action (if provided) */}
        {recommendation.action && (
          <div className="bg-blue-950/20 border border-blue-500/30 p-3 rounded-lg">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              Recommended Action:
            </h4>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              {recommendation.action}
            </p>
          </div>
        )}

        {/* Evidence (if provided) */}
        {recommendation.evidence && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">View supporting data</summary>
            <pre className="mt-2 p-2 bg-slate-950/50 rounded overflow-x-auto">
              {JSON.stringify(recommendation.evidence, null, 2)}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onImplement(recommendation.id)}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark as Implemented
          </Button>
          <Button
            onClick={() => onDismiss(recommendation.id)}
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

