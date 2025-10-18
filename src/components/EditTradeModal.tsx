import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { format } from 'date-fns';
import { Edit, Save, X, AlertTriangle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Trade = Database['public']['Tables']['trades']['Row'];

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
}

const ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'];
const MODELS = ['trend', 'mean_reversion'];
const DIRECTIONS = ['long', 'short'];
const RISK_TIERS = ['a', 'b', 'c'];

export function EditTradeModal({ isOpen, onClose, trade }: EditTradeModalProps) {
  const { updateTrade, refreshTrades } = useTradesOptimized();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [asset, setAsset] = useState('');
  const [model, setModel] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [riskTier, setRiskTier] = useState<'a' | 'b' | 'c'>('a');
  const [riskAmount, setRiskAmount] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [pnl, setPnl] = useState('');
  const [rMultiple, setRMultiple] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [notes, setNotes] = useState('');
  const [tradingSession, setTradingSession] = useState('');
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [emotions, setEmotions] = useState({
    calm_stressed: 5,
    focus: 7,
    urge_recover: 3
  });

  // Initialize form with trade data
  useEffect(() => {
    if (trade && isOpen) {
      setAsset(trade.asset || '');
      setModel(trade.model || '');
      setDirection((trade.direction as 'long' | 'short') || 'long');
      setRiskTier((trade as any).risk_tier || 'a');
      setRiskAmount(String((trade as any).risk_amount || ''));
      setEntryPrice(String(trade.entry_price || ''));
      setStopLoss(String(trade.stop_loss || ''));
      setExitPrice(String(trade.exit_price || ''));
      setLotSize(String((trade as any).lot_size || '1.0'));
      setPnl(String(trade.pnl || ''));
      setRMultiple(String(trade.r_multiple || ''));
      setEntryTime(trade.entry_time ? format(new Date(trade.entry_time), "yyyy-MM-dd'T'HH:mm") : '');
      setExitTime(trade.exit_time ? format(new Date(trade.exit_time), "yyyy-MM-dd'T'HH:mm") : '');
      setNotes(trade.notes || '');
      setTradingSession(trade.trading_session || '');
      setMistakeTags((trade as any).mistake_tags || []);
      
      if (trade.emotions && typeof trade.emotions === 'object') {
        setEmotions({
          calm_stressed: (trade.emotions as any).calm_stressed || 5,
          focus: (trade.emotions as any).focus || 7,
          urge_recover: (trade.emotions as any).urge_recover || 3
        });
      }
      
      setHasChanges(false);
    }
  }, [trade, isOpen]);

  // Track changes
  useEffect(() => {
    if (trade) {
      const tradeEntryTime = trade.entry_time ? format(new Date(trade.entry_time), "yyyy-MM-dd'T'HH:mm") : '';
      const tradeExitTime = trade.exit_time ? format(new Date(trade.exit_time), "yyyy-MM-dd'T'HH:mm") : '';
      
      const hasFormChanges = 
        asset !== (trade.asset || '') ||
        model !== (trade.model || '') ||
        direction !== (trade.direction || 'long') ||
        riskTier !== ((trade as any).risk_tier || 'a') ||
        riskAmount !== String((trade as any).risk_amount || '') ||
        entryPrice !== String(trade.entry_price || '') ||
        stopLoss !== String(trade.stop_loss || '') ||
        exitPrice !== String(trade.exit_price || '') ||
        lotSize !== String((trade as any).lot_size || '1.0') ||
        pnl !== String(trade.pnl || '') ||
        rMultiple !== String(trade.r_multiple || '') ||
        entryTime !== tradeEntryTime ||
        exitTime !== tradeExitTime ||
        notes !== (trade.notes || '') ||
        tradingSession !== (trade.trading_session || '');
      
      setHasChanges(hasFormChanges);
    }
  }, [asset, model, direction, riskTier, riskAmount, entryPrice, stopLoss, exitPrice, lotSize, pnl, rMultiple, entryTime, exitTime, notes, tradingSession, trade]);

  const handleSave = async () => {
    if (!trade) return;

    setLoading(true);
    try {
      const updates = {
        asset,
        model,
        direction,
        risk_tier: riskTier,
        risk_amount: parseFloat(riskAmount) || 0,
        entry_price: parseFloat(entryPrice) || 0,
        stop_loss: parseFloat(stopLoss) || 0,
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        lot_size: parseFloat(lotSize) || 1.0,
        pnl: pnl ? parseFloat(pnl) : null,
        r_multiple: rMultiple ? parseFloat(rMultiple) : null,
        entry_time: entryTime ? new Date(entryTime).toISOString() : trade.entry_time,
        exit_time: exitTime ? new Date(exitTime).toISOString() : trade.exit_time,
        notes: notes || null,
        trading_session: tradingSession || null,
        mistake_tags: mistakeTags,
        emotions: emotions
      };

      await updateTrade(trade.id, updates);
      
      // Refresh trades to ensure UI updates
      await refreshTrades();
      
      toast({
        title: "Trade Updated",
        description: "Trade has been successfully updated.",
        variant: "default"
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMistakeTag = (tag: string) => {
    setMistakeTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const MISTAKE_TAGS = ['Overtrade', 'FOMO', 'Chased', 'Skipped Aggression', 'Fought Balance'];

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Trade - {trade.asset} {trade.direction}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Trade Info */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSETS.map(assetOption => (
                        <SelectItem key={assetOption} value={assetOption}>
                          {assetOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map(modelOption => (
                        <SelectItem key={modelOption} value={modelOption}>
                          {modelOption.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={(value) => setDirection(value as 'long' | 'short')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map(dir => (
                        <SelectItem key={dir} value={dir}>
                          {dir}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Risk Tier</Label>
                  <Select value={riskTier} onValueChange={(value) => setRiskTier(value as 'a' | 'b' | 'c')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_TIERS.map(tier => (
                        <SelectItem key={tier} value={tier}>
                          Tier {tier.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Levels */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Price Levels</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Entry Price</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stop Loss</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exit Price</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lot Size</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Risk Amount</Label>
                  <Input
                    type="number"
                    step="1"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>P&L</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>R-Multiple</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={rMultiple}
                    onChange={(e) => setRMultiple(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trading Session</Label>
                  <Input
                    value={tradingSession}
                    onChange={(e) => setTradingSession(e.target.value)}
                    placeholder="e.g., London, New York"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Timing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entry Time</Label>
                  <Input
                    type="datetime-local"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:contrast-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exit Time</Label>
                  <Input
                    type="datetime-local"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:contrast-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Psychology & Mistakes */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Psychology & Mistakes</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Mistake Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MISTAKE_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={mistakeTags.includes(tag) ? "destructive" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleMistakeTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this trade..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                You have unsaved changes
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
