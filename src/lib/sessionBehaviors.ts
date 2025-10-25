export interface SessionBehavior {
  id: string;
  name: string;
  description: string;
  tradingHints: string[];
  typicalScenarios: string[];
  requiresSweepTime?: boolean; // For tracking when sweep happened
  sweepType?: 'high' | 'low' | 'both' | null; // Type of sweep if applicable
}

export interface SessionScenario {
  id: 'S1' | 'S2' | 'S3';
  name: string;
  description: string;
  tradingImplications: string[];
  examples: string[];
}

// Session Behaviors - Expanded with specific sweep types
export const SESSION_BEHAVIORS: Record<string, SessionBehavior> = {
  // ASIA SESSION
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

  // LONDON SESSION - SPECIFIC SWEEPS
  london_sweep_asia_low: {
    id: 'london_sweep_asia_low',
    name: 'London Sweep Asia Low',
    description: 'London sweeps Asia low (liquidity grab) then reverses up',
    tradingHints: [
      'Wait for sweep to Asia low',
      'Entry after liquidity grab confirmation',
      'Target Asia high or extension',
      'High win rate reversal setup',
      'Watch for order blocks at Asia low'
    ],
    typicalScenarios: ['S1 - Mean Reversion Trade'],
    requiresSweepTime: true,
    sweepType: 'low'
  },
  london_sweep_asia_high: {
    id: 'london_sweep_asia_high',
    name: 'London Sweep Asia High',
    description: 'London sweeps Asia high (liquidity grab) then reverses down',
    tradingHints: [
      'Wait for sweep to Asia high',
      'Entry after liquidity grab confirmation',
      'Target Asia low or extension',
      'High win rate reversal setup',
      'Watch for order blocks at Asia high'
    ],
    typicalScenarios: ['S1 - Mean Reversion Trade'],
    requiresSweepTime: true,
    sweepType: 'high'
  },
  london_sweep_both: {
    id: 'london_sweep_both',
    name: 'London Sweep Both (High & Low)',
    description: 'London sweeps both Asia high and low, creating confusion before direction',
    tradingHints: [
      'Both extremes swept',
      'Wait for clear direction after both sweeps',
      'Lower time frame confirmation needed',
      'Higher risk setup'
    ],
    typicalScenarios: ['S1 - Complex Mean Reversion'],
    requiresSweepTime: true,
    sweepType: 'both'
  },
  
  // LONDON SESSION - BREAKOUTS
  london_break_asia_high: {
    id: 'london_break_asia_high',
    name: 'London Break Above Asia High',
    description: 'London breaks above Asia high with volume and continuation',
    tradingHints: [
      'Bullish breakout trade',
      'Enter on retest of broken Asia high',
      'Targets above Asia range',
      'Strong continuation expected',
      'Stop below Asia high'
    ],
    typicalScenarios: ['S2 - Trend Continuation Trade'],
    sweepType: null
  },
  london_break_asia_low: {
    id: 'london_break_asia_low',
    name: 'London Break Below Asia Low',
    description: 'London breaks below Asia low with volume and continuation',
    tradingHints: [
      'Bearish breakout trade',
      'Enter on retest of broken Asia low',
      'Targets below Asia range',
      'Strong continuation expected',
      'Stop above Asia low'
    ],
    typicalScenarios: ['S2 - Trend Continuation Trade'],
    sweepType: null
  },
  
  // LONDON SESSION - REJECTIONS
  london_rejection_asia_high: {
    id: 'london_rejection_asia_high',
    name: 'London Rejection of Asia High',
    description: 'London tries to break/sweep Asia high but gets rejected',
    tradingHints: [
      'Bearish rejection setup',
      'Fade the move after rejection',
      'Target back to Asia low',
      'Range holds above Asia low'
    ],
    typicalScenarios: ['S1 - Range Trading'],
    sweepType: null
  },
  london_rejection_asia_low: {
    id: 'london_rejection_asia_low',
    name: 'London Rejection of Asia Low',
    description: 'London tries to break/sweep Asia low but gets rejected',
    tradingHints: [
      'Bullish rejection setup',
      'Fade the move after rejection',
      'Target back to Asia high',
      'Range holds below Asia high'
    ],
    typicalScenarios: ['S1 - Range Trading'],
    sweepType: null
  },

  // NEW YORK SESSION
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
    typicalScenarios: ['S2 - Trend Trade'],
    sweepType: null
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
    typicalScenarios: ['S3 - Mean Reversion'],
    sweepType: null
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
    typicalScenarios: ['S2 - Breakout Trade', 'S1 - Liquidity Run'],
    sweepType: null
  },
  ny_london_break_failure: {
    id: 'ny_london_break_failure',
    name: 'NY London Break Failure',
    description: 'London made a break but NY fails to continue, reverses',
    tradingHints: [
      'London breakout fake',
      'Counter London direction',
      'Fade London momentum',
      'Expect range to return'
    ],
    typicalScenarios: ['S3 - Mean Reversion'],
    sweepType: null
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
    // Add all London-specific behaviors
    relevant.push(
      'london_sweep_asia_low',
      'london_sweep_asia_high', 
      'london_sweep_both',
      'london_break_asia_high',
      'london_break_asia_low',
      'london_rejection_asia_high',
      'london_rejection_asia_low'
    );
  }
  if (sessionKey.includes('new york') || sessionKey.includes('ny')) {
    relevant.push('ny_continuation', 'ny_reversal', 'ny_overlap_momentum', 'ny_london_break_failure');
  }

  return relevant.map(id => SESSION_BEHAVIORS[id]).filter(Boolean);
};
