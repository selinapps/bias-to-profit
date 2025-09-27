import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Camera, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTrades } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';

interface AddTradeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODELS = ['trend', 'mean_reversion'] as const;
const LOCATIONS = ['LVN', 'POC', 'OB', 'FVG', 'IFVG', 'Breaker'] as const;
const AGGRESSION_TYPES = ['Big Print', 'Imbalance', 'Delta Push', 'Absorption', 'Exhaustion'] as const;
const SCENARIOS = ['Move to BE', 'BE Hit', 'Partial @X', 'Full TP', 'Manual Exit', 'Re-entry', 'News', 'Slippage'] as const;
const EXTERNALS = ['Sleep<6h', 'Distraction', 'Family stress', 'Illness', 'Caffeine'] as const;
const MISTAKE_TAGS = ['Overtrade', 'FOMO', 'Chased', 'Skipped Aggression', 'Fought Balance'] as const;
const ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'] as const;

const RISK_TIERS = {
  a: 100,
  b: 50,
  c: 25
};

export function AddTradeBottomSheet({ isOpen, onClose }: AddTradeBottomSheetProps) {
  const { user } = useAuth();
  const { addTrade, canAddTrade, dailyLosses } = useTrades();
  const { toast } = useToast();

  // Form state
  const [asset, setAsset] = useState<string>('EURUSD');
  const [model, setModel] = useState<'trend' | 'mean_reversion'>('trend');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [locations, setLocations] = useState<string[]>([]);
  const [aggression, setAggression] = useState<string[]>([]);
  const [riskTier, setRiskTier] = useState<'a' | 'b' | 'c'>('a');
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [externals, setExternals] = useState<string[]>([]);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  
  // Price levels
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  
  // Psychology
  const [emotions, setEmotions] = useState({
    calm_stressed: 5,
    focus: 7,
    urge_recover: 3
  });
  
  // Other
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isExperimental, setIsExperimental] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  
  // Loading state
  const [submitting, setSubmitting] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  // Real-time calculations
  const riskAmount = RISK_TIERS[riskTier];
  const entryNum = parseFloat(entryPrice) || 0;
  const stopNum = parseFloat(stopLoss) || 0;
  const exitNum = parseFloat(exitPrice) || 0;
  
  const stopDistance = Math.abs(entryNum - stopNum);
  const rMultiple = stopDistance > 0 && exitNum > 0 ? 
    Math.abs(exitNum - entryNum) / stopDistance * (direction === 'long' ? 1 : -1) : 0;
  const pnl = entryNum > 0 && exitNum > 0 ? 
    (direction === 'long' ? exitNum - entryNum : entryNum - exitNum) / entryNum * riskAmount : 0;

  // Check if form is valid
  const isFormValid = entryPrice && stopLoss && asset && locations.length > 0 && aggression.length > 0;

  // Reset form
  const resetForm = () => {
    setAsset('EURUSD');
    setModel('trend');
    setDirection('long');
    setLocations([]);
    setAggression([]);
    setRiskTier('a');
    setScenarios([]);
    setExternals([]);
    setMistakeTags([]);
    setEntryPrice('');
    setStopLoss('');
    setExitPrice('');
    setEmotions({ calm_stressed: 5, focus: 7, urge_recover: 3 });
    setScreenshotUrl('');
    setNotes('');
    setIsExperimental(false);
    setOverrideReason('');
    setShowOverride(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) return;

    // Check stop rule
    if (!canAddTrade && !overrideReason) {
      setShowOverride(true);
      return;
    }

    if (!isFormValid) {
      toast({
        title: "Invalid Form",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      await addTrade({
        asset,
        model,
        direction,
        locations,
        aggression,
        risk_tier: riskTier,
        risk_amount: riskAmount,
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        scenarios,
        emotions,
        externals,
        mistake_tags: mistakeTags,
        screenshot_url: screenshotUrl || null,
        notes: notes || null,
        is_experimental: isExperimental,
        override_reason: overrideReason || null
      });

      toast({
        title: "Trade Added",
        description: "Your trade has been logged successfully",
        variant: "default"
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding trade:', error);
      toast({
        title: "Error",
        description: "Failed to add trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Chip selection helpers
  const toggleSelection = (item: string, list: string[], setter: (list: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-trading-card border-trading-border">
        <SheetHeader className="sticky top-0 bg-trading-card pb-4 border-b border-trading-border">
          <SheetTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-trading-accent" />
            Add New Trade
          </SheetTitle>
          <SheetDescription className="text-trading-muted">
            Log your trade details quickly and efficiently
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Stop Rule Warning */}
          {!canAddTrade && (
            <Card className="border-destructive bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Day Trading Limit Reached</span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                You've hit {dailyLosses} losses today. Override requires a reason.
              </p>
              {showOverride && (
                <div className="mt-3">
                  <Label htmlFor="override-reason">Override Reason</Label>
                  <Textarea
                    id="override-reason"
                    placeholder="Explain why you're overriding the stop rule..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Asset & Basic Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={direction === 'long' ? 'default' : 'outline'}
                  className="flex-1 h-12"
                  onClick={() => setDirection('long')}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Long
                </Button>
                <Button
                  type="button"
                  variant={direction === 'short' ? 'default' : 'outline'}
                  className="flex-1 h-12"
                  onClick={() => setDirection('short')}
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Short
                </Button>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <Label>Trading Model</Label>
            <div className="flex gap-2 mt-1">
              {MODELS.map(m => (
                <Button
                  key={m}
                  type="button"
                  variant={model === m ? 'default' : 'outline'}
                  className="flex-1 h-12 capitalize"
                  onClick={() => setModel(m)}
                >
                  {m.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Location (Multi-select) */}
          <div>
            <Label>Location *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {LOCATIONS.map(loc => (
                <Badge
                  key={loc}
                  variant={locations.includes(loc) ? 'default' : 'outline'}
                  className="cursor-pointer h-10 px-4 text-sm"
                  onClick={() => toggleSelection(loc, locations, setLocations)}
                >
                  {loc}
                </Badge>
              ))}
            </div>
          </div>

          {/* Aggression (Multi-select) */}
          <div>
            <Label>Aggression Confluence *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AGGRESSION_TYPES.map(agg => (
                <Badge
                  key={agg}
                  variant={aggression.includes(agg) ? 'default' : 'outline'}
                  className="cursor-pointer h-10 px-4 text-sm"
                  onClick={() => toggleSelection(agg, aggression, setAggression)}
                >
                  {agg}
                </Badge>
              ))}
            </div>
          </div>

          {/* Risk Tier */}
          <div>
            <Label>Risk Tier</Label>
            <div className="flex gap-2 mt-1">
              {Object.entries(RISK_TIERS).map(([tier, amount]) => (
                <Button
                  key={tier}
                  type="button"
                  variant={riskTier === tier ? 'default' : 'outline'}
                  className="flex-1 h-12"
                  onClick={() => setRiskTier(tier as 'a' | 'b' | 'c')}
                >
                  {tier.toUpperCase()} (${amount})
                </Button>
              ))}
            </div>
          </div>

          {/* Price Levels */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Price Levels</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entry-price">Entry Price *</Label>
                <Input
                  id="entry-price"
                  type="number"
                  step="0.0001"
                  placeholder="1.1000"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div>
                <Label htmlFor="stop-loss">Stop Loss *</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  step="0.0001"
                  placeholder="1.0950"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="exit-price">Exit Price (optional)</Label>
              <Input
                id="exit-price"
                type="number"
                step="0.0001"
                placeholder="1.1050"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            {/* Live Calculations */}
            {entryNum > 0 && stopNum > 0 && (
              <Card className="p-4 bg-gradient-card border-trading-border">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-trading-accent">
                      {rMultiple.toFixed(2)}R
                    </div>
                    <div className="text-sm text-trading-muted">Risk Multiple</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${pnl.toFixed(2)}
                    </div>
                    <div className="text-sm text-trading-muted">P&L</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Emotions Sliders */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Psychology</Label>
            {Object.entries(emotions).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between">
                  <Label className="capitalize">{key.replace('_', ' ↔ ')}</Label>
                  <span className="text-trading-accent font-bold">{value}</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([val]) => setEmotions(prev => ({ ...prev, [key]: val }))}
                  min={0}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            ))}
          </div>

          {/* External Factors */}
          <div>
            <Label>External Factors</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EXTERNALS.map(ext => (
                <Badge
                  key={ext}
                  variant={externals.includes(ext) ? 'destructive' : 'outline'}
                  className="cursor-pointer h-10 px-4 text-sm"
                  onClick={() => toggleSelection(ext, externals, setExternals)}
                >
                  {ext}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mistake Tags */}
          <div>
            <Label>Mistake Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MISTAKE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={mistakeTags.includes(tag) ? 'destructive' : 'outline'}
                  className="cursor-pointer h-10 px-4 text-sm"
                  onClick={() => toggleSelection(tag, mistakeTags, setMistakeTags)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Screenshot & Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="screenshot">Screenshot URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="screenshot"
                  placeholder="https://..."
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  className="h-12"
                />
                <Button variant="outline" size="icon" className="h-12 w-12">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Experimental Toggle */}
          <div className="flex items-center justify-between p-4 border border-trading-border rounded-lg">
            <div>
              <Label className="text-base font-medium">Experimental Trade</Label>
              <p className="text-sm text-trading-muted">Part of hypothesis testing</p>
            </div>
            <Button
              type="button"
              variant={isExperimental ? 'default' : 'outline'}
              onClick={() => setIsExperimental(!isExperimental)}
            >
              {isExperimental ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Sticky Submit Button */}
        <div className="sticky bottom-0 bg-trading-card border-t border-trading-border p-4">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {submitting ? 'Adding Trade...' : 'Add Trade'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
