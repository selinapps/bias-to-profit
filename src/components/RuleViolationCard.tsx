import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Target, 
  Shield, 
  TrendingUp, 
  X,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import type { RuleViolation } from '@/types/discipline';

interface RuleViolationCardProps {
  violation: RuleViolation;
  onAcknowledge?: (violationId: string, notes: string) => void;
  onResolve?: (violationId: string) => void;
}

export function RuleViolationCard({ violation, onAcknowledge, onResolve }: RuleViolationCardProps) {
  const [acknowledgmentNotes, setAcknowledgmentNotes] = React.useState('');
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);

  const getViolationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      setup_violation: <Target className="h-4 w-4" />,
      sl_movement: <Shield className="h-4 w-4" />,
      risk_exceeded: <AlertTriangle className="h-4 w-4" />,
      house_money_violation: <TrendingUp className="h-4 w-4" />,
      three_losses_violation: <X className="h-4 w-4" />
    };
    return icons[type] || <AlertTriangle className="h-4 w-4" />;
  };

  const getViolationTitle = (type: string) => {
    const titles: Record<string, string> = {
      setup_violation: 'Setup Violation',
      sl_movement: 'Stop Loss Movement',
      risk_exceeded: 'Risk Exceeded',
      house_money_violation: 'House Money Violation',
      three_losses_violation: 'Three Losses Rule Violation'
    };
    return titles[type] || 'Rule Violation';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'major':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'minor':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return;
    
    setIsAcknowledging(true);
    try {
      await onAcknowledge(violation.id, acknowledgmentNotes);
      setAcknowledgmentNotes('');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;
    await onResolve(violation.id);
  };

  return (
    <Card className={`border-l-4 ${
      violation.severity === 'critical' ? 'border-l-red-500' :
      violation.severity === 'major' ? 'border-l-orange-500' :
      'border-l-yellow-500'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getViolationIcon(violation.violation_type)}
            <span>{getViolationTitle(violation.violation_type)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getSeverityColor(violation.severity)}
            >
              {violation.severity.toUpperCase()}
            </Badge>
            {violation.is_acknowledged && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Acknowledged
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Violation Description */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Description:</p>
          <p className="text-sm">{violation.violation_description}</p>
        </div>

        {/* Context Information */}
        {(violation.trade_context && Object.keys(violation.trade_context).length > 0) && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Trade Context:</p>
            <div className="bg-muted/50 p-3 rounded text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(violation.trade_context, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {(violation.violation_context && Object.keys(violation.violation_context).length > 0) && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Violation Context:</p>
            <div className="bg-muted/50 p-3 rounded text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(violation.violation_context, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Acknowledgment Notes */}
        {violation.is_acknowledged && violation.acknowledgment_notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Acknowledgment Notes:</p>
            <p className="text-sm bg-green-50 p-3 rounded">{violation.acknowledgment_notes}</p>
          </div>
        )}

        {/* Actions */}
        {!violation.is_acknowledged && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Acknowledgment Notes (Optional)
              </label>
              <Textarea
                placeholder="Add notes about this violation and how you'll prevent it in the future..."
                value={acknowledgmentNotes}
                onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
              >
                {isAcknowledging ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-2" />
                    Acknowledge
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {violation.is_acknowledged && !violation.resolved_at && onResolve && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResolve}
            >
              <CheckCircle className="h-3 w-3 mr-2" />
              Mark as Resolved
            </Button>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Day {violation.day_number}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{new Date(violation.violation_date).toLocaleDateString()}</span>
            </div>
          </div>
          {violation.resolved_at && (
            <Badge variant="outline" className="bg-green-50 text-green-600">
              Resolved
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}