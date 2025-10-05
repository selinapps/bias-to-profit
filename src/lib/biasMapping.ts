import type { QuizState, BiasValue, MarketStateValue, BiasConfidence } from '@/types/bias';

/**
 * Deterministic bias mapping function following Fabio's 3-step model:
 * Market State → Location → Aggression
 * 
 * Returns OOB_LONG/OOB_SHORT for Trend/Continuation setups
 * Returns MR_LONG/MR_SHORT for Mean Reversion setups  
 * Returns FLAT for no edge or conflicting signals
 */
export function mapBias(quizState: QuizState): BiasValue {
  // A. Hard guardrails (return FLAT immediately)
  const undecidedEverywhere =
    quizState.location === 'UNDECIDED' &&
    (quizState.orderFlow.includes('NONE') || quizState.orderFlow.length === 0) &&
    quizState.structure === 'RANGE_ROTATION';

  if (!quizState.direction || undecidedEverywhere) {
    return 'FLAT';
  }

  // Helper functions
  const hasAggWithMove =
    quizState.orderFlow.includes('CVD_WITH_MOVE') ||
    quizState.orderFlow.includes('FOOTPRINT_IMBAL') ||
    quizState.orderFlow.includes('BIG_PRINTS_TREND');

  const hasAbsorption = quizState.orderFlow.includes('ABSORPTION_AGAINST');

  const locOOB = 
    quizState.location === 'OUTSIDE_VALUE_HOLDING' || 
    quizState.location === 'RECLAIMED_VWAP_AFTER_STRETCH';

  const locInside = quizState.location === 'INSIDE_VALUE_RECLAIMED';

  // B. OUT OF BALANCE → Trend Model (OOB)
  const oobCandidate =
    quizState.marketState === 'OUT_OF_BALANCE' &&
    locOOB &&
    quizState.structure === 'IMPULSE_SHALLOW_PB' &&
    hasAggWithMove && 
    !hasAbsorption;

  // C. IN BALANCE / FAILED BREAK → Mean Reversion (MR)
  const mrCandidate =
    (quizState.structure === 'FAILED_BREAK_RECLAIM' && locInside && hasAbsorption) ||
    (quizState.structure === 'RANGE_ROTATION' && locInside && !hasAggWithMove);

  // D. Tie-breaker priority
  if (oobCandidate && !mrCandidate) {
    return quizState.direction === 'LONG' ? 'OOB_LONG' : 'OOB_SHORT';
  }
  
  if (mrCandidate && !oobCandidate) {
    return quizState.direction === 'LONG' ? 'MR_LONG' : 'MR_SHORT';
  }
  
  if (oobCandidate && mrCandidate) {
    // Prefer MR if reclaim is confirmed; else OOB
    if (quizState.structure === 'FAILED_BREAK_RECLAIM' && locInside) {
      return quizState.direction === 'LONG' ? 'MR_LONG' : 'MR_SHORT';
    }
    return quizState.direction === 'LONG' ? 'OOB_LONG' : 'OOB_SHORT';
  }

  return 'FLAT';
}

/**
 * Session-based quality filters
 * Returns warning level for bias in given session
 */
export function getSessionWarning(bias: BiasValue, session: string): 'green' | 'yellow' | 'red' {
  const isOOB = bias === 'OOB_LONG' || bias === 'OOB_SHORT';
  const isMR = bias === 'MR_LONG' || bias === 'MR_SHORT';

  if (isOOB) {
    // Trend (OOB) - green in NY, caution in London open
    if (session === 'NY') return 'green';
    if (session === 'LONDON_KZ') return 'yellow';
    return 'green';
  }

  if (isMR) {
    // Mean Reversion - green in London and compressed periods
    if (session === 'LONDON_KZ' || session === 'LONDON_LUNCH') return 'green';
    if (session === 'NY') return 'yellow';
    return 'green';
  }

  return 'green';
}

/**
 * Generate entry checklist for OOB setups
 */
export function getOOBEntryChecklist(): string[] {
  return [
    'POI = LVN in impulse leg profile',
    'Aggression at LVN confirmed',
    'Stop just beyond aggressive print (+1–2 ticks)',
    'Target = next balance/POC',
    'Move to BE on follow-through'
  ];
}

/**
 * Generate entry checklist for MR setups
 */
export function getMREntryChecklist(): string[] {
  return [
    'Confirm reclaim inside value',
    'POI = LVN of reclaim leg',
    'Target = balance POC',
    'Invalidation immediate if reclaim fails',
    'Tight SL beyond aggression'
  ];
}

/**
 * Generate risk hint based on confidence
 */
export function getRiskHint(confidence: BiasConfidence | null): string {
  switch (confidence) {
    case 'HIGH':
      return 'A-setup risk (0.25–0.5% typical)';
    case 'MEDIUM':
      return 'B-setup risk (0.25–0.5% typical)';
    case 'LOW':
      return 'C-setup risk (0.25–0.5% typical)';
    default:
      return 'Standard risk (0.25–0.5% typical)';
  }
}

/**
 * Convert quiz state to market state for display
 */
export function mapToMarketState(quizState: QuizState): MarketStateValue | null {
  if (quizState.marketState === 'UNCLEAR') return null;
  return quizState.marketState === 'OUT_OF_BALANCE' ? 'OUT_OF_BALANCE' : 'IN_BALANCE';
}

/**
 * Generate tags for the bias result
 */
export function generateTags(quizState: QuizState): string[] {
  const tags = [
    quizState.location !== 'UNDECIDED' ? quizState.location : null,
    ...quizState.orderFlow.filter(option => option !== 'NONE'),
    quizState.structure,
    quizState.session
  ].filter((item): item is string => typeof item === 'string' && Boolean(item));

  return tags;
}
