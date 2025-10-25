export interface SessionBehavior {
  id: string;
  name: string;
  description: string;
  tradingHints: string[];
  typicalScenarios: string[];
}

export interface SessionScenario {
  id: 'S1' | 'S2' | 'S3';
  name: string;
  description: string;
  tradingImplications: string[];
  examples: string[];
}

// Session Behaviors
export const SESSION_BEHAVIORS: Record<string, SessionBehavior> = {
  asia_consolidation: {
    id: 'asia_consolidation',
    name: 'Asia Consolidation',
    description: 'Price consolidates in a range, setting the stage for London breakout',
    tradingHints: [
      'Range-bound trading only',
      'Watch for key highs/lows to be used as London targets',
      'Low volatility - avoid swing trades'
    ],
    typicalScenarios: ['S1 - London Break Asia Range', 'S2 - London Sweep Asia Range']
  },
  asia_expansion: {
    id: 'asia_expansion',
    name: 'Asia Expansion',
    description: 'Asia breaks its normal pattern, showing unusual volatility',
    tradingHints: [
      'Expect continuation in London',
      'Set wider stops',
      'Higher probability setups'
    ],
    typicalScenarios: ['S3 - Asia Breakout Continues']
  },
  london_sweep_asia: {
    id: 'london_sweep_asia',
    name: 'London Sweep Asia Range',
    description: 'London sweeps Asia highs/lows to trap retail, then reverses',
    tradingHints: [
      'Wait for sweep confirmation',
      'Entry after liquidity grab',
      'High probability reversal setup',
      'Watch for order blocks at Asia extremes'
    ],
    typicalScenarios: ['S1 - Mean Reversion Trade']
  },
  london_break_asia: {
    id: 'london_break_asia',
    name: 'London Break Asia Range',
    description: 'London breaks through Asia range with volume',
    tradingHints: [
      'Breakout trade opportunity',
      'Enter on retest of broken level',
      'Targets at next liquidity zone',
      'Strong directional move expected'
    ],
    typicalScenarios: ['S2 - Trend Continuation Trade']
  },
  london_rejection_asia: {
    id: 'london_rejection_asia',
    name: 'London Rejection of Asia Range',
    description: 'London tries to break Asia range but fails',
    tradingHints: [
      'Rejection means range holds',
      'Fade the rejection',
      'Target back to opposite end of range',
      'Short-lived moves expected'
    ],
    typicalScenarios: ['S1 - Range Trading']
  },
  ny_continuation: {
    id: 'ny_continuation',
    name: 'NY Continuation',
    description: 'New York continues the London move',
    tradingHints: [
      'Trend following setup',
      'Enter on pullbacks',
      'Target extension levels',
      'High momentum expected'
    ],
    typicalScenarios: ['S2 - Trend Trade']
  },
  ny_reversal: {
    id: 'ny_reversal',
    name: 'NY Reversal',
    description: 'New York reverses the London direction',
    tradingHints: [
      'Counter-trend opportunity',
      'Watch for exhaustion signals',
      'Lower time frame reversals',
      'Risk management critical'
    ],
    typicalScenarios: ['S3 - Mean Reversion']
  },
  ny_overlap_momentum: {
    id: 'ny_overlap_momentum',
    name: 'NY Overlap Momentum',
    description: 'London-NY overlap creates strong momentum',
    tradingHints: [
      'Best liquidity window',
      'News can amplify moves',
      'Wide stops recommended',
      'Highest probability setups'
    ],
    typicalScenarios: ['S2 - Breakout Trade', 'S1 - Liquidity Run']
  }
};

// Session Scenarios
export const SESSION_SCENARIOS: Record<string, SessionScenario> = {
  S1: {
    id: 'S1',
    name: 'London Sweep & Reversal',
    description: 'London sweeps Asia extremes (liquidity grab) then reverses into the opposite direction',
    tradingImplications: [
      'Wait for the sweep to occur',
      'Enter after liquidity grab confirmation',
      'Target opposite end of Asia range',
      'High win rate setup',
      'Risk: low'
    ],
    examples: [
      'Asia Low at 1.1000 → London sweeps to 1.0995 → Reverses up to target 1.1050',
      'Asia High at 1.1100 → London sweeps to 1.1105 → Reverses down to target 1.1050'
    ]
  },
  S2: {
    id: 'S2',
    name: 'London Breakout with Continuation',
    description: 'London breaks out of Asia range with momentum, continuation expected',
    tradingImplications: [
      'Enter on retest of broken level',
      'Expect continuation into NY session',
      'Wider targets than S1',
      'Medium risk/reward',
      'Higher volume expected'
    ],
    examples: [
      'Asia range 1.1000-1.1100 → London breaks above 1.1100 → Retest to 1.1090 → Targets 1.1150+',
      'Break of range bottom → Expect continued selling into NY'
    ]
  },
  S3: {
    id: 'S3',
    name: 'London Rejection & Range Hold',
    description: 'London attempts breakout but gets rejected, range trading continues',
    tradingImplications: [
      'Range-bound conditions persist',
      'Fade the extremes',
      'Lower targets',
      'Avoid trend trades',
      'Low momentum environment'
    ],
    examples: [
      'Asia range 1.1000-1.1100 → London tries 1.1105 → Gets rejected → Back to 1.1050',
      'No clear direction, wait for clear break or sweep'
    ]
  }
};

// Helper function to get behavior by ID
export const getSessionBehavior = (behaviorId: string): SessionBehavior | undefined => {
  return SESSION_BEHAVIORS[behaviorId];
};

// Helper function to get scenario by ID
export const getSessionScenario = (scenarioId: string): SessionScenario | undefined => {
  return SESSION_SCENARIOS[scenarioId];
};

// Helper function to get behaviors by session
export const getBehaviorsBySession = (sessionName: string): SessionBehavior[] => {
  const sessionKey = sessionName.toLowerCase();
  const relevant: string[] = [];

  if (sessionKey.includes('asia') || sessionKey.includes('asian')) {
    relevant.push('asia_consolidation', 'asia_expansion');
  }
  if (sessionKey.includes('london')) {
    relevant.push('london_sweep_asia', 'london_break_asia', 'london_rejection_asia');
  }
  if (sessionKey.includes('new york') || sessionKey.includes('ny')) {
    relevant.push('ny_continuation', 'ny_reversal', 'ny_overlap_momentum');
  }

  return relevant.map(id => SESSION_BEHAVIORS[id]).filter(Boolean);
};
