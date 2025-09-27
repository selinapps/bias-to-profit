export type ExecutionModel =
  | 'TREND_IMPULSE_PB'
  | 'TREND_VWAP_SIGMA'
  | 'TREND_VALUE_MIGRATION'
  | 'MR_FAIL_BREAKOUT_POC'
  | 'MR_VA_FADE'
  | 'MR_VWAP_REVERT';

import type { MarketStateValue } from '@/types/bias';

export const MODELS_BY_STATE: Record<MarketStateValue, ExecutionModel[]> = {
  OUT_OF_BALANCE: [
    'TREND_IMPULSE_PB',
    'TREND_VWAP_SIGMA',
    'TREND_VALUE_MIGRATION'
  ],
  IN_BALANCE: [
    'MR_FAIL_BREAKOUT_POC',
    'MR_VA_FADE',
    'MR_VWAP_REVERT'
  ]
};

interface ExecutionModelDetail {
  label: string;
  checklist: string[];
  category: 'TREND' | 'MR';
}

export const EXECUTION_MODEL_DETAILS: Record<ExecutionModel, ExecutionModelDetail> = {
  TREND_IMPULSE_PB: {
    label: 'Trend • Impulse Pullback',
    category: 'TREND',
    checklist: [
      'HTF aligns with OOB direction',
      'Price outside value with trend control',
      'Impulse leg followed by shallow pullback',
      'CVD & imbalances backing the move',
      'No opposite absorption at point of interest',
      'Risk defined behind impulse origin'
    ]
  },
  TREND_VWAP_SIGMA: {
    label: 'Trend • VWAP σ Ride',
    category: 'TREND',
    checklist: [
      'VWAP posture aligned with trend',
      'Holding above σ1 and pressing toward σ2',
      'No heavy counter absorption',
      'Liquidity target remains ahead',
      'Risk tucked under VWAP/σ reclaim'
    ]
  },
  TREND_VALUE_MIGRATION: {
    label: 'Trend • Value Migration',
    category: 'TREND',
    checklist: [
      'POC / value shifting in trend direction',
      'Pullback respects migrated value area',
      'Continuation prints confirming migration',
      'No topping divergence into entry',
      'Risk placed behind migrated value'
    ]
  },
  MR_FAIL_BREAKOUT_POC: {
    label: 'MR • Failed Breakout to POC',
    category: 'MR',
    checklist: [
      'Edge breakout failed and reclaimed',
      'Acceptance building back inside value',
      'Exhaustion where breakout failed',
      'Primary target set to session POC',
      'Risk placed beyond failed extreme'
    ]
  },
  MR_VA_FADE: {
    label: 'MR • Value Area Fade',
    category: 'MR',
    checklist: [
      'Test & rejection of VAH/VAL',
      'Day type showing non-trend behavior',
      'Lack of aggression through the edge',
      'Target planned toward mid / POC',
      'Risk tucked beyond the value edge'
    ]
  },
  MR_VWAP_REVERT: {
    label: 'MR • VWAP Revert',
    category: 'MR',
    checklist: [
      'Stretch extended from VWAP',
      'Momentum waning / divergence showing',
      'Entry planned on VWAP reclaim',
      'Target anchored at VWAP',
      'Risk set beyond stretch extreme'
    ]
  }
};

export const getExecutionModelLabel = (model?: ExecutionModel | null) => {
  if (!model) return 'Select model';
  return EXECUTION_MODEL_DETAILS[model]?.label ?? model;
};

export const getExecutionModelChecklist = (model?: ExecutionModel | null) => {
  if (!model) return [];
  return EXECUTION_MODEL_DETAILS[model]?.checklist ?? [];
};

export const isTrendModel = (model?: string | null) =>
  typeof model === 'string' && model.startsWith('TREND');

export const isMeanReversionModel = (model?: string | null) =>
  typeof model === 'string' && model.startsWith('MR_');
