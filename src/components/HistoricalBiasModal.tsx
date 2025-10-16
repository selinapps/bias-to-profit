import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBiasStateForDate } from '@/hooks/useBiasStateForDate';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { BiasQuizResult } from '@/types/bias';

interface HistoricalBiasModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: Date;
  onBiasSet?: (bias: BiasQuizResult) => void;
}

export function HistoricalBiasModal({ isOpen, onClose, targetDate, onBiasSet }: HistoricalBiasModalProps) {
  const { toast } = useToast();
  const biasHook = useBiasStateForDate(targetDate);
  const [loading, setLoading] = useState(false);
  const [biasData, setBiasData] = useState<BiasQuizResult>({
    bias: 'FLAT',
    market_state: 'UNCLEAR',
    confidence: null,
    tags: []
  });

  useEffect(() => {
    if (isOpen) {
      // Load existing bias for the date
      biasHook.loadBiasForDate().then(bias => {
        if (bias) {
          setBiasData({
            bias: bias.bias,
            market_state: bias.market_state || 'UNCLEAR',
            confidence: bias.confidence || null,
            tags: bias.tags || []
          });
        }
      }).catch(error => {
        logger.error('Error loading bias for date:', error);
      });
    }
  }, [isOpen, biasHook]);

  const handleSave = async () => {
    if (!biasData.bias || biasData.bias === 'FLAT') {
      toast({
        title: "Bias Required",
        description: "Please select a bias before saving.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await biasHook.saveBiasForDate(biasData);
      toast({
        title: "Bias Saved",
        description: `Bias set for ${format(targetDate, 'MMM dd, yyyy')}`,
        variant: "default"
      });
      onBiasSet?.(biasData);
      onClose();
    } catch (error: any) {
      logger.error('Error saving bias for date:', error);
      
      // Check if it's an enum error
      const errorMessage = error?.message || String(error);
      const isEnumError = errorMessage.includes('invalid input value for enum') || 
                          errorMessage.includes('market_state_enum') ||
                          error?.code === '22P02';
      
      if (isEnumError) {
        toast({
          title: "Database Update Required",
          description: "Your database needs to be updated. Please run the latest Supabase migrations in your project's SQL Editor:\n\nsupabase/migrations/20251013000000_fix_market_state_enum.sql",
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save bias. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await biasHook.clearBiasForDate();
      setBiasData({
        bias: 'FLAT',
        market_state: 'UNCLEAR',
        confidence: null,
        tags: []
      });
      toast({
        title: "Bias Cleared",
        description: `Bias cleared for ${format(targetDate, 'MMM dd, yyyy')}`,
        variant: "default"
      });
      onClose();
    } catch (error) {
      logger.error('Error clearing bias for date:', error);
      toast({
        title: "Error",
        description: "Failed to clear bias. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-hidden={false}>
        <DialogHeader>
          <DialogTitle>Set Bias for {format(targetDate, 'MMM dd, yyyy')}</DialogTitle>
          <DialogDescription>
            Set the market bias and state for this historical date. This bias will be saved with any trades logged for {format(targetDate, 'MMM dd, yyyy')}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bias">Bias</Label>
            <Select
              value={biasData.bias}
              onValueChange={(value) => setBiasData(prev => ({ ...prev, bias: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OOB_LONG">OOB Long</SelectItem>
                <SelectItem value="OOB_SHORT">OOB Short</SelectItem>
                <SelectItem value="MR_LONG">MR Long</SelectItem>
                <SelectItem value="MR_SHORT">MR Short</SelectItem>
                <SelectItem value="FLAT">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="market-state">Market State</Label>
            <Select
              value={biasData.market_state}
              onValueChange={(value) => setBiasData(prev => ({ ...prev, market_state: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select market state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OUT_OF_BALANCE">Out of Balance</SelectItem>
                <SelectItem value="IN_BALANCE">In Balance</SelectItem>
                <SelectItem value="UNCLEAR">Unclear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidence">Confidence</Label>
            <Select
              value={biasData.confidence || 'NONE'}
              onValueChange={(value) => setBiasData(prev => ({ ...prev, confidence: value === 'NONE' ? null : (value as any) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select confidence level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !biasData.bias || biasData.bias === 'FLAT'}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Bias'}
            </Button>
            <Button
              onClick={handleClear}
              disabled={loading}
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
