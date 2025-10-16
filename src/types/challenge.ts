export interface ChallengePhase {
  id: string;
  user_id: string;
  prop_firm: 'Funded Hive' | 'Topstep';
  phase: 1 | 2 | 'Funded'; // Phase 1, Phase 2, Funded
  starting_balance: number;
  target_profit: number;
  user_reported_current_balance?: number;
  status: 'active' | 'passed' | 'failed' | 'halted';
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  // Fabio discipline system fields
  challenge_name?: string;
  build_phase_active?: boolean;
  build_trades_count?: number;
  build_realized_pnl?: number;
  banked_profit?: number;
  daily_stop_losses?: number;
  last_reset_date?: string;
  is_locked?: boolean;
  lock_reason?: string;
}

export interface ChallengeSummary {
  phaseId: string;
  challengeName?: string;
  propFirm: 'Funded Hive' | 'Topstep';
  phase: 1 | 2 | 'Funded';
  startingBalance: number;
  targetProfit: number;
  currentBalance: number;
  netProfit: number;
  realizedToday: number;
  distanceToPass: number;
  distanceInR: Array<{
    risk: number;
    rLeft: number;
  }>;
  progressPct: number;
  state: 'ACTIVE' | 'PASSED';
  // Fabio discipline system fields
  buildPhaseActive?: boolean;
  buildTradesCount?: number;
  buildRealizedPnl?: number;
  bankedProfit?: number;
  dailyStopLosses?: number;
  isLocked?: boolean;
  lockReason?: string;
}

export interface CreateChallengeRequest {
  propFirm: 'Funded Hive' | 'Topstep';
  phase: 1 | 2 | 'Funded';
  startingBalance: number;
  targetProfit: number;
  currentBalance?: number;
}

export interface UpdateChallengeRequest {
  phaseId: string;
  startingBalance: number;
  targetProfit: number;
  currentBalance?: number;
}

// Fabio Discipline System Types
export interface ChallengeDailyState {
  challengeId: string;
  dateKey: string;
  buildPhaseActive: boolean;
  buildTradesCount: number;
  buildRealizedPnl: number;
  bankedProfit: number;
  bankingTriggered: boolean;
  dailyStopLosses: number;
  isLocked: boolean;
  lockReason?: string;
  realizedPnl: number;
  totalTrades: number;
}

export interface FabioTradeValidation {
  isValid: boolean;
  errorMessage?: string;
  warningMessage?: string;
}

export interface ChallengePhaseStatus {
  phase: 'BUILD' | 'NORMAL' | 'PRESERVATION' | 'LOCKED';
  buildProgress: string; // e.g., "2/3"
  bankedAmount: number;
  stopLossCount: string; // e.g., "1/3"
  isLocked: boolean;
  lockReason?: string;
}
