import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  X,
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
  Percent,
  FileText,
  Save,
  Download,
  RefreshCw
} from 'lucide-react';
import type { DisciplineChallenge, DailyDisciplineForm as DailyForm } from '@/types/discipline';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DailyDisciplineFormProps {
  challenge: DisciplineChallenge;
  onRecord: (form: DailyForm) => Promise<void>;
  onCancel: () => void;
}

export function DailyDisciplineForm({ challenge, onRecord, onCancel }: DailyDisciplineFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<DailyForm>({
    followed_setup: true,
    respected_sl: true,
    respected_risk: true,
    respected_house_money: true,
    respected_3_losses: true,
    trades_taken: 0,
    profitable_trades: 0,
    losing_trades: 0,
    total_pnl: 0,
    max_risk_used: 0,
    discipline_notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [todayTrades, setTodayTrades] = useState<any[]>([]);
  const [hasImportedTrades, setHasImportedTrades] = useState(false);

  // Auto-import today's trades when component mounts
  useEffect(() => {
    importTodaysTrades();
  }, []);

  const importTodaysTrades = async () => {
    if (!user?.id) return;
    
    setIsLoadingTrades(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', `${today}T00:00:00.000Z`)
        .lt('entry_time', `${today}T23:59:59.999Z`)
        .order('entry_time', { ascending: true });

      if (error) {
        console.error('Error fetching today\'s trades:', error);
        return;
      }

      setTodayTrades(trades || []);
      
      if (trades && trades.length > 0) {
        // Auto-populate form with trade data
        const tradesTaken = trades.length;
        const profitableTrades = trades.filter(trade => trade.pnl && trade.pnl > 0).length;
        const losingTrades = trades.filter(trade => trade.pnl && trade.pnl < 0).length;
        const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const maxRiskUsed = Math.max(...trades.map(trade => trade.risk_amount || 0));

        setForm(prev => ({
          ...prev,
          trades_taken: tradesTaken,
          profitable_trades: profitableTrades,
          losing_trades: losingTrades,
          total_pnl: totalPnl,
          max_risk_used: maxRiskUsed
        }));

        setHasImportedTrades(true);
      }
    } catch (error) {
      console.error('Error importing trades:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onRecord(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRuleChange = (rule: keyof DailyForm, value: boolean) => {
    setForm(prev => ({ ...prev, [rule]: value }));
  };

  const handleNumberChange = (field: keyof DailyForm, value: string) => {
    const numValue = parseFloat(value) || 0;
    setForm(prev => ({ ...prev, [field]: numValue }));
  };

  const calculateScore = () => {
    let score = 100;
    if (!form.followed_setup) score -= 20;
    if (!form.respected_sl) score -= 20;
    if (!form.respected_risk) score -= 20;
    if (!form.respected_house_money) score -= 20;
    if (!form.respected_3_losses) score -= 20;
    return Math.max(0, score);
  };

  const score = calculateScore();
  const isPerfectDay = score === 100;

  const rules = [
    {
      key: 'followed_setup' as keyof DailyForm,
      icon: Target,
      title: 'Followed Setup',
      description: 'Only took trades that matched your predefined setup',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      key: 'respected_sl' as keyof DailyForm,
      icon: Shield,
      title: 'Respected Stop Loss',
      description: 'Never moved stop loss against you (only in your favor)',
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    },
    {
      key: 'respected_risk' as keyof DailyForm,
      icon: AlertTriangle,
      title: 'Respected Risk',
      description: `Never risked more than ${challenge.max_risk_per_trade}% per trade`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      key: 'respected_house_money' as keyof DailyForm,
      icon: TrendingUp,
      title: 'House Money Rules',
      description: `Followed house money rules when in ${challenge.house_money_threshold}% profit`,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      key: 'respected_3_losses' as keyof DailyForm,
      icon: X,
      title: 'Three Losses Rule',
      description: `Stopped trading after ${challenge.max_daily_losses} consecutive losses`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Day {challenge.current_day} Discipline Tracking
          </CardTitle>
          <p className="text-muted-foreground">
            Record your adherence to the 5 core discipline rules for today.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Discipline Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Discipline Rules</h3>
              <p className="text-sm text-muted-foreground">
                Check each rule you followed today. Each violation costs 20 points.
              </p>
              
              {rules.map((rule, index) => (
                <Card key={rule.key} className={`transition-colors ${
                  form[rule.key] ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${rule.bgColor}`}>
                        <rule.icon className={`h-4 w-4 ${rule.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Checkbox
                            checked={form[rule.key] as boolean}
                            onCheckedChange={(checked) => handleRuleChange(rule.key, checked as boolean)}
                          />
                          <h4 className="font-medium">{rule.title}</h4>
                          <Badge variant={form[rule.key] ? "default" : "destructive"}>
                            {form[rule.key] ? "Followed" : "Violated"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Auto-Imported Trades */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Today's Trades</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={importTodaysTrades}
                  disabled={isLoadingTrades}
                >
                  {isLoadingTrades ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
              
              {isLoadingTrades ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading today's trades...</p>
                </div>
              ) : todayTrades.length > 0 ? (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Download className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">
                        {todayTrades.length} trades imported from today
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-green-700">{todayTrades.length}</div>
                        <div className="text-green-600">Total Trades</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-700">
                          {todayTrades.filter(t => t.pnl && t.pnl > 0).length}
                        </div>
                        <div className="text-green-600">Winners</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-700">
                          ${todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-green-600">Total P&L</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-700">
                          {todayTrades.length > 0 
                            ? ((todayTrades.filter(t => t.pnl && t.pnl > 0).length / todayTrades.length) * 100).toFixed(0)
                            : 0}%
                        </div>
                        <div className="text-green-600">Win Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-orange-800">No trades found for today</p>
                      <p className="text-sm text-orange-600">Add some trades to see them here</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Trading Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Trading Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trades-taken">Total Trades Taken</Label>
                  <Input
                    id="trades-taken"
                    type="number"
                    min="0"
                    value={form.trades_taken}
                    onChange={(e) => handleNumberChange('trades_taken', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="profitable-trades">Profitable Trades</Label>
                  <Input
                    id="profitable-trades"
                    type="number"
                    min="0"
                    value={form.profitable_trades}
                    onChange={(e) => handleNumberChange('profitable_trades', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="losing-trades">Losing Trades</Label>
                  <Input
                    id="losing-trades"
                    type="number"
                    min="0"
                    value={form.losing_trades}
                    onChange={(e) => handleNumberChange('losing_trades', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="total-pnl">Total P&L ($)</Label>
                  <Input
                    id="total-pnl"
                    type="number"
                    step="0.01"
                    value={form.total_pnl}
                    onChange={(e) => handleNumberChange('total_pnl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="max-risk-used">Max Risk Used (%)</Label>
                  <Input
                    id="max-risk-used"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.max_risk_used}
                    onChange={(e) => handleNumberChange('max_risk_used', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="discipline-notes">Discipline Notes (Optional)</Label>
              <Textarea
                id="discipline-notes"
                placeholder="Reflect on your discipline today. What went well? What could be improved?"
                value={form.discipline_notes}
                onChange={(e) => setForm(prev => ({ ...prev, discipline_notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Score Summary */}
            <Card className={`${isPerfectDay ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPerfectDay ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <span className="font-medium">
                      {isPerfectDay ? 'Perfect Day!' : 'Room for Improvement'}
                    </span>
                  </div>
                  <Badge variant={isPerfectDay ? "default" : "secondary"} className="text-lg">
                    {score}/100
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPerfectDay 
                    ? 'Excellent discipline! Keep up the great work.'
                    : `${100 - score} points deducted for rule violations.`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Record Day {challenge.current_day}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}