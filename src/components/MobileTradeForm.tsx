import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTradeFormProps {
  tradeForm: {
    asset: string;
    side: 'Long' | 'Short';
    model: string;
    entry: string;
    stop: string;
    target: string;
    risk: string;
    lotSize: string;
    notes: string;
    datetime: string;
  };
  setTradeForm: (form: any) => void;
  availableModels: any[];
  preferredAssets: string[];
  allAssets: string[];
  entryChecklist: Record<string, boolean>;
  setEntryChecklist: (checklist: Record<string, boolean>) => void;
  tradingRules: Record<string, string[]>;
  selectedModel: string;
  isFormValid: boolean;
  onAddTrade: () => void;
  onClearForm: () => void;
  isMobile: boolean;
  enableHapticFeedback: () => void;
  pips: number;
  riskReward: number;
}

export function MobileTradeForm({
  tradeForm,
  setTradeForm,
  availableModels,
  preferredAssets,
  allAssets,
  entryChecklist,
  setEntryChecklist,
  tradingRules,
  selectedModel,
  isFormValid,
  onAddTrade,
  onClearForm,
  isMobile,
  enableHapticFeedback,
  pips,
  riskReward
}: MobileTradeFormProps) {
  const handleFormChange = (field: string, value: any) => {
    if (isMobile) {
      enableHapticFeedback();
    }
    setTradeForm({ ...tradeForm, [field]: value });
  };

  const handleChecklistChange = (key: string, checked: boolean) => {
    if (isMobile) {
      enableHapticFeedback();
    }
    setEntryChecklist({ ...entryChecklist, [key]: checked });
  };

  const handleAddTrade = () => {
    if (isMobile) {
      enableHapticFeedback();
    }
    onAddTrade();
  };

  const handleClearForm = () => {
    if (isMobile) {
      enableHapticFeedback();
    }
    onClearForm();
  };

  if (isMobile) {
    return (
      <Card className="bg-gradient-card border-trading-border shadow-trading">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
            New Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile-optimized form layout */}
          <div className="space-y-4">
            {/* Asset and Side Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Asset *</Label>
                <Select value={tradeForm.asset} onValueChange={(value) => handleFormChange('asset', value)}>
                  <SelectTrigger className="bg-input border-trading-border h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-trading-border">
                    {preferredAssets.map(asset => (
                      <SelectItem key={asset} value={asset}>
                        <span className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {asset}
                        </span>
                      </SelectItem>
                    ))}
                    {allAssets.filter(asset => !preferredAssets.includes(asset)).map(asset => (
                      <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Side *</Label>
                <Select value={tradeForm.side} onValueChange={(value: 'Long' | 'Short') => handleFormChange('side', value)}>
                  <SelectTrigger className="bg-input border-trading-border h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-trading-border">
                    <SelectItem value="Long">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" />
                        Long
                      </span>
                    </SelectItem>
                    <SelectItem value="Short">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-3 w-3" />
                        Short
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-trading-muted">Model *</Label>
              <Select value={tradeForm.model} onValueChange={(value) => handleFormChange('model', value)}>
                <SelectTrigger className="bg-input border-trading-border h-10">
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-trading-border">
                  {availableModels.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Levels */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Entry *</Label>
                <Input
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  placeholder="Entry price"
                  value={tradeForm.entry}
                  onChange={(e) => handleFormChange('entry', e.target.value)}
                  className="bg-input border-trading-border h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Stop *</Label>
                <Input
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  placeholder="Stop price"
                  value={tradeForm.stop}
                  onChange={(e) => handleFormChange('stop', e.target.value)}
                  className="bg-input border-trading-border h-10"
                />
              </div>
            </div>

            {/* Target and Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Target</Label>
                <Input
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  placeholder="Target price"
                  value={tradeForm.target}
                  onChange={(e) => handleFormChange('target', e.target.value)}
                  className="bg-input border-trading-border h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">Risk $ *</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  placeholder="250"
                  value={tradeForm.risk}
                  onChange={(e) => handleFormChange('risk', e.target.value)}
                  className="bg-input border-trading-border h-10"
                />
              </div>
            </div>

            {/* Lot Size */}
            <div className="space-y-2">
              <Label className="text-xs text-trading-muted">Lot Size (EURUSD: $60/pip)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="1.00"
                value={tradeForm.lotSize}
                onChange={(e) => handleFormChange('lotSize', e.target.value)}
                className="bg-input border-trading-border h-10"
              />
              {tradeForm.lotSize && parseFloat(tradeForm.lotSize) > 0 && (
                <div className="text-xs text-trading-muted">
                  Pip Value: ${(parseFloat(tradeForm.lotSize) * 60).toFixed(2)}
                </div>
              )}
            </div>

            {/* Risk Info */}
            <div className="flex justify-between text-xs text-trading-muted bg-secondary/20 p-2 rounded">
              <span>Risk: {pips} pips</span>
              <span>R:R = {riskReward || '—'}</span>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs text-trading-muted">Notes</Label>
              <Input
                placeholder="Setup description, confirmation signals..."
                value={tradeForm.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="bg-input border-trading-border h-10"
              />
            </div>

            {/* Entry Checklist for Mobile */}
            {selectedModel && tradingRules[selectedModel] && (
              <div className="space-y-3 pt-2 border-t border-trading-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-trading-accent uppercase tracking-wider">
                    Entry Checklist
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {Object.values(entryChecklist).filter(Boolean).length}/{tradingRules[selectedModel].length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tradingRules[selectedModel].map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                      <Checkbox
                        id={`mobile_rule_${idx}`}
                        checked={entryChecklist[`rule_${idx}`] || false}
                        onCheckedChange={(checked) => handleChecklistChange(`rule_${idx}`, !!checked)}
                        className="mt-1"
                      />
                      <label htmlFor={`mobile_rule_${idx}`} className="text-xs leading-relaxed cursor-pointer flex-1">
                        {rule}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="trading"
                onClick={handleAddTrade}
                disabled={!isFormValid}
                className="flex-1 h-12 text-sm font-medium"
              >
                Add Trade
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearForm}
                className="h-12 px-4"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop version (fallback to original layout)
  return null;
}
