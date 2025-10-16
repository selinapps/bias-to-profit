import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { BiasQuizResult, BiasConfidence, QuizState, MarketState, Location, OrderFlow, Structure, Session, Direction } from '@/types/bias';
import { getActiveSession, TRADING_SESSIONS } from '@/lib/tradingSessions';
import { mapBias, mapToMarketState, generateTags, getOOBEntryChecklist, getMREntryChecklist, getRiskHint, getSessionWarning } from '@/lib/biasMapping';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface BiasQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: BiasQuizResult) => Promise<void> | void;
}

// Fabio-style quiz options
const MARKET_STATE_OPTIONS: MarketState[] = ['IN_BALANCE', 'OUT_OF_BALANCE', 'UNCLEAR'];

const LOCATION_OPTIONS: Location[] = [
  'OUTSIDE_VALUE_HOLDING',
  'INSIDE_VALUE_RECLAIMED', 
  'RECLAIMED_VWAP_AFTER_STRETCH',
  'UNDECIDED'
];

const ORDER_FLOW_OPTIONS: OrderFlow[] = [
  'CVD_WITH_MOVE',
  'FOOTPRINT_IMBAL',
  'ABSORPTION_AGAINST',
  'BIG_PRINTS_TREND',
  'NONE'
];

const STRUCTURE_OPTIONS: Structure[] = [
  'IMPULSE_SHALLOW_PB',
  'FAILED_BREAK_RECLAIM',
  'RANGE_ROTATION'
];

const SESSION_OPTIONS: Session[] = [
  'ASIA',
  'LONDON_KZ', 
  'LONDON_LUNCH',
  'OVERLAP',
  'NY',
  'SILVER_BULLET'
];

const DIRECTION_OPTIONS: Direction[] = ['LONG', 'SHORT'];
const CONFIDENCE_OPTIONS: BiasConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

const defaultQuizState = (session: Session): QuizState => ({
  marketState: 'UNCLEAR',
  location: 'UNDECIDED',
  orderFlow: [],
  structure: 'RANGE_ROTATION',
  session,
  direction: undefined,
  confidence: undefined
});

const mapToResult = (state: QuizState): BiasQuizResult => {
  const bias = mapBias(state);
  const marketState = mapToMarketState(state);
  const tags = generateTags(state);
  
  // Generate entry checklist and risk hint based on bias
  let entryChecklist: string[] | undefined;
  let riskHint: string | undefined;
  
  if (bias === 'OOB_LONG' || bias === 'OOB_SHORT') {
    entryChecklist = getOOBEntryChecklist();
  } else if (bias === 'MR_LONG' || bias === 'MR_SHORT') {
    entryChecklist = getMREntryChecklist();
  }
  
  if (state.confidence) {
    riskHint = getRiskHint(state.confidence);
  }

  return {
    bias,
    market_state: bias === 'FLAT' ? null : marketState,
    confidence: state.confidence || null,
    tags,
    entryChecklist,
    riskHint
  };
};

// Helper function to map session names to Session enum
const mapSessionName = (sessionName: string): Session => {
  const sessionMap: Record<string, Session> = {
    'Asian Range': 'ASIA',
    'London Killzone': 'LONDON_KZ',
    'London Lunch': 'LONDON_LUNCH', 
    'London–New York Overlap': 'OVERLAP',
    'New York Session': 'NY',
    'Silver Bullet Hour': 'SILVER_BULLET'
  };
  return sessionMap[sessionName] || 'NY';
};

// Helper function to get display labels
const getMarketStateLabel = (state: MarketState): string => {
  const labels: Record<MarketState, string> = {
    'IN_BALANCE': 'In Balance',
    'OUT_OF_BALANCE': 'Out of Balance', 
    'UNCLEAR': 'Unclear'
  };
  return labels[state];
};

const getLocationLabel = (location: Location): string => {
  const labels: Record<Location, string> = {
    'OUTSIDE_VALUE_HOLDING': 'Outside value & holding (σ1→σ2)',
    'INSIDE_VALUE_RECLAIMED': 'Inside value / reclaimed VAH/VAL',
    'RECLAIMED_VWAP_AFTER_STRETCH': 'Just reclaimed VWAP after stretch',
    'UNDECIDED': 'Undecided'
  };
  return labels[location];
};

const getOrderFlowLabel = (flow: OrderFlow): string => {
  const labels: Record<OrderFlow, string> = {
    'CVD_WITH_MOVE': 'CVD with move',
    'FOOTPRINT_IMBAL': 'Footprint imbalances with move',
    'ABSORPTION_AGAINST': 'Absorption/exhaustion against move',
    'BIG_PRINTS_TREND': 'Big prints in trend direction',
    'NONE': 'None/unclear'
  };
  return labels[flow];
};

const getStructureLabel = (structure: Structure): string => {
  const labels: Record<Structure, string> = {
    'IMPULSE_SHALLOW_PB': 'Impulse + shallow pullback',
    'FAILED_BREAK_RECLAIM': 'Failed breakout & reclaim',
    'RANGE_ROTATION': 'Range rotation'
  };
  return labels[structure];
};

const getSessionLabel = (session: Session): string => {
  const labels: Record<Session, string> = {
    'ASIA': 'Asian Range',
    'LONDON_KZ': 'London Killzone',
    'LONDON_LUNCH': 'London Lunch',
    'OVERLAP': 'London–NY Overlap',
    'NY': 'New York Session',
    'SILVER_BULLET': 'Silver Bullet Hour'
  };
  return labels[session];
};

export function BiasQuizModal({ open, onOpenChange, onComplete }: BiasQuizModalProps) {
  const { toast } = useToast();
  const [autoSession, setAutoSession] = useState(() => getActiveSession()?.name ?? 'New York Session');
  const [quizState, setQuizState] = useState<QuizState>(() => defaultQuizState(mapSessionName(getActiveSession()?.name ?? 'New York Session')));
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderFlowTouched, setOrderFlowTouched] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveToStep = useCallback((nextStep: number) => {
    setStep(nextStep);
    setOrderFlowTouched(false);
  }, []);

  const resetState = useCallback(
    (sessionName?: string) => {
      const resolvedSession = sessionName ?? getActiveSession()?.name ?? 'New York Session';
      setQuizState(defaultQuizState(mapSessionName(resolvedSession)));
      setStep(0);
      setOrderFlowTouched(false);
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    },
    [autoAdvanceTimer]
  );

  useEffect(() => {
    if (open) {
      const detectedSession = getActiveSession()?.name ?? autoSession;
      setAutoSession(detectedSession);
      resetState(detectedSession);
    } else {
      resetState(autoSession);
    }
  }, [open, autoSession, resetState]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (step !== 2) {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
      return;
    }

    if (!orderFlowTouched || quizState.orderFlow.length === 0) {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
      return;
    }

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    autoAdvanceTimer.current = setTimeout(() => {
      moveToStep(3);
      autoAdvanceTimer.current = null;
    }, 900);

    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  }, [step, orderFlowTouched, quizState.orderFlow, moveToStep]);

  const toggleOrderFlow = (choice: OrderFlow) => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setOrderFlowTouched(true);
    setQuizState(prev => {
      const exists = prev.orderFlow.includes(choice);
      let next = prev.orderFlow.filter(item => item !== choice);
      if (!exists) {
        next = [...prev.orderFlow, choice];
      }
      if (choice === 'NONE') {
        next = exists ? [] : ['NONE'];
      } else {
        next = next.filter(item => item !== 'NONE');
      }
      return { ...prev, orderFlow: next };
    });
  };

  const goBack = () => {
    if (step === 0) return;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setStep(prev => {
      const next = Math.max(prev - 1, 0);
      setOrderFlowTouched(false);
      return next;
    });
  };

  const handleComplete = async () => {
    if (!quizState.direction) {
      return;
    }
    const result = mapToResult(quizState);
    setSubmitting(true);
    try {
      await onComplete(result);
      onOpenChange(false);
      resetState(autoSession);
    } catch (error) {
      logger.error('Quiz submission error:', error);
      toast({
        title: 'Unable to save bias',
        description: 'Something went wrong while saving your bias. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sessionOptions = useMemo(() => {
    return SESSION_OPTIONS.map(session => ({
      value: session,
      label: getSessionLabel(session)
    }));
  }, []);

  const showAutoAdvanceNotice = step === 2 && orderFlowTouched && quizState.orderFlow.length > 0;
  const quizComplete = Boolean(quizState.direction);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-trading-border bg-trading-card text-foreground">
        <DialogHeader>
          <DialogTitle>Bias Quiz</DialogTitle>
          <DialogDescription>Seven steps to lock in your trading context.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
            <span>Step {step + 1} of 7</span>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 w-6 rounded-full bg-slate-700/80 transition-colors',
                    index <= step && 'bg-indigo-500'
                  )}
                />
              ))}
            </div>
          </div>

          {step === 0 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Market State</h3>
              <p className="mt-1 text-xs text-slate-400">Balance ≈ rotating around value; OOB = displacement away from value.</p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {MARKET_STATE_OPTIONS.map(option => {
                  const isSelected = quizState.marketState === option;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'justify-start rounded-xl border py-6 text-left text-sm transition-colors',
                        'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-50',
                        isSelected && 'border-indigo-400/80 bg-indigo-500/20 text-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      )}
                      onClick={() => {
                        setQuizState(prev => ({ ...prev, marketState: option }));
                        moveToStep(1);
                      }}
                    >
                      {getMarketStateLabel(option)}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Location vs Value/VWAP</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {LOCATION_OPTIONS.map(option => {
                  const isSelected = quizState.location === option;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'justify-start rounded-xl border py-6 text-left text-sm transition-colors',
                        'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-50',
                        isSelected && 'border-indigo-400/80 bg-indigo-500/20 text-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      )}
                      onClick={() => {
                        setQuizState(prev => ({ ...prev, location: option }));
                        moveToStep(2);
                      }}
                    >
                      {getLocationLabel(option)}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Order Flow</h3>
              <p className="mt-1 text-xs text-slate-400">Tap all that apply. Aggression is the execution confirmation.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ORDER_FLOW_OPTIONS.map(option => {
                  const isSelected = quizState.orderFlow.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-0',
                        isSelected
                          ? 'border-indigo-400/80 bg-indigo-500/20 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                          : 'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-50'
                      )}
                      onClick={() => toggleOrderFlow(option)}
                    >
                      {getOrderFlowLabel(option)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Structure</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {STRUCTURE_OPTIONS.map(option => {
                  const isSelected = quizState.structure === option;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'justify-start rounded-xl border py-6 text-left text-sm transition-colors',
                        'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-50',
                        isSelected && 'border-indigo-400/80 bg-indigo-500/20 text-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      )}
                      onClick={() => {
                        setQuizState(prev => ({ ...prev, structure: option }));
                        moveToStep(4);
                      }}
                    >
                      {getStructureLabel(option)}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Session</h3>
              <p className="mt-1 text-xs text-slate-400">Auto-detected: {getSessionLabel(quizState.session)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sessionOptions.map(option => {
                  const isSelected = quizState.session === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'justify-center rounded-xl border py-3 text-sm transition-colors',
                        'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-50',
                        isSelected && 'border-indigo-400/80 bg-indigo-500/20 text-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      )}
                      onClick={() => {
                        setQuizState(prev => ({ ...prev, session: option.value }));
                        moveToStep(5);
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Direction Intent</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'rounded-xl border py-6 text-base transition-colors',
                    'border-emerald-500/40 bg-emerald-500/10 text-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-50',
                    quizState.direction === 'LONG' && 'border-emerald-400 bg-emerald-500/20 text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.45)]'
                  )}
                  onClick={() => {
                    setQuizState(prev => ({ ...prev, direction: 'LONG' }));
                    moveToStep(6);
                  }}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'rounded-xl border py-6 text-base transition-colors',
                    'border-rose-500/40 bg-rose-500/10 text-rose-200/80 hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-50',
                    quizState.direction === 'SHORT' && 'border-rose-400 bg-rose-500/20 text-rose-50 shadow-[0_0_0_1px_rgba(244,63,94,0.45)]'
                  )}
                  onClick={() => {
                    setQuizState(prev => ({ ...prev, direction: 'SHORT' }));
                    moveToStep(6);
                  }}
                >
                  Short
                </Button>
              </div>
            </section>
          )}

          {step === 6 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Confidence (optional)</h3>
              <p className="mt-1 text-xs text-slate-400">Used for risk hints only</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CONFIDENCE_OPTIONS.map(option => {
                  const isSelected = quizState.confidence === option;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm transition-colors',
                        'border-slate-700/70 bg-slate-900/40 text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-50',
                        isSelected && 'border-indigo-400/80 bg-indigo-500/20 text-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      )}
                      onClick={() =>
                        setQuizState(prev => ({
                          ...prev,
                          confidence: prev.confidence === option ? undefined : option,
                        }))
                      }
                    >
                      {option.toLowerCase()}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.5rem] text-xs text-indigo-200/80">
            {showAutoAdvanceNotice && <span>Moving forward once selections settle…</span>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={goBack} disabled={step === 0 || submitting}>
              Back
            </Button>
            {step === 6 && (
              <Button onClick={handleComplete} disabled={submitting || !quizComplete}>
                {submitting ? 'Saving…' : 'Save bias'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
