// Discipline Rules Validation System
// Validates trading actions against the 5 core discipline rules

import type { Trade } from '@/types/trade';
import type { DisciplineChallenge } from '@/types/discipline';

export interface RuleValidationResult {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'minor' | 'major' | 'critical';
  points: number;
}

export interface DisciplineValidation {
  overallPassed: boolean;
  totalScore: number;
  violations: RuleValidationResult[];
  recommendations: string[];
}

export class DisciplineRuleValidator {
  private challenge: DisciplineChallenge;
  private recentTrades: Trade[];

  constructor(challenge: DisciplineChallenge, recentTrades: Trade[] = []) {
    this.challenge = challenge;
    this.recentTrades = recentTrades;
  }

  // Rule 1: Follow Your Setup
  validateSetupRule(trade: Trade): RuleValidationResult {
    const hasSetup = trade.locations && trade.locations.length > 0;
    const hasModel = trade.model && ['trend', 'mean_reversion'].includes(trade.model);
    const hasBias = trade.bias_snapshot && Object.keys(trade.bias_snapshot).length > 0;

    if (!hasSetup || !hasModel || !hasBias) {
      return {
        rule: 'setup_violation',
        passed: false,
        message: 'Trade does not follow predefined setup criteria',
        severity: 'critical',
        points: 20
      };
    }

    return {
      rule: 'setup_violation',
      passed: true,
      message: 'Setup criteria followed correctly',
      severity: 'minor',
      points: 0
    };
  }

  // Rule 2: Never Move Stop Loss Against You
  validateStopLossRule(trade: Trade, originalStopLoss?: number): RuleValidationResult {
    if (!originalStopLoss) {
      return {
        rule: 'sl_movement',
        passed: true,
        message: 'No stop loss movement detected',
        severity: 'minor',
        points: 0
      };
    }

    const currentStopLoss = trade.stop_loss;
    const isLong = trade.direction === 'long';
    const movedAgainst = isLong 
      ? currentStopLoss < originalStopLoss 
      : currentStopLoss > originalStopLoss;

    if (movedAgainst) {
      return {
        rule: 'sl_movement',
        passed: false,
        message: `Stop loss moved against you: ${isLong ? 'lowered' : 'raised'}`,
        severity: 'critical',
        points: 20
      };
    }

    return {
      rule: 'sl_movement',
      passed: true,
      message: 'Stop loss respected (moved in favor or unchanged)',
      severity: 'minor',
      points: 0
    };
  }

  // Rule 3: Respect Risk Per Trade
  validateRiskRule(trade: Trade, accountBalance: number): RuleValidationResult {
    const riskAmount = trade.risk_amount;
    const riskPercentage = (riskAmount / accountBalance) * 100;
    const maxRisk = this.challenge.max_risk_per_trade;

    if (riskPercentage > maxRisk) {
      return {
        rule: 'risk_exceeded',
        passed: false,
        message: `Risk ${riskPercentage.toFixed(2)}% exceeds limit of ${maxRisk}%`,
        severity: 'critical',
        points: 20
      };
    }

    return {
      rule: 'risk_exceeded',
      passed: true,
      message: `Risk ${riskPercentage.toFixed(2)}% within limit of ${maxRisk}%`,
      severity: 'minor',
      points: 0
    };
  }

  // Rule 4: House Money Rules
  validateHouseMoneyRule(trade: Trade, accountBalance: number, startingBalance: number): RuleValidationResult {
    const profit = accountBalance - startingBalance;
    const profitPercentage = (profit / startingBalance) * 100;
    const houseMoneyThreshold = this.challenge.house_money_threshold;

    if (profitPercentage >= houseMoneyThreshold) {
      // In house money territory - should reduce risk
      const riskAmount = trade.risk_amount;
      const riskPercentage = (riskAmount / accountBalance) * 100;
      const reducedRiskLimit = this.challenge.max_risk_per_trade * 0.5; // 50% of normal risk

      if (riskPercentage > reducedRiskLimit) {
        return {
          rule: 'house_money_violation',
          passed: false,
          message: `In house money (${profitPercentage.toFixed(2)}% profit) but risk ${riskPercentage.toFixed(2)}% exceeds reduced limit of ${reducedRiskLimit}%`,
          severity: 'major',
          points: 20
        };
      }
    }

    return {
      rule: 'house_money_violation',
      passed: true,
      message: 'House money rules followed correctly',
      severity: 'minor',
      points: 0
    };
  }

  // Rule 5: Three Losses Rule
  validateThreeLossesRule(): RuleValidationResult {
    const maxLosses = this.challenge.max_daily_losses;
    const todayTrades = this.getTodayTrades();
    const losingTrades = todayTrades.filter(trade => 
      trade.status === 'closed' && trade.pnl && trade.pnl < 0
    );

    if (losingTrades.length >= maxLosses) {
      return {
        rule: 'three_losses_violation',
        passed: false,
        message: `Stopped after ${losingTrades.length} losses (limit: ${maxLosses})`,
        severity: 'critical',
        points: 20
      };
    }

    return {
      rule: 'three_losses_violation',
      passed: true,
      message: `Loss count ${losingTrades.length} within limit of ${maxLosses}`,
      severity: 'minor',
      points: 0
    };
  }

  // Validate all rules for a trade
  validateTrade(trade: Trade, accountBalance: number, startingBalance: number, originalStopLoss?: number): DisciplineValidation {
    const violations: RuleValidationResult[] = [];

    // Validate each rule
    violations.push(this.validateSetupRule(trade));
    violations.push(this.validateStopLossRule(trade, originalStopLoss));
    violations.push(this.validateRiskRule(trade, accountBalance));
    violations.push(this.validateHouseMoneyRule(trade, accountBalance, startingBalance));
    violations.push(this.validateThreeLossesRule());

    const failedRules = violations.filter(v => !v.passed);
    const totalScore = Math.max(0, 100 - violations.reduce((sum, v) => sum + v.points, 0));
    const overallPassed = failedRules.length === 0;

    const recommendations = this.generateRecommendations(failedRules);

    return {
      overallPassed,
      totalScore,
      violations,
      recommendations
    };
  }

  // Generate recommendations based on violations
  private generateRecommendations(violations: RuleValidationResult[]): string[] {
    const recommendations: string[] = [];

    violations.forEach(violation => {
      switch (violation.rule) {
        case 'setup_violation':
          recommendations.push('Only take trades that match your predefined setup criteria');
          break;
        case 'sl_movement':
          recommendations.push('Never move stop loss against you - only in your favor');
          break;
        case 'risk_exceeded':
          recommendations.push(`Keep risk per trade under ${this.challenge.max_risk_per_trade}%`);
          break;
        case 'house_money_violation':
          recommendations.push('Reduce risk when in house money territory');
          break;
        case 'three_losses_violation':
          recommendations.push(`Stop trading after ${this.challenge.max_daily_losses} consecutive losses`);
          break;
      }
    });

    return recommendations;
  }

  // Get today's trades
  private getTodayTrades(): Trade[] {
    const today = new Date().toISOString().split('T')[0];
    return this.recentTrades.filter(trade => 
      trade.entry_time && trade.entry_time.startsWith(today)
    );
  }

  // Get daily discipline score
  getDailyDisciplineScore(): number {
    const todayTrades = this.getTodayTrades();
    let totalScore = 100;

    todayTrades.forEach(trade => {
      const validation = this.validateTrade(trade, 10000, 10000); // Placeholder values
      totalScore = Math.min(totalScore, validation.totalScore);
    });

    return totalScore;
  }

  // Check if trading should be allowed
  canTrade(): { allowed: boolean; reason?: string } {
    const threeLossesCheck = this.validateThreeLossesRule();
    
    if (!threeLossesCheck.passed) {
      return {
        allowed: false,
        reason: threeLossesCheck.message
      };
    }

    return { allowed: true };
  }
}

// Utility functions for integration
export function createDisciplineValidator(challenge: DisciplineChallenge, trades: Trade[]): DisciplineRuleValidator {
  return new DisciplineRuleValidator(challenge, trades);
}

export function validateTradeDiscipline(
  trade: Trade, 
  challenge: DisciplineChallenge, 
  accountBalance: number, 
  startingBalance: number,
  recentTrades: Trade[] = []
): DisciplineValidation {
  const validator = new DisciplineRuleValidator(challenge, recentTrades);
  return validator.validateTrade(trade, accountBalance, startingBalance);
}

export function getDisciplineRecommendations(challenge: DisciplineChallenge): string[] {
  return [
    `Follow your setup criteria strictly`,
    `Never move stop loss against you`,
    `Keep risk per trade under ${challenge.max_risk_per_trade}%`,
    `Reduce risk when in ${challenge.house_money_threshold}% profit`,
    `Stop after ${challenge.max_daily_losses} consecutive losses`
  ];
}
