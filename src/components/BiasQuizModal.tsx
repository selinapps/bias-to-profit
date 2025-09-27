import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { BiasQuizResult, BiasConfidence } from '@/types/bias';
import type { MarketStateValue } from '@/types/bias';
import { getActiveSession, TRADING_SESSIONS } from '@/lib/tradingSessions';

interface BiasQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: BiasQuizResult) => Promise<void> | void;
}

const LOCATION_OPTIONS = [
  'Outside value & holding beyond edge (σ1→σ2)',
  'Inside value / reclaimed VAH/VAL',
  'Just reclaimed VWAP after stretch',
  'Undecided (skip)'
] as const;

const ORDER_FLOW_OPTIONS = [
  'CVD with move',
  'Footprint imbalances with move',
  'Absorption/exhaustion against move',
  'Big prints in trend direction',
  'None/unclear'
] as const;

const STRUCTURE_OPTIONS = [
  'Impulse + shallow PB',
  'Failed breakout & reclaim',
  'Range rotation'
] as const;

const CONFIDENCE_OPTIONS: BiasConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

type DirectionChoice = 'LONG' | 'SHORT';

interface QuizState {
  location: typeof LOCATION_OPTIONS[number] | '';
  orderFlow: string[];
  structure: typeof STRUCTURE_OPTIONS[number] | '';
  session: string;
  direction: DirectionChoice | null;
  confidence: BiasConfidence | null;
}

const defaultQuizState = (session: string): QuizState => ({
  location: '',
  orderFlow: [],
  structure: '',
  session,
  direction: null,
  confidence: null
});

const mapToResult = (state: QuizState): BiasQuizResult => {
  const outside = state.location.startsWith('Outside value');
  const insideValue = state.location.startsWith('Inside value');
  const failedBreakout = state.structure === 'Failed breakout & reclaim';
  const impulse = state.structure === 'Impulse + shallow PB';
  const range = state.structure === 'Range rotation';
  const ofWithMove = state.orderFlow.some(option =>
    option === 'CVD with move' || option === 'Footprint imbalances with move'
  );
  const ofAbsorption = state.orderFlow.includes('Absorption/exhaustion against move');
  const undecidedEverywhere =
    state.location === 'Undecided (skip)' &&
    (state.orderFlow.length === 0 || state.orderFlow.includes('None/unclear')) &&
    range;

  let marketState: MarketStateValue | null = null;

  if (outside && ofWithMove && impulse && !ofAbsorption) {
    marketState = 'OUT_OF_BALANCE';
  } else if (failedBreakout || insideValue || ofAbsorption || range) {
    marketState = 'IN_BALANCE';
  }

  let bias: BiasQuizResult['bias'] = 'NONE';

  if (!state.direction || undecidedEverywhere) {
    marketState = marketState ?? null;
    bias = 'NONE';
  } else if (marketState === 'OUT_OF_BALANCE') {
    bias = state.direction === 'LONG' ? 'OOB_LONG' : 'OOB_SHORT';
  } else if (marketState === 'IN_BALANCE') {
    bias = state.direction === 'LONG' ? 'MR_LONG' : 'MR_SHORT';
  } else {
    bias = 'NONE';
  }

  if (bias === 'NONE') {
    marketState = marketState === 'IN_BALANCE' || marketState === 'OUT_OF_BALANCE' ? marketState : null;
  }

  const tags = [
    state.location !== 'Undecided (skip)' ? state.location : null,
    ...state.orderFlow.filter(option => option !== 'None/unclear'),
    state.structure,
    state.session
  ].filter((item): item is string => Boolean(item));

  return {
    bias,
    market_state: bias === 'NONE' ? null : marketState,
    confidence: state.confidence,
    tags
  };
};

export function BiasQuizModal({ open, onOpenChange, onComplete }: BiasQuizModalProps) {
  const { toast } = useToast();
  const [autoSession, setAutoSession] = useState(() => getActiveSession()?.name ?? 'Unknown session');
  const [quizState, setQuizState] = useState<QuizState>(() => defaultQuizState(getActiveSession()?.name ?? 'Unknown session'));
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const resetState = useCallback((sessionName: string) => {
    setQuizState(defaultQuizState(sessionName));
    setStep(0);
  }, []);

  useEffect(() => {
    if (open) {
      const detectedSession = getActiveSession()?.name ?? autoSession;
      setAutoSession(detectedSession);
      resetState(detectedSession);
    } else {
      resetState(autoSession);
    }
  }, [open, autoSession, resetState]);

  const toggleOrderFlow = (choice: string) => {
    setQuizState(prev => {
      const exists = prev.orderFlow.includes(choice);
      let next = prev.orderFlow.filter(item => item !== choice);
      if (!exists) {
        next = [...prev.orderFlow, choice];
      }
      if (choice === 'None/unclear') {
        next = exists ? [] : ['None/unclear'];
      } else {
        next = next.filter(item => item !== 'None/unclear');
      }
      return { ...prev, orderFlow: next };
    });
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return Boolean(quizState.location);
      case 1:
        return quizState.orderFlow.length > 0;
      case 2:
        return Boolean(quizState.structure);
      case 3:
        return Boolean(quizState.direction);
      default:
        return true;
    }
  };

  const goNext = () => {
    if (step < 4 && canNext()) {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!canNext()) return;
    const result = mapToResult(quizState);
    setSubmitting(true);
    try {
      await onComplete(result);
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Unable to save bias',
        description: 'Something went wrong while saving your bias. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sessionOptions = useMemo(() => {
    const options = TRADING_SESSIONS.map(session => session.name);
    if (!options.includes(autoSession)) {
      options.unshift(autoSession);
    }
    return options;
  }, [autoSession]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-trading-border bg-trading-card text-foreground">
        <DialogHeader>
          <DialogTitle>Bias Quiz</DialogTitle>
          <DialogDescription>Five fast taps to lock in your trading context.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
            <span>Step {step + 1} of 5</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={
                    index <= step
                      ? 'h-1.5 w-6 rounded-full bg-indigo-400'
                      : 'h-1.5 w-6 rounded-full bg-slate-700'
                  }
                />
              ))}
            </div>
          </div>

          {step === 0 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Where is price relative to value/VWAP?</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {LOCATION_OPTIONS.map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={quizState.location === option ? 'default' : 'outline'}
                    className="justify-start rounded-xl border border-slate-700 bg-slate-900/40 py-6 text-left text-sm"
                    onClick={() => setQuizState(prev => ({ ...prev, location: option }))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">What does order flow say?</h3>
              <p className="mt-1 text-xs text-slate-400">Tap all that apply.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ORDER_FLOW_OPTIONS.map(option => {
                  const isSelected = quizState.orderFlow.includes(option);
                  return (
                    <Badge
                      key={option}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer rounded-full px-4 py-2 text-sm"
                      onClick={() => toggleOrderFlow(option)}
                    >
                      {option}
                    </Badge>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Structure right now?</h3>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {STRUCTURE_OPTIONS.map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant={quizState.structure === option ? 'default' : 'outline'}
                      className="justify-start rounded-xl border border-slate-700 bg-slate-900/40 py-5 text-left text-sm"
                      onClick={() => setQuizState(prev => ({ ...prev, structure: option }))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Session</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {sessionOptions.map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant={quizState.session === option ? 'default' : 'outline'}
                      className="justify-center rounded-xl border border-slate-700 bg-slate-900/40 py-3"
                      onClick={() => setQuizState(prev => ({ ...prev, session: option }))}
                    >
                      {option}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={quizState.session === 'Override' ? 'default' : 'outline'}
                    className="justify-center rounded-xl border border-slate-700 bg-slate-900/40 py-3"
                    onClick={() => setQuizState(prev => ({ ...prev, session: 'Override' }))}
                  >
                    Override
                  </Button>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Direction</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={quizState.direction === 'LONG' ? 'default' : 'outline'}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-6 text-base"
                  onClick={() => setQuizState(prev => ({ ...prev, direction: 'LONG' }))}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant={quizState.direction === 'SHORT' ? 'default' : 'outline'}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 py-6 text-base"
                  onClick={() => setQuizState(prev => ({ ...prev, direction: 'SHORT' }))}
                >
                  Short
                </Button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h3 className="text-base font-semibold text-foreground">Confidence (optional)</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {CONFIDENCE_OPTIONS.map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={quizState.confidence === option ? 'default' : 'outline'}
                    className="rounded-full px-4 py-2 text-sm"
                    onClick={() =>
                      setQuizState(prev => ({
                        ...prev,
                        confidence: prev.confidence === option ? null : option
                      }))
                    }
                  >
                    {option.toLowerCase()}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 0 || submitting}>
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={goNext} disabled={!canNext()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={submitting || !canNext()}>
              {submitting ? 'Saving…' : 'Confirm'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
