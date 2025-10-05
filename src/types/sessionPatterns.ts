export type SessionBehavior = 'continuation' | 'reversal' | 'consolidation' | 'unknown';
export type SessionScenario = 'S1' | 'S2' | 'S3' | 'none';

export interface SessionPattern {
  id?: string;
  date: string;
  asia_behavior: SessionBehavior;
  london_behavior: SessionBehavior;
  ny_behavior: SessionBehavior;
  inferred_scenario: SessionScenario;
  confidence?: number;
  notes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SessionPatternInput {
  asia_behavior: SessionBehavior;
  london_behavior: SessionBehavior;
  ny_behavior: SessionBehavior;
  notes?: string;
}

export interface ScenarioInference {
  scenario: SessionScenario;
  confidence: number;
  expected?: {
    asia?: SessionBehavior;
    london?: SessionBehavior;
    ny?: SessionBehavior;
  };
  hint: string;
}

// Scenario definitions
export const SCENARIOS = {
  S1: { 
    asia: 'consolidation' as SessionBehavior, 
    london: 'reversal' as SessionBehavior, 
    ny: 'continuation' as SessionBehavior 
  },
  S2: { 
    asia: 'continuation' as SessionBehavior, 
    london: 'consolidation' as SessionBehavior, 
    ny: 'continuation' as SessionBehavior 
  },
  S3: { 
    asia: 'continuation' as SessionBehavior, 
    london: 'continuation' as SessionBehavior, 
    ny: 'reversal' as SessionBehavior 
  },
} as const;

// Scenario hints
export const SCENARIO_HINTS = {
  S1: "NY tends to **continue** after London **reverses** an Asian **range**.",
  S2: "Asia **continues**, London **ranges**, NY **continues** the trend.",
  S3: "Asia + London **continue**, watch NY for **reversal**.",
  none: "No clear scenario pattern detected."
} as const;

// Behavior labels for UI
export const BEHAVIOR_LABELS = {
  continuation: 'Cont',
  reversal: 'Rev', 
  consolidation: 'Cons',
  unknown: '?'
} as const;

// Behavior colors for UI
export const BEHAVIOR_COLORS = {
  continuation: 'bg-green-500/20 text-green-300 border-green-400/50',
  reversal: 'bg-red-500/20 text-red-300 border-red-400/50',
  consolidation: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
  unknown: 'bg-gray-500/20 text-gray-300 border-gray-400/50'
} as const;

// Scenario colors for UI
export const SCENARIO_COLORS = {
  S1: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
  S2: 'bg-blue-500/20 text-blue-300 border-blue-400/50', 
  S3: 'bg-orange-500/20 text-orange-300 border-orange-400/50',
  none: 'bg-gray-500/20 text-gray-300 border-gray-400/50'
} as const;

/**
 * Infer session scenario from behaviors
 * Requires at least 2 known behaviors to make a prediction
 */
export function inferScenario(
  asia: SessionBehavior,
  london: SessionBehavior, 
  ny: SessionBehavior
): ScenarioInference {
  const knownBehaviors = [asia, london, ny].filter(b => b !== 'unknown');
  
  // Need at least 2 known behaviors to make a prediction
  if (knownBehaviors.length < 2) {
    return {
      scenario: 'none',
      confidence: 0,
      hint: SCENARIO_HINTS.none
    };
  }

  // Check for exact matches first (all 3 known)
  if (knownBehaviors.length === 3) {
    for (const [scenarioKey, pattern] of Object.entries(SCENARIOS)) {
      if (asia === pattern.asia && london === pattern.london && ny === pattern.ny) {
        return {
          scenario: scenarioKey as SessionScenario,
          confidence: 100,
          hint: SCENARIO_HINTS[scenarioKey as SessionScenario]
        };
      }
    }
  }

  // Check for partial matches with predictions (2+ known)
  for (const [scenarioKey, pattern] of Object.entries(SCENARIOS)) {
    const asiaMatch = asia === pattern.asia || asia === 'unknown';
    const londonMatch = london === pattern.london || london === 'unknown';
    const nyMatch = ny === pattern.ny || ny === 'unknown';
    
    if (asiaMatch && londonMatch && nyMatch) {
      const expected: any = {};
      if (asia === 'unknown') expected.asia = pattern.asia;
      if (london === 'unknown') expected.london = pattern.london;
      if (ny === 'unknown') expected.ny = pattern.ny;
      
      // Calculate confidence based on known behaviors
      const confidence = Math.round((knownBehaviors.length / 3) * 100);
      
      return {
        scenario: scenarioKey as SessionScenario,
        confidence,
        expected: Object.keys(expected).length ? expected : undefined,
        hint: SCENARIO_HINTS[scenarioKey as SessionScenario]
      };
    }
  }

  return {
    scenario: 'none',
    confidence: 0,
    hint: SCENARIO_HINTS.none
  };
}

/**
 * Get session behavior options for a given session
 */
export function getSessionBehaviorOptions(sessionId: string): SessionBehavior[] {
  return ['continuation', 'reversal', 'consolidation'];
}

/**
 * Check if a session is currently active
 */
export function isSessionActive(sessionId: string, currentTime: Date = new Date()): boolean {
  const estTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentMinutes = estTime.getHours() * 60 + estTime.getMinutes();
  
  const sessionTimes = {
    asian_range: { start: 20 * 60, end: 4 * 60 }, // 8 PM - 4 AM (crosses midnight)
    london_killzone: { start: 2 * 60, end: 5 * 60 }, // 2 AM - 5 AM
    london_lunch: { start: 7 * 60, end: 8 * 60 }, // 7 AM - 8 AM
    london_ny_overlap: { start: 8 * 60, end: 12 * 60 }, // 8 AM - 12 PM
    silver_bullet: { start: 10 * 60, end: 11 * 60 }, // 10 AM - 11 AM
    ny_session: { start: 8 * 60, end: 17 * 60 } // 8 AM - 5 PM
  };
  
  const session = sessionTimes[sessionId as keyof typeof sessionTimes];
  if (!session) return false;
  
  // Handle sessions that cross midnight
  if (session.start > session.end) {
    return currentMinutes >= session.start || currentMinutes <= session.end;
  }
  
  return currentMinutes >= session.start && currentMinutes <= session.end;
}
