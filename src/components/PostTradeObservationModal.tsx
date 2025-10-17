import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Target, Activity } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Trade = Database['public']['Tables']['trades']['Row'];

interface PostTradeObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onSuccess?: () => void;
}

export function PostTradeObservationModal({ isOpen, onClose, trade, onSuccess }: PostTradeObservationModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [observationType, setObservationType] = useState<'post_stop' | 'post_target'>('post_target');
  const [observationTime, setObservationTime] = useState<string>('1h');
  const [priceAction, setPriceAction] = useState<string>('');
  const [peakPrice, setPeakPrice] = useState<string>('');
  const [observationNotes, setObservationNotes] = useState<string>('');

  const resetForm = () => {
    setObservationType('post_target');
    setObservationTime('1h');
    setPriceAction('');
    setPeakPrice('');
    setObservationNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!user || !trade || !priceAction || !peakPrice) {
      toast({
        title: "Missing Information",
        description: "Please fill in price action and peak price.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate pips_moved and r_moved
      const entryPrice = Number(trade.entry_price);
      const stopLoss = Number(trade.stop_loss);
      const peakPriceNum = Number(peakPrice);
      
      const pipMultiplier = trade.asset?.includes('JPY') ? 100 : 10000;
      let pipsMoved = 0;
      let rMoved = 0;

      if (trade.direction === 'long') {
        pipsMoved = (peakPriceNum - entryPrice) * pipMultiplier;
      } else {
        pipsMoved = (entryPrice - peakPriceNum) * pipMultiplier;
      }

      const riskInPips = Math.abs((entryPrice - stopLoss) * pipMultiplier);
      if (riskInPips > 0) {
        rMoved = pipsMoved / riskInPips;
      }

      // Insert observation
      const { error } = await supabase
        .from('post_trade_observations')
        .insert({
          user_id: user.id,
          trade_id: trade.id,
          observation_type: observationType,
          observation_time: observationTime,
          price_action: priceAction,
          peak_price: peakPriceNum,
          pips_moved: pipsMoved,
          r_moved: rMoved,
          notes: observationNotes || null,
          observed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "✅ Observation Saved",
        description: `Post-trade observation recorded successfully. Price moved ${rMoved.toFixed(2)}R.`
      });

      logger.info('Post-trade observation saved', { 
        trade_id: trade.id, 
        observation_type: observationType,
        r_moved: rMoved 
      });

      resetForm();
      onSuccess?.();
      onClose();

    } catch (error) {
      logger.error('Error saving post-trade observation:', error);
      toast({
        title: "Error",
        description: "Failed to save observation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-trading-card border-trading-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5 text-cyan-400" />
            Add Post-Trade Observation
          </DialogTitle>
          <DialogDescription className="text-trading-muted">
            Track what happened after your exit to improve future decisions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Trade Info */}
          <Card className="p-4 bg-gradient-to-br from-blue-950/30 to-purple-950/30 border-blue-500/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-trading-muted">Asset:</span>{' '}
                <span className="font-semibold">{trade.asset}</span>
              </div>
              <div>
                <span className="text-trading-muted">Direction:</span>{' '}
                <span className={trade.direction === 'long' ? 'text-green-400' : 'text-red-400'}>
                  {trade.direction?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-trading-muted">Entry:</span>{' '}
                <span className="font-semibold">{trade.entry_price}</span>
              </div>
              <div>
                <span className="text-trading-muted">Exit:</span>{' '}
                <span className="font-semibold">{trade.exit_price}</span>
              </div>
            </div>
          </Card>

          {/* Observation Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">What happened after your exit?</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={observationType === 'post_stop' ? 'default' : 'outline'}
                onClick={() => setObservationType('post_stop')}
                className={observationType === 'post_stop' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <Shield className="h-4 w-4 mr-2" />
                After Stop Hit
              </Button>
              <Button
                type="button"
                variant={observationType === 'post_target' ? 'default' : 'outline'}
                onClick={() => setObservationType('post_target')}
                className={observationType === 'post_target' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Target className="h-4 w-4 mr-2" />
                After Target Hit
              </Button>
            </div>
          </div>

          {/* Observation Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">When did you check?</Label>
            <Select value={observationTime} onValueChange={setObservationTime}>
              <SelectTrigger className="h-11 bg-trading-card border-cyan-400/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-trading-card border-trading-border">
                <SelectItem value="15m">⏱️ 15 Minutes After</SelectItem>
                <SelectItem value="1h">⏰ 1 Hour After</SelectItem>
                <SelectItem value="4h">🕐 4 Hours After</SelectItem>
                <SelectItem value="EOD">🌅 End of Day</SelectItem>
                <SelectItem value="next_day">📅 Next Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Action */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Price Action</Label>
            <Select value={priceAction} onValueChange={setPriceAction}>
              <SelectTrigger className="h-11 bg-trading-card border-cyan-400/30">
                <SelectValue placeholder="What did price do?" />
              </SelectTrigger>
              <SelectContent className="bg-trading-card border-trading-border">
                <SelectItem value="continuation">🚀 Continuation (kept moving)</SelectItem>
                <SelectItem value="reversal">🔄 Reversal (changed direction)</SelectItem>
                <SelectItem value="consolidation">↔️ Consolidation (sideways)</SelectItem>
                <SelectItem value="unclear">❓ Unclear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Peak Price */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Peak Price Reached *</Label>
            <Input
              type="number"
              step="0.00001"
              value={peakPrice}
              onChange={(e) => setPeakPrice(e.target.value)}
              placeholder="e.g., 1.1050"
              className="h-11 bg-trading-card border-cyan-400/30"
            />
            <p className="text-xs text-trading-muted">
              The highest (long) or lowest (short) price after your exit
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (Optional)</Label>
            <Textarea
              value={observationNotes}
              onChange={(e) => setObservationNotes(e.target.value)}
              placeholder="Any additional context or patterns you noticed..."
              className="min-h-[80px] bg-trading-card border-cyan-400/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!priceAction || !peakPrice || loading}
              className="flex-1 h-11 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </span>
              ) : (
                '💾 Save Observation'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

