import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { 
  SessionBehavior, 
  SessionScenario, 
  SessionPatternInput,
  ScenarioInference,
  BEHAVIOR_LABELS,
  BEHAVIOR_COLORS,
  SCENARIO_COLORS,
  inferScenario,
  isSessionActive
} from '@/types/sessionPatterns';
import { getActiveSession } from '@/lib/tradingSessions';

interface SessionPatternTrackerProps {
  currentPattern?: SessionPatternInput;
  onPatternChange: (pattern: SessionPatternInput) => void;
  className?: string;
}

export function SessionPatternTracker({ 
  currentPattern, 
  onPatternChange, 
  className 
}: SessionPatternTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [currentSession] = useState(getActiveSession());

  // Initialize pattern if not provided
  const pattern = currentPattern || {
    asia_behavior: 'unknown',
    london_behavior: 'unknown', 
    ny_behavior: 'unknown'
  };

  // Infer scenario from current pattern
  const scenario: ScenarioInference = inferScenario(
    pattern.asia_behavior,
    pattern.london_behavior,
    pattern.ny_behavior
  );

  const handleBehaviorChange = useCallback((
    session: 'asia' | 'london' | 'ny',
    behavior: SessionBehavior
  ) => {
    const newPattern = { ...pattern };
    if (session === 'asia') newPattern.asia_behavior = behavior;
    if (session === 'london') newPattern.london_behavior = behavior;
    if (session === 'ny') newPattern.ny_behavior = behavior;
    
    onPatternChange(newPattern);
  }, [pattern, onPatternChange]);

  const handleNotesChange = useCallback((newNotes: string) => {
    setNotes(newNotes);
    onPatternChange({ ...pattern, notes: newNotes });
  }, [pattern, onPatternChange]);

  const BehaviorChip = ({ 
    session, 
    behavior, 
    isActive, 
    isDisabled 
  }: { 
    session: 'asia' | 'london' | 'ny';
    behavior: SessionBehavior;
    isActive: boolean;
    isDisabled: boolean;
  }) => {
    const label = BEHAVIOR_LABELS[behavior];
    const colorClass = isActive ? BEHAVIOR_COLORS[behavior] : 'bg-gray-500/10 text-gray-400 border-gray-400/30';
    
    return (
      <Button
        variant="outline"
        size="sm"
        className={`h-8 px-3 text-xs font-medium transition-all duration-200 ${
          isActive ? 'ring-2 ring-offset-1' : ''
        } ${colorClass} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        onClick={() => !isDisabled && handleBehaviorChange(session, behavior)}
        disabled={isDisabled}
      >
        {label}
      </Button>
    );
  };

  const SessionRow = ({ 
    sessionId, 
    sessionName, 
    currentBehavior, 
    isActive 
  }: {
    sessionId: 'asia' | 'london' | 'ny';
    sessionName: string;
    currentBehavior: SessionBehavior;
    isActive: boolean;
  }) => {
    const behaviors: SessionBehavior[] = ['continuation', 'reversal', 'consolidation'];
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-trading-muted">
            {sessionName}
          </Label>
          {isActive && (
            <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-400/50">
              Live
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {behaviors.map((behavior) => (
            <BehaviorChip
              key={behavior}
              session={sessionId}
              behavior={behavior}
              isActive={currentBehavior === behavior}
              isDisabled={false}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={`bg-muted/5 border-trading-border ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto hover:bg-muted/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-trading-accent" />
                <span className="font-medium">Session Patterns</span>
              </div>
              {scenario.scenario !== 'none' && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${SCENARIO_COLORS[scenario.scenario]}`}
                >
                  {scenario.scenario}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-trading-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-trading-muted" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {/* Current Session Indicator */}
          {currentSession && (
            <div className="rounded-lg bg-slate-900/40 p-3 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm font-medium text-slate-200">
                  {currentSession.name}
                </span>
              </div>
              <p className="text-xs text-trading-muted">
                {currentSession.description}
              </p>
            </div>
          )}

          {/* Session Behavior Inputs */}
          <div className="space-y-4">
            <SessionRow
              sessionId="asia"
              sessionName="Asian Range"
              currentBehavior={pattern.asia_behavior}
              isActive={isSessionActive('asian_range')}
            />
            
            <SessionRow
              sessionId="london"
              sessionName="London"
              currentBehavior={pattern.london_behavior}
              isActive={isSessionActive('london_killzone') || isSessionActive('london_lunch') || isSessionActive('london_ny_overlap')}
            />
            
            <SessionRow
              sessionId="ny"
              sessionName="New York"
              currentBehavior={pattern.ny_behavior}
              isActive={isSessionActive('ny_session') || isSessionActive('london_ny_overlap')}
            />
          </div>

          {/* Scenario Inference */}
          {scenario.scenario !== 'none' ? (
            <div className="rounded-lg bg-slate-900/40 p-3 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-trading-accent" />
                <span className="text-sm font-medium text-slate-200">
                  Scenario: {scenario.scenario}
                </span>
                <Badge variant="outline" className="text-xs">
                  {scenario.confidence}%
                </Badge>
              </div>
              <p className="text-xs text-trading-muted leading-relaxed">
                {scenario.hint}
              </p>
              {scenario.expected && (
                <div className="mt-2 text-xs text-trading-accent">
                  <span className="font-medium">Expected:</span>
                  {scenario.expected.asia && (
                    <span className="ml-1">Asia: {BEHAVIOR_LABELS[scenario.expected.asia]}</span>
                  )}
                  {scenario.expected.london && (
                    <span className="ml-1">London: {BEHAVIOR_LABELS[scenario.expected.london]}</span>
                  )}
                  {scenario.expected.ny && (
                    <span className="ml-1">NY: {BEHAVIOR_LABELS[scenario.expected.ny]}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-900/20 p-3 border border-slate-700/20">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-trading-muted" />
                <span className="text-sm font-medium text-trading-muted">
                  Scenario Detection
                </span>
              </div>
              <p className="text-xs text-trading-muted leading-relaxed">
                Complete at least 2 session behaviors to detect scenario patterns.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="session-notes" className="text-sm font-medium text-trading-muted">
              Notes
            </Label>
            <Textarea
              id="session-notes"
              placeholder="Add observations about today's session patterns..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
