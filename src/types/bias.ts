export type BiasValue = 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'NONE';
export type MarketStateValue = 'OUT_OF_BALANCE' | 'IN_BALANCE';
export type BiasConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface BiasStateSnapshot {
  id?: string;
  day_key?: string;
  bias: BiasValue;
  market_state: MarketStateValue | null;
  confidence: BiasConfidence | null;
  tags: string[] | null;
  selected_at: string;
  session?: string | null;
}

export const biasLabels: Record<BiasValue, string> = {
  OOB_LONG: 'Bias: OOB Long',
  OOB_SHORT: 'Bias: OOB Short',
  MR_LONG: 'Bias: MR Long',
  MR_SHORT: 'Bias: MR Short',
  NONE: 'Bias: None'
};

export const biasTone: Record<BiasValue, 'emerald' | 'rose' | 'zinc'> = {
  OOB_LONG: 'emerald',
  MR_LONG: 'emerald',
  OOB_SHORT: 'rose',
  MR_SHORT: 'rose',
  NONE: 'zinc'
};

export const marketStateLabels: Record<MarketStateValue, string> = {
  OUT_OF_BALANCE: 'State: Out of Balance',
  IN_BALANCE: 'State: In Balance'
};

export const marketStateTone: Record<MarketStateValue, 'amber'> = {
  OUT_OF_BALANCE: 'amber',
  IN_BALANCE: 'amber'
};

export const toneClasses: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200',
  rose: 'bg-rose-500/10 border-rose-400/40 text-rose-200',
  amber: 'bg-amber-500/10 border-amber-400/40 text-amber-200',
  zinc: 'bg-zinc-500/10 border-zinc-400/40 text-zinc-200'
};

export interface BiasQuizResult {
  bias: BiasValue;
  market_state: MarketStateValue | null;
  confidence: BiasConfidence | null;
  tags: string[];
}
