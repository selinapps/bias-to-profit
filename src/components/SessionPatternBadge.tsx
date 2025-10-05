import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Info } from 'lucide-react';
import { 
  SessionScenario, 
  SCENARIO_COLORS, 
  SCENARIO_HINTS 
} from '@/types/sessionPatterns';

interface SessionPatternBadgeProps {
  scenario: SessionScenario;
  confidence: number;
  isLive?: boolean;
  className?: string;
}

export function SessionPatternBadge({ 
  scenario, 
  confidence, 
  isLive = false,
  className 
}: SessionPatternBadgeProps) {
  if (scenario === 'none') return null;

  const colorClass = SCENARIO_COLORS[scenario];
  const hint = SCENARIO_HINTS[scenario];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 ${colorClass} ${className}`}
          >
            <TrendingUp className="h-3 w-3" />
            <span>Scenario: {scenario}</span>
            {isLive && (
              <div className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </div>
            )}
            <span className="text-xs opacity-75">({confidence}%)</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-trading-accent" />
              <span className="text-sm font-medium">Scenario {scenario}</span>
            </div>
            <p className="text-xs text-trading-muted leading-relaxed">
              {hint}
            </p>
            {isLive && (
              <p className="text-xs text-emerald-400">
                Live session detected
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
