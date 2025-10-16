// Discipline Challenge System Types
// Comprehensive type definitions for the 30-day trading discipline challenge

export interface DisciplineChallenge {
  id: string;
  user_id: string;
  challenge_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  
  // Challenge rules and settings
  max_daily_losses: number;
  max_risk_per_trade: number; // percentage
  house_money_threshold: number; // percentage
  must_follow_setup: boolean;
  no_sl_movement: boolean;
  
  // Progress tracking
  current_streak: number;
  longest_streak: number;
  total_days_completed: number;
  total_rule_violations: number;
  
  // Daily state tracking
  current_day: number;
  daily_violations: number;
  daily_score: number; // 0-100
  is_day_completed: boolean;
  
  // Challenge completion
  completion_percentage: number;
  final_score?: number;
  completed_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DailyDisciplineTracking {
  id: string;
  challenge_id: string;
  user_id: string;
  tracking_date: string;
  day_number: number;
  
  // Rule adherence tracking
  followed_setup: boolean;
  respected_sl: boolean;
  respected_risk: boolean;
  respected_house_money: boolean;
  respected_3_losses: boolean;
  
  // Violation details
  violations: RuleViolation[];
  violation_count: number;
  
  // Daily metrics
  trades_taken: number;
  profitable_trades: number;
  losing_trades: number;
  total_pnl: number;
  max_risk_used: number;
  
  // Scoring
  daily_score: number; // 0-100
  discipline_notes?: string;
  
  // Completion status
  is_completed: boolean;
  completed_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface RuleViolation {
  id: string;
  challenge_id: string;
  user_id: string;
  trade_id?: string;
  violation_date: string;
  day_number: number;
  
  // Violation details
  violation_type: 'setup_violation' | 'sl_movement' | 'risk_exceeded' | 'house_money_violation' | 'three_losses_violation';
  violation_description: string;
  severity: 'minor' | 'major' | 'critical';
  
  // Context
  trade_context: Record<string, any>;
  violation_context: Record<string, any>;
  
  // Resolution
  is_acknowledged: boolean;
  acknowledgment_notes?: string;
  resolved_at?: string;
  
  created_at: string;
}

export interface ChallengeProgress {
  challenge_id: string;
  challenge_name: string;
  start_date: string;
  end_date: string;
  current_day: number;
  total_days: number;
  current_streak: number;
  longest_streak: number;
  completion_percentage: number;
  daily_score: number;
  total_violations: number;
  status: string;
}

export interface DisciplineRule {
  id: string;
  name: string;
  description: string;
  weight: number; // Points deducted for violation
  is_critical: boolean;
  icon: string;
}

export interface DailyDisciplineForm {
  followed_setup: boolean;
  respected_sl: boolean;
  respected_risk: boolean;
  respected_house_money: boolean;
  respected_3_losses: boolean;
  trades_taken: number;
  profitable_trades: number;
  losing_trades: number;
  total_pnl: number;
  max_risk_used: number;
  discipline_notes?: string;
}

export interface ChallengeStats {
  total_days: number;
  completed_days: number;
  current_streak: number;
  longest_streak: number;
  total_violations: number;
  average_daily_score: number;
  perfect_days: number;
  violation_breakdown: Record<string, number>;
}

export interface ChallengeSetup {
  challenge_name: string;
  max_daily_losses: number;
  max_risk_per_trade: number;
  house_money_threshold: number;
  must_follow_setup: boolean;
  no_sl_movement: boolean;
}

// Rule definitions for the discipline system
export const DISCIPLINE_RULES: DisciplineRule[] = [
  {
    id: 'follow_setup',
    name: 'Follow Your Setup',
    description: 'Only take trades that match your predefined setup criteria',
    weight: 20,
    is_critical: true,
    icon: 'Target'
  },
  {
    id: 'respect_sl',
    name: 'Never Move Stop Loss',
    description: 'Never move your stop loss against you (only in your favor)',
    weight: 20,
    is_critical: true,
    icon: 'Shield'
  },
  {
    id: 'respect_risk',
    name: 'Respect Risk Per Trade',
    description: 'Never risk more than your predefined percentage per trade',
    weight: 20,
    is_critical: true,
    icon: 'AlertTriangle'
  },
  {
    id: 'house_money',
    name: 'House Money Rules',
    description: 'Follow house money rules when in profit (reduce risk, protect gains)',
    weight: 20,
    is_critical: true,
    icon: 'TrendingUp'
  },
  {
    id: 'three_losses',
    name: 'Three Losses Rule',
    description: 'Stop trading after 3 consecutive losses',
    weight: 20,
    is_critical: true,
    icon: 'X'
  }
];

// Challenge difficulty levels
export interface ChallengeDifficulty {
  id: string;
  name: string;
  description: string;
  max_daily_losses: number;
  max_risk_per_trade: number;
  house_money_threshold: number;
  color: string;
  icon: string;
}

export const CHALLENGE_DIFFICULTIES: ChallengeDifficulty[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Start your discipline journey with basic rules',
    max_daily_losses: 3,
    max_risk_per_trade: 2.0,
    house_money_threshold: 3.0,
    color: 'green',
    icon: 'Leaf'
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Challenge yourself with stricter rules',
    max_daily_losses: 2,
    max_risk_per_trade: 1.5,
    house_money_threshold: 2.5,
    color: 'blue',
    icon: 'TrendingUp'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Master-level discipline with strictest rules',
    max_daily_losses: 1,
    max_risk_per_trade: 1.0,
    house_money_threshold: 2.0,
    color: 'red',
    icon: 'Crown'
  }
];

// Achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'streak' | 'perfect_days' | 'completion' | 'violation_free';
    value: number;
  };
  unlocked: boolean;
  unlocked_at?: string;
}

export const DISCIPLINE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_perfect_day',
    name: 'Perfect Day',
    description: 'Complete a day with zero rule violations',
    icon: 'Star',
    requirement: { type: 'perfect_days', value: 1 },
    unlocked: false
  },
  {
    id: 'three_day_streak',
    name: 'Three Day Streak',
    description: 'Maintain discipline for 3 consecutive days',
    icon: 'Flame',
    requirement: { type: 'streak', value: 3 },
    unlocked: false
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain discipline for 7 consecutive days',
    icon: 'Calendar',
    requirement: { type: 'streak', value: 7 },
    unlocked: false
  },
  {
    id: 'half_challenge',
    name: 'Halfway Hero',
    description: 'Complete 15 days of the challenge',
    icon: 'Target',
    requirement: { type: 'completion', value: 15 },
    unlocked: false
  },
  {
    id: 'challenge_complete',
    name: 'Discipline Master',
    description: 'Complete the full 30-day challenge',
    icon: 'Trophy',
    requirement: { type: 'completion', value: 30 },
    unlocked: false
  }
];
