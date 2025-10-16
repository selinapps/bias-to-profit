import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Brain, 
  Target, 
  TrendingDown,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DailyReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  total_trades: number;
  net_r_multiple: number;
  net_pnl: number;
  avg_emotional_score: number;
  plan_adherence_percentage: number;
  bias_accuracy_percentage: number;
  session_discipline_percentage: number;
  top_mistakes: string[];
  improvement_areas: string[];
  positive_actions: string[];
  daily_notes: string;
  key_learnings: string;
  tomorrow_focus: string;
  created_at: string;
  updated_at: string;
}

interface GuardrailAlertsProps {
  reflection: DailyReflection;
}

interface AlertRule {
  id: string;
  condition: (reflection: DailyReflection) => boolean;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  icon: React.ReactNode;
  recommendation: string;
}

const ALERT_RULES: AlertRule[] = [
  {
    id: 'emotional_low',
    condition: (reflection) => reflection.avg_emotional_score < 3,
    severity: 'warning',
    title: 'Low Emotional Score',
    description: 'Your emotional score is below 3, indicating potential stress or emotional imbalance during trading.',
    icon: <Brain className="h-4 w-4" />,
    recommendation: 'Consider taking a break, practicing mindfulness, or reviewing your trading plan to reduce emotional pressure.'
  },
  {
    id: 'emotional_critical',
    condition: (reflection) => reflection.avg_emotional_score < 2,
    severity: 'critical',
    title: 'Critical Emotional State',
    description: 'Your emotional score is critically low, indicating severe emotional distress during trading.',
    icon: <AlertTriangle className="h-4 w-4" />,
    recommendation: 'Stop trading immediately and focus on emotional recovery. Consider speaking with a trading coach or therapist.'
  },
  {
    id: 'plan_adherence_low',
    condition: (reflection) => reflection.plan_adherence_percentage < 70,
    severity: 'warning',
    title: 'Low Plan Adherence',
    description: 'You\'re not following your trading plan consistently, which can lead to poor decision-making.',
    icon: <Target className="h-4 w-4" />,
    recommendation: 'Review your trading checklist and commit to following it more strictly. Consider simplifying your process.'
  },
  {
    id: 'plan_adherence_critical',
    condition: (reflection) => reflection.plan_adherence_percentage < 50,
    severity: 'critical',
    title: 'Critical Plan Deviation',
    description: 'You\'re significantly deviating from your trading plan, which poses serious risk to your account.',
    icon: <XCircle className="h-4 w-4" />,
    recommendation: 'Stop trading until you can consistently follow your plan. Review and update your trading rules if needed.'
  },
  {
    id: 'bias_accuracy_low',
    condition: (reflection) => reflection.bias_accuracy_percentage < 60,
    severity: 'warning',
    title: 'Low Bias Accuracy',
    description: 'Your trades are not aligning well with your daily bias, suggesting poor market reading or execution.',
    icon: <TrendingDown className="h-4 w-4" />,
    recommendation: 'Review your bias selection process and ensure trades align with your market hypothesis.'
  },
  {
    id: 'session_discipline_low',
    condition: (reflection) => reflection.session_discipline_percentage < 60,
    severity: 'warning',
    title: 'Poor Session Discipline',
    description: 'You\'re trading in inappropriate sessions, which can lead to increased risk and poor performance.',
    icon: <Info className="h-4 w-4" />,
    recommendation: 'Stick to your designated trading sessions and avoid trading during low-liquidity periods.'
  },
  {
    id: 'high_losses',
    condition: (reflection) => reflection.net_r_multiple < -2,
    severity: 'critical',
    title: 'High Daily Losses',
    description: 'You\'ve incurred significant losses today, exceeding safe risk management limits.',
    icon: <AlertTriangle className="h-4 w-4" />,
    recommendation: 'Stop trading immediately and review your risk management. Consider reducing position sizes.'
  },
  {
    id: 'overtrading',
    condition: (reflection) => reflection.total_trades > 10,
    severity: 'warning',
    title: 'Potential Overtrading',
    description: 'You\'ve taken many trades today, which may indicate impulsive or emotional trading.',
    icon: <Info className="h-4 w-4" />,
    recommendation: 'Focus on quality over quantity. Wait for high-probability setups before entering trades.'
  }
];

export function GuardrailAlerts({ reflection }: GuardrailAlertsProps) {
  const triggeredAlerts = ALERT_RULES.filter(rule => rule.condition(reflection));
  
  if (triggeredAlerts.length === 0) {
    return null;
  }

  const criticalAlerts = triggeredAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = triggeredAlerts.filter(alert => alert.severity === 'warning');

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map((alert) => (
              <Alert key={alert.id} variant="destructive">
                <div className="flex items-start space-x-2">
                  {alert.icon}
                  <div className="flex-1">
                    <AlertTitle className="text-red-800">{alert.title}</AlertTitle>
                    <AlertDescription className="text-red-700">
                      {alert.description}
                    </AlertDescription>
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Warning Alerts ({warningAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warningAlerts.map((alert) => (
              <Alert key={alert.id} className="border-yellow-300 bg-yellow-100">
                <div className="flex items-start space-x-2">
                  {alert.icon}
                  <div className="flex-1">
                    <AlertTitle className="text-yellow-800">{alert.title}</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      {alert.description}
                    </AlertDescription>
                    <div className="mt-2 p-2 bg-yellow-200 rounded text-sm text-yellow-800">
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats for Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today's Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${reflection.avg_emotional_score >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                {reflection.avg_emotional_score.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Emotional Score</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${reflection.plan_adherence_percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.round(reflection.plan_adherence_percentage)}%
              </div>
              <div className="text-xs text-muted-foreground">Plan Adherence</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${reflection.net_r_multiple >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reflection.net_r_multiple.toFixed(2)}R
              </div>
              <div className="text-xs text-muted-foreground">R Multiple</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reflection.total_trades}
              </div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Immediate Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {criticalAlerts.length > 0 && (
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Stop trading immediately</span>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Review and adjust approach</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Take time to reflect and plan tomorrow</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
