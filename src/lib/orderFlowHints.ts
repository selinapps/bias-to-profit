export type AggressionState = 'aligned' | 'fading' | 'reversed';

export interface OrderFlowTradeInput {
  id: string;
  side: 'Long' | 'Short';
  entry: number;
  stop: number;
  asset?: string;
  model?: string;
}

export interface OrderFlowSnapshot {
  timestamp: number;
  aggressionState: AggressionState;
  cvdDelta: number;
  cvdSlope: number;
  cvdAligned: boolean;
  lastSwingBroken: boolean;
  footprintSupport: boolean;
  followThrough: boolean;
  strongImbalanceNode?: string;
  projectionTag: boolean;
  momentumPause: boolean;
  structureChallenged: boolean;
  valueReentry: boolean;
  trendExceptional: boolean;
  deltaBreakOff: boolean;
  opposingDelta: number;
  pocLevel?: number;
  trailStopPrice?: number;
}

export type ActionHintKey =
  | 'move_be'
  | 'trail_stop'
  | 'partial'
  | 'full_exit'
  | 'poc_tp'
  | 'save_delta'
  | 'guardrail';

export type ActionHintEmphasis = 'neutral' | 'positive' | 'warning' | 'danger';

export interface ActionHint {
  message: string;
  signalLine: string;
  isActive: boolean;
  emphasis: ActionHintEmphasis;
}

export interface HintContext {
  guardrailActive?: boolean;
}

export interface AggressionBadgeConfig {
  label: string;
  shortLabel: string;
  icon: string;
  className: string;
  emphasis: Exclude<ActionHintEmphasis, 'neutral'>;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const formatPrice = (price: number, asset?: string) => {
  if (!Number.isFinite(price)) return '';
  if (asset?.includes('JPY')) {
    return price.toFixed(3);
  }
  if (asset?.includes('BTC') || asset?.includes('ES') || asset?.includes('NQ')) {
    return price.toFixed(1);
  }
  if (asset?.includes('XAU')) {
    return price.toFixed(2);
  }
  return price.toFixed(5);
};

export const formatDelta = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${value >= 0 ? '+' : '-'}${(abs / 1000).toFixed(1)}k`;
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}`;
};

export const generateOrderFlowSnapshot = (
  trade: OrderFlowTradeInput,
  now: number,
): OrderFlowSnapshot => {
  const direction = trade.side === 'Long' ? 1 : -1;
  const baseSeed = now / 5000 + trade.entry * 3.1;
  const secondarySeed = now / 7000 + trade.stop * 2.6;
  const tertiarySeed = now / 9000 + (trade.entry + trade.stop) * 1.4;

  const normalized = Math.sin(baseSeed);
  const secondary = Math.cos(secondarySeed);
  const tertiary = Math.sin(tertiarySeed);
  const modulation = pseudoRandom(baseSeed + secondarySeed);

  const cvdDelta = Math.round(normalized * 2200 + secondary * 600);
  const cvdSlope = normalized + secondary * 0.35;
  const cvdAligned = direction * cvdSlope > 0.18;
  const lastSwingBroken = direction * (secondary + modulation - 0.25) > 0.45;
  const footprintSupport = direction * (Math.cos(baseSeed * 0.85) + modulation * 0.8) > 0.2;
  const followThrough = direction * (Math.sin(baseSeed * 1.2) + modulation * 0.5) > 0.55;

  const imbalanceStrength = clamp(Math.abs(secondary + modulation) * 120, 40, 260);
  const strongImbalanceNode = footprintSupport
    ? `${imbalanceStrength.toFixed(0)} @ ${formatPrice(
        trade.entry + direction * Math.abs(secondary + modulation) * 0.0008,
        trade.asset,
      )}`
    : undefined;

  const projectionTag = Math.abs(Math.sin(tertiarySeed * 1.1)) > 0.7;
  const momentumPause = Math.cos(secondarySeed * 1.05) < 0.2;
  const structureChallenged = direction * (Math.sin(tertiarySeed * 1.2) - modulation * 0.6) < -0.45;
  const valueReentry = Math.cos(baseSeed * 0.6 + modulation) > 0.55;
  const trendExceptional = Math.abs(Math.sin(secondarySeed * 0.5)) > 0.82;
  const deltaBreakOff = direction * (Math.sin(baseSeed * 1.35) - modulation * 0.8) < -0.55;
  const opposingDelta = clamp(-cvdDelta * 0.65 + tertiary * 420, -2200, 2200);

  const pocLevel = trade.entry + direction * (secondary + modulation * 0.5) * 0.0009;
  const trailStopPrice = strongImbalanceNode
    ? parseFloat(
        formatPrice(
          trade.entry + direction * Math.abs(secondary + modulation * 0.4) * 0.0005,
          trade.asset,
        ),
      )
    : undefined;

  let aggressionState: AggressionState = 'fading';
  if (cvdAligned && footprintSupport) {
    aggressionState = 'aligned';
  } else if (!cvdAligned && !footprintSupport) {
    aggressionState = 'reversed';
  }

  return {
    timestamp: now,
    aggressionState,
    cvdDelta,
    cvdSlope,
    cvdAligned,
    lastSwingBroken,
    footprintSupport,
    followThrough,
    strongImbalanceNode,
    projectionTag,
    momentumPause,
    structureChallenged,
    valueReentry,
    trendExceptional,
    deltaBreakOff,
    opposingDelta,
    pocLevel,
    trailStopPrice,
  };
};

export const deriveActionHints = (
  trade: OrderFlowTradeInput,
  snapshot?: OrderFlowSnapshot,
  context: HintContext = {},
): Record<ActionHintKey, ActionHint> => {
  const swingText = trade.side === 'Long' ? 'last high' : 'last low';
  const valueText = trade.side === 'Long' ? 'Value Area' : 'Value Area';

  const baseHint: ActionHint = {
    message: '',
    signalLine: 'Waiting for data...',
    isActive: false,
    emphasis: 'neutral',
  };

  const hints: Record<ActionHintKey, ActionHint> = {
    move_be: { ...baseHint, message: 'Price followed up with CVD support—lock risk to BE.' },
    trail_stop: { ...baseHint, message: 'Trail behind last aggressive print/bar; keep locking profit as flow holds.' },
    partial: { ...baseHint, message: 'Scale here (VWAP σ2 / inefficiency) while flow remains positive.' },
    full_exit: { ...baseHint, message: 'Price and OF flipped—close now to protect gains.' },
    poc_tp: { ...baseHint, message: 'Back in value—POC is the magnet; exit full.' },
    save_delta: { ...baseHint, message: 'Volume shift against you—bank delta before it’s reclaimed.' },
    guardrail: { ...baseHint, message: 'Rule hit: 3 losses today—pause trading.' },
  };

  if (!snapshot) {
    return hints;
  }

  const formattedDelta = formatDelta(snapshot.cvdDelta);
  const signalSwing = snapshot.lastSwingBroken ? `${swingText} broken` : `${swingText} holding`;

  hints.move_be = {
    ...hints.move_be,
    signalLine: `${formattedDelta}, ${signalSwing}`,
    isActive: snapshot.lastSwingBroken && snapshot.cvdAligned,
    emphasis: snapshot.lastSwingBroken && snapshot.cvdAligned ? 'positive' : 'neutral',
  };

  const imbalanceSignal = snapshot.strongImbalanceNode
    ? `Imbalance ${snapshot.strongImbalanceNode}${snapshot.followThrough ? ', flow pushing' : ', follow-through stalling'}`
    : 'No fresh imbalance';

  hints.trail_stop = {
    ...hints.trail_stop,
    signalLine: imbalanceSignal,
    isActive: Boolean(snapshot.strongImbalanceNode && snapshot.followThrough),
    emphasis: snapshot.strongImbalanceNode && snapshot.followThrough ? 'positive' : 'neutral',
  };

  const momentumSignal = `${snapshot.projectionTag ? 'Projection/VA tag' : 'Projection pending'}, ${snapshot.momentumPause ? 'momentum cooling' : 'momentum firm'}`;
  const partialEmphasis: ActionHintEmphasis = snapshot.aggressionState === 'fading' ? 'warning' : snapshot.aggressionState === 'reversed' ? 'danger' : 'positive';

  hints.partial = {
    ...hints.partial,
    signalLine: momentumSignal,
    isActive: Boolean(snapshot.projectionTag && snapshot.momentumPause && snapshot.aggressionState !== 'reversed'),
    emphasis: snapshot.projectionTag && snapshot.momentumPause ? partialEmphasis : 'neutral',
  };

  const structureSignal = `${snapshot.structureChallenged ? 'Structure broken' : 'Structure intact'}, CVD ${formattedDelta}`;
  hints.full_exit = {
    ...hints.full_exit,
    signalLine: structureSignal,
    isActive: snapshot.aggressionState === 'reversed' && snapshot.structureChallenged,
    emphasis: snapshot.aggressionState === 'reversed' && snapshot.structureChallenged ? 'danger' : 'neutral',
  };

  const pocSignal = `${snapshot.valueReentry ? `${valueText} reclaimed` : `${valueText} untested`}${snapshot.pocLevel ? `, POC ${formatPrice(snapshot.pocLevel, trade.asset)}` : ''}`;
  hints.poc_tp = {
    ...hints.poc_tp,
    signalLine: pocSignal.trim(),
    isActive: snapshot.valueReentry && !snapshot.trendExceptional,
    emphasis: snapshot.valueReentry && !snapshot.trendExceptional ? 'positive' : 'neutral',
  };

  const deltaSignal = `${formatDelta(snapshot.opposingDelta)}, aggression ${snapshot.deltaBreakOff ? 'fading' : 'stable'}`;
  hints.save_delta = {
    ...hints.save_delta,
    signalLine: deltaSignal,
    isActive: snapshot.deltaBreakOff,
    emphasis: snapshot.deltaBreakOff ? 'warning' : 'neutral',
  };

  hints.guardrail = {
    ...hints.guardrail,
    signalLine: context.guardrailActive ? 'Session guardrail engaged' : 'Within guardrail',
    isActive: Boolean(context.guardrailActive),
    emphasis: context.guardrailActive ? 'danger' : 'neutral',
  };

  return hints;
};

export const getAggressionBadge = (
  snapshot?: OrderFlowSnapshot,
): AggressionBadgeConfig | undefined => {
  if (!snapshot) return undefined;

  switch (snapshot.aggressionState) {
    case 'aligned':
      return {
        label: '✅ Aggression aligned',
        shortLabel: '✅ Aligned',
        icon: '✅',
        className: 'border-trading-success text-trading-success bg-success/10',
        emphasis: 'positive',
      };
    case 'fading':
      return {
        label: '⚠️ Fading aggression',
        shortLabel: '⚠️ Fading',
        icon: '⚠️',
        className: 'border-yellow-500/70 text-yellow-300 bg-yellow-500/10',
        emphasis: 'warning',
      };
    case 'reversed':
      return {
        label: '❌ Aggression reversed',
        shortLabel: '❌ Reversed',
        icon: '❌',
        className: 'border-red-500/70 text-red-300 bg-red-500/10',
        emphasis: 'danger',
      };
    default:
      return undefined;
  }
};

