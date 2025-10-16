import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  X,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Zap,
  Camera,
  Upload,
  Image as ImageIcon,
  Clock,
  Move,
  Scissors,
  Activity,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { getPipValueConfig } from '@/lib/tradingCalculations';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradeManagementData {
  movedToBreakeven?: boolean;
  movedToBEAtR?: number;
  partialCloseAt2R?: boolean;
  orderflowBasedExit?: boolean;
  trailingStopUsed?: boolean;
  finalExitReason?: string;
  maeR?: number | null;
  mfeR?: number | null;
}

interface ManageTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onCloseTrade: (
    tradeId: string, 
    exitPrice: number, 
    lessons: string, 
    mistakeTags: string[], 
    goodActions: string[], 
    screenshotUrl?: string, 
    exitTime?: string, 
    manualPnL?: number, 
    tradeManagement?: TradeManagementData
  ) => Promise<void>;
  isMobile?: boolean;
  onRefresh?: () => void;
}

const COMMON_MISTAKES = [
  '❌ Entered too early',
  '❌ Ignored stop loss',
  '❌ Overtrade after loss',
  '❌ Emotional decision',
  '❌ Missed confirmation',
  '❌ Wrong session',
  '❌ Against bias',
  '❌ Poor risk management',
  '❌ FOMO entry',
  '❌ Revenge trading',
];

const GOOD_ACTIONS = [
  '✅ Followed plan',
  '✅ Respected stop',
  '✅ Good entry timing',
  '✅ Proper risk sizing',
  '✅ Waited confirmation',
  '✅ Emotional control',
  '✅ Session aligned',
  '✅ Bias aligned',
  '✅ Scaled properly',
  '✅ Trailed stop well',
];

export function ManageTradeSheet({ 
  isOpen, 
  onClose, 
  trade, 
  onCloseTrade,
  isMobile = false,
  onRefresh
}: ManageTradeSheetProps) {
  const [exitPrice, setExitPrice] = useState('');
  const [lessons, setLessons] = useState('');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [selectedGoodActions, setSelectedGoodActions] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [manualPnL, setManualPnL] = useState<string>('');
  const [useManualPnL, setUseManualPnL] = useState(false);
  const [exitTime, setExitTime] = useState<string>('');
  
  // ✅ NEW SCHEMA: MAE/MFE Analytics
  const [maeR, setMaeR] = useState<string>('');
  const [mfeR, setMfeR] = useState<string>('');
  
  // Trade Management Options
  const [tradeManagement, setTradeManagement] = useState({
    movedToBreakeven: false,
    movedToBEAtR: 0,
    partialCloseAt2R: false,
    orderflowBasedExit: false,
    trailingStopUsed: false,
    finalExitReason: 'manual' // manual, stop_loss, take_profit, trailing_stop, orderflow
  });
  
  // ✅ PHASE 2: Post-Trade Observation State
  const [showObservation, setShowObservation] = useState(false);
  const [observationType, setObservationType] = useState<'post_stop' | 'post_target'>('post_target');
  const [observationTime, setObservationTime] = useState<string>('1h');
  const [priceAction, setPriceAction] = useState<string>('');
  const [peakPrice, setPeakPrice] = useState<string>('');
  const [observationNotes, setObservationNotes] = useState<string>('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { settings } = useSettings();
  const { user } = useAuth();

  // Merge custom tags with defaults
  const customMistakeTags = (settings as any).custom_mistake_tags || [];
  const customGoodActionTags = (settings as any).custom_good_actions || [];
  
  const mistakeTags = [...COMMON_MISTAKES, ...customMistakeTags];
  const goodActionTags = [...GOOD_ACTIONS, ...customGoodActionTags];

  // Reset state when trade changes
  useEffect(() => {
    if (trade) {
      setExitPrice('');
      setLessons('');
      setSelectedMistakes([]);
      setSelectedGoodActions([]);
      setScreenshot(null);
      setScreenshotPreview(null);
      setManualPnL('');
      setUseManualPnL(false);
      setExitTime('');
      setMaeR('');
      setMfeR('');
      setTradeManagement({
        movedToBreakeven: false,
        movedToBEAtR: 0,
        partialCloseAt2R: false,
        orderflowBasedExit: false,
        trailingStopUsed: false,
        finalExitReason: 'manual'
      });
    }
  }, [trade?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot || !trade) return null;

    setIsUploading(true);
    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${trade.id}_${Date.now()}.${fileExt}`;
      const filePath = `trade-screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trade-images')
        .upload(filePath, screenshot);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('trade-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      logger.error('Error uploading screenshot:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload screenshot. Continuing without it.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  if (!trade) return null;

  // Calculate live P&L using fixed calculation logic
  const currentPrice = parseFloat(exitPrice) || 0;
  const entryPrice = Number(trade.entry_price);
  const stopPrice = Number(trade.stop_loss);
  const lotSize = Number(trade.lot_size) || 1.0;
  
  // Calculate P&L using fixed logic (inline calculation)
  const calculatePnL = (entry: number, exit: number, direction: 'long' | 'short', lot: number, asset: string) => {
    if (entry <= 0 || exit <= 0 || lot <= 0) return { grossPnL: 0, commission: 0, netPnL: 0 };

    // Calculate price difference based on direction
    const priceDiff = direction === 'long' ? exit - entry : entry - exit;

    // Get pip configuration for asset (use centralized logic)
    const { pipMultiplier, pipValuePerLot } = getPipValueConfig(asset);

    // Calculate pips from price difference (CORRECT FORMULA)
    const pips = priceDiff / pipMultiplier;

    // Calculate gross P&L: pips * pip value * lot size
    const grossPnL = pips * pipValuePerLot * lot;

    // Calculate commission
    const commission = lot * 7.5;

    // Net P&L after commission
    const netPnL = Number((grossPnL - commission).toFixed(2));
    
    return { grossPnL, commission, netPnL };
  };
  
  const pnlResult = entryPrice > 0 && currentPrice > 0 
    ? calculatePnL(entryPrice, currentPrice, trade.direction as 'long' | 'short', lotSize, trade.asset || 'EURUSD')
    : { grossPnL: 0, commission: 0, netPnL: 0 };
  
  const { grossPnL, commission, calculatedPnL } = {
    grossPnL: pnlResult.grossPnL,
    commission: pnlResult.commission,
    calculatedPnL: pnlResult.netPnL
  };
  
  // Calculate R-Multiple using CORRECT logic: P&L / Risk Amount
  const calculateRMultiple = (pnl: number, riskAmount: number) => {
    if (riskAmount <= 0) return 0;
    return Number((pnl / riskAmount).toFixed(3));
  };
  
  const riskAmount = (trade as any).risk_amount || 500; // Default to $500 if not set
  const rMultiple = calculateRMultiple(calculatedPnL, riskAmount);
  
  // Use manual P&L if enabled, otherwise use calculated
  const estimatedPnL = useManualPnL ? parseFloat(manualPnL) || 0 : calculatedPnL;

  const formatPrice = (price: number) => {
    if (trade.asset?.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  const toggleMistake = (mistake: string) => {
    setSelectedMistakes(prev => 
      prev.includes(mistake) 
        ? prev.filter(m => m !== mistake)
        : [...prev, mistake]
    );
  };

  const toggleGoodAction = (action: string) => {
    setSelectedGoodActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const handleClose = async () => {
    if (!exitPrice || isClosing) return;

    if (!lessons.trim() && selectedMistakes.length === 0 && selectedGoodActions.length === 0 && 
        !tradeManagement.movedToBreakeven && !tradeManagement.partialCloseAt2R && 
        !tradeManagement.orderflowBasedExit && !tradeManagement.trailingStopUsed) {
      toast({
        title: "Reflection Required",
        description: "Please add at least one lesson, mistake, good action, or trade management option before closing.",
        variant: "destructive"
      });
      return;
    }

    setIsClosing(true);
    try {
      // Upload screenshot if one is selected
      let screenshotUrl: string | undefined;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot() || undefined;
      }

      // ✅ NEW SCHEMA: Include MAE/MFE and trade management data
      await onCloseTrade(
        trade.id, 
        parseFloat(exitPrice), 
        lessons,
        selectedMistakes,
        selectedGoodActions,
        screenshotUrl,
        exitTime || undefined,
        useManualPnL ? parseFloat(manualPnL) || undefined : undefined,
        {
          // Trade management
          ...tradeManagement,
          // ✅ NEW: MAE/MFE analytics
          maeR: maeR ? parseFloat(maeR) : null,
          mfeR: mfeR ? parseFloat(mfeR) : null,
        }
      );
      toast({
        title: "Trade Closed Successfully",
        description: "Your lessons have been saved for review.",
      });
      onClose();
      
      // Refresh the trades list to update the display immediately
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClosing(false);
    }
  };

  // ✅ PHASE 2: Save Post-Trade Observation
  const handleSaveObservation = async () => {
    if (!user || !trade || !priceAction || !peakPrice) {
      toast({
        title: "Missing Information",
        description: "Please fill in price action and peak price.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingObservation(true);
    try {
      const peakPriceNum = parseFloat(peakPrice);
      const exitPriceNum = Number(trade.exit_price);
      const riskAmount = trade.risk_amount || 500;
      
      // Calculate pips moved
      const { pipMultiplier, pipValuePerLot } = getPipValueConfig(trade.asset || 'EURUSD');
      let pips_moved = 0;
      
      if (trade.direction === 'long' || trade.direction === 'buy') {
        pips_moved = (peakPriceNum - exitPriceNum) / pipMultiplier;
      } else {
        pips_moved = (exitPriceNum - peakPriceNum) / pipMultiplier;
      }
      
      // Calculate R moved (dollar value of move / risk amount)
      const lotSize = Number(trade.lot_size) || 1.0;
      const dollarMove = pips_moved * pipValuePerLot * lotSize;
      const r_moved = riskAmount > 0 ? dollarMove / riskAmount : 0;

      const { error } = await supabase
        .from('post_trade_observations')
        .insert({
          trade_id: trade.id,
          user_id: user.id,
          observation_type: observationType,
          observation_time: observationTime,
          price_action: priceAction,
          peak_price: peakPriceNum,
          pips_moved: Number(pips_moved.toFixed(2)),
          r_moved: Number(r_moved.toFixed(3)),
          notes: observationNotes || null,
        });

      if (error) throw error;

      toast({
        title: "Observation Saved",
        description: `Post-trade observation recorded successfully. ${r_moved >= 0 ? `+${r_moved.toFixed(2)}R` : `${r_moved.toFixed(2)}R`} from exit.`,
        variant: "default"
      });

      // Reset observation form
      setShowObservation(false);
      setPriceAction('');
      setPeakPrice('');
      setObservationNotes('');
      
    } catch (error: any) {
      logger.error('Error saving observation:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save observation.",
        variant: "destructive"
      });
    } finally {
      setIsSavingObservation(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={`${isMobile ? 'h-[90vh] rounded-t-3xl' : 'w-full sm:max-w-lg'} 
          bg-gradient-to-br from-background via-background to-purple-950/20 
          border-t-4 border-t-trading-accent
          p-0 overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-trading-border bg-gradient-to-r from-purple-950/50 to-blue-950/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {trade.direction === 'long' ? (
                  <div className="p-2 bg-success/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                ) : (
                  <div className="p-2 bg-destructive/20 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                )}
                <div>
                  <SheetTitle className="text-2xl font-bold">{trade.asset}</SheetTitle>
                  <SheetDescription className="text-trading-muted">
                    {trade.direction.toUpperCase()} • {(Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : (trade.notes || 'Unknown'))?.replace(/_/g, ' ')}
                  </SheetDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {trade.risk_tier.toUpperCase()}
              </Badge>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Trade Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl">
                <div>
                  <Label className="text-xs text-trading-muted">Entry</Label>
                  <div className="font-mono text-lg font-bold">{formatPrice(Number(trade.entry_price))}</div>
                </div>
                <div>
                  <Label className="text-xs text-trading-muted">Stop Loss</Label>
                  <div className="font-mono text-lg font-bold text-destructive">{formatPrice(Number(trade.stop_loss))}</div>
                </div>
                <div>
                  <Label className="text-xs text-trading-muted">Risk Amount</Label>
                  <div className="font-mono text-lg font-bold text-trading-accent">${trade.risk_amount.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-xs text-trading-muted">Lot Size</Label>
                  <div className="font-mono text-lg font-bold text-trading-accent">{(trade.lot_size || 1.0).toFixed(2)}</div>
                  <div className="text-xs text-trading-muted">
                    Based on ${trade.risk_amount} risk
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-trading-muted">Session</Label>
                  <div className="text-sm font-medium">{trade.trading_session || 'N/A'}</div>
                </div>
              </div>

              <Separator className="bg-trading-border" />

              {/* Exit Price Input */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-trading-accent" />
                  <Label className="text-lg font-semibold">Exit Price</Label>
                </div>
                <Input
                  type="number"
                  step="0.00001"
                  inputMode="decimal"
                  placeholder="Enter exit price..."
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="text-2xl font-mono h-14 text-center bg-trading-card/80 text-foreground border-trading-accent/50 focus:border-trading-accent placeholder:text-trading-muted"
                />
                
                {/* Exit Time Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-trading-accent" />
                    <Label className="text-sm font-medium">Exit Time (optional)</Label>
                  </div>
                  <Input
                    type="datetime-local"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="h-12 text-base bg-trading-card/80 text-foreground border-trading-accent/50 focus:border-trading-accent placeholder:text-trading-muted"
                  />
                  
                  {/* Quick Time Presets */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        setExitTime(localTime.toISOString().slice(0, 16));
                      }}
                      className="text-xs flex-1"
                    >
                      Now
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date(Date.now() - 5 * 60 * 1000);
                        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        setExitTime(localTime.toISOString().slice(0, 16));
                      }}
                      className="text-xs flex-1"
                    >
                      -5min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date(Date.now() - 15 * 60 * 1000);
                        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        setExitTime(localTime.toISOString().slice(0, 16));
                      }}
                      className="text-xs flex-1"
                    >
                      -15min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date(Date.now() - 30 * 60 * 1000);
                        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        setExitTime(localTime.toISOString().slice(0, 16));
                      }}
                      className="text-xs flex-1"
                    >
                      -30min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date(Date.now() - 60 * 60 * 1000);
                        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        setExitTime(localTime.toISOString().slice(0, 16));
                      }}
                      className="text-xs flex-1"
                    >
                      -1hr
                    </Button>
                  </div>
                  
                  {/* Show time in EST as well */}
                  {exitTime && (
                    <div className="text-xs text-trading-muted">
                      EST: {new Date(exitTime).toLocaleString('en-US', { 
                        timeZone: 'America/New_York',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  )}
                </div>
                
                {/* Live P&L Display */}
                {currentPrice > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-purple-950/30 to-blue-950/30 rounded-xl border border-trading-accent/30">
                      <div className="text-center">
                        <div className="text-xs text-trading-muted mb-1">Estimated P&L</div>
                        <div className={`text-2xl font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </div>
                        <div className="text-xs text-trading-muted">
                          Gross: ${grossPnL.toFixed(2)} | Comm: -${commission.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-trading-muted mb-1">R Multiple</div>
                        <div className="text-2xl font-bold text-trading-accent">
                          {rMultiple.toFixed(2)}R
                        </div>
                      </div>
                    </div>
                    
                    {/* Manual P&L Override */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="manual-pnl"
                          checked={useManualPnL}
                          onChange={(e) => setUseManualPnL(e.target.checked)}
                          className="rounded border-trading-border"
                        />
                        <Label htmlFor="manual-pnl" className="text-sm text-trading-muted">
                          Override P&L calculation
                        </Label>
                      </div>
                      {useManualPnL && (
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="Enter actual P&L..."
                          value={manualPnL}
                          onChange={(e) => setManualPnL(e.target.value)}
                          className="h-10 text-center font-mono bg-trading-card/80 text-foreground border-trading-accent/50 focus:border-trading-accent placeholder:text-trading-muted"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-trading-border" />

              {/* ✅ NEW SCHEMA: MAE/MFE Analytics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-400" />
                  <Label className="text-lg font-semibold">Max Excursion (R)</Label>
                </div>
                <p className="text-xs text-trading-muted">
                  Track how far price moved against you (MAE) and in your favor (MFE) in R-multiples
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mae-r" className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      MAE (R)
                    </Label>
                    <Input
                      id="mae-r"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g., -0.35"
                      value={maeR}
                      onChange={(e) => setMaeR(e.target.value)}
                      className="h-10 mt-1 text-center font-mono bg-trading-card/80 text-foreground border-red-400/50 focus:border-red-400 placeholder:text-trading-muted"
                    />
                    <p className="text-xs text-trading-muted mt-1">Max drawdown (negative value)</p>
                  </div>
                  <div>
                    <Label htmlFor="mfe-r" className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      MFE (R)
                    </Label>
                    <Input
                      id="mfe-r"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g., 2.8"
                      value={mfeR}
                      onChange={(e) => setMfeR(e.target.value)}
                      className="h-10 mt-1 text-center font-mono bg-trading-card/80 text-foreground border-green-400/50 focus:border-green-400 placeholder:text-trading-muted"
                    />
                    <p className="text-xs text-trading-muted mt-1">Max profit reached (positive)</p>
                  </div>
                </div>
                
                {/* Efficiency Preview */}
                {maeR && mfeR && parseFloat(mfeR) > 0 && rMultiple !== 0 && (
                  <div className="p-3 bg-gradient-to-r from-orange-950/30 to-amber-950/30 rounded-lg border border-orange-400/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-300">Efficiency:</span>
                      <span className="text-lg font-bold text-orange-400">
                        {Math.min(1.0, rMultiple / parseFloat(mfeR)).toFixed(2)} ({(Math.min(1.0, rMultiple / parseFloat(mfeR)) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-xs text-trading-muted mt-1">
                      How well you captured the available R (r_multiple / mfe_r)
                    </p>
                  </div>
                )}
              </div>

              <Separator className="bg-trading-border" />

              {/* Trade Management Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-trading-accent" />
                  <Label className="text-lg font-semibold">Trade Management</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl">
                  {/* Breakeven Move */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="moved-to-be"
                        checked={tradeManagement.movedToBreakeven}
                        onCheckedChange={(checked) => 
                          setTradeManagement(prev => ({ ...prev, movedToBreakeven: !!checked }))
                        }
                      />
                      <Label htmlFor="moved-to-be" className="text-sm font-medium flex items-center gap-2">
                        <Move className="h-4 w-4" />
                        Moved SL to Breakeven
                      </Label>
                    </div>
                    
                    {tradeManagement.movedToBreakeven && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-xs text-trading-muted">At what R level?</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="1.0"
                          value={tradeManagement.movedToBEAtR || ''}
                          onChange={(e) => setTradeManagement(prev => ({ 
                            ...prev, 
                            movedToBEAtR: parseFloat(e.target.value) || 0 
                          }))}
                          className="h-8 text-sm bg-trading-card/80 text-foreground border-trading-accent/50 focus:border-trading-accent placeholder:text-trading-muted"
                        />
                      </div>
                    )}
                  </div>

                  {/* Partial Close */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="partial-close"
                        checked={tradeManagement.partialCloseAt2R}
                        onCheckedChange={(checked) => 
                          setTradeManagement(prev => ({ ...prev, partialCloseAt2R: !!checked }))
                        }
                      />
                      <Label htmlFor="partial-close" className="text-sm font-medium flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        Partial Close at 2R
                      </Label>
                    </div>
                  </div>

                  {/* Order Flow Exit */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="orderflow-exit"
                        checked={tradeManagement.orderflowBasedExit}
                        onCheckedChange={(checked) => 
                          setTradeManagement(prev => ({ ...prev, orderflowBasedExit: !!checked }))
                        }
                      />
                      <Label htmlFor="orderflow-exit" className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Order Flow Based Exit
                      </Label>
                    </div>
                  </div>

                  {/* Trailing Stop */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trailing-stop"
                        checked={tradeManagement.trailingStopUsed}
                        onCheckedChange={(checked) => 
                          setTradeManagement(prev => ({ ...prev, trailingStopUsed: !!checked }))
                        }
                      />
                      <Label htmlFor="trailing-stop" className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Used Trailing Stop
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Final Exit Reason */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Final Exit Reason</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'manual', label: 'Manual Close', icon: Target },
                      { value: 'stop_loss', label: 'Stop Loss Hit', icon: Shield },
                      { value: 'take_profit', label: 'Take Profit', icon: TrendingUp },
                      { value: 'trailing_stop', label: 'Trailing Stop', icon: BarChart3 },
                      { value: 'orderflow', label: 'Order Flow Signal', icon: Activity }
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={tradeManagement.finalExitReason === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTradeManagement(prev => ({ ...prev, finalExitReason: value as any }))}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-trading-border" />

              {/* Screenshot Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-400" />
                  <Label className="text-lg font-semibold">Trade Screenshot</Label>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {screenshotPreview ? (
                  <div className="relative">
                    <img 
                      src={screenshotPreview} 
                      alt="Trade screenshot preview" 
                      className="w-full h-48 object-cover rounded-lg border border-trading-border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setScreenshot(null);
                        setScreenshotPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-dashed border-2 border-blue-400/50 hover:border-blue-400 hover:bg-blue-950/20"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-blue-400" />
                      <span className="text-sm text-trading-muted">
                        Upload screenshot (optional)
                      </span>
                      <span className="text-xs text-trading-muted/70">
                        Max 5MB - JPG, PNG, GIF
                      </span>
                    </div>
                  </Button>
                )}
              </div>

              <Separator className="bg-trading-border" />

              {/* Trade Lessons / Reflection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <Label className="text-lg font-semibold">Trade Reflection</Label>
                </div>
                <Textarea
                  placeholder="What did you learn from this trade? What would you do differently next time?"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  className="min-h-24 bg-trading-card/80 text-foreground border-purple-400/50 focus:border-purple-400 resize-none placeholder:text-trading-muted"
                />
              </div>

              <Separator className="bg-trading-border" />

              {/* Quick Mistakes Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-red-400" />
                  <Label className="text-lg font-semibold">Mistakes (if any)</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mistakeTags.map((mistake) => (
                    <Button
                      key={mistake}
                      variant={selectedMistakes.includes(mistake) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleMistake(mistake)}
                      className={`text-xs transition-all ${
                        selectedMistakes.includes(mistake)
                          ? 'bg-red-600 hover:bg-red-700 border-red-400'
                          : 'hover:border-red-400 hover:bg-red-950/20'
                      }`}
                    >
                      {mistake}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="bg-trading-border" />

              {/* Good Actions Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-400" />
                  <Label className="text-lg font-semibold">What Went Well</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {goodActionTags.map((action) => (
                    <Button
                      key={action}
                      variant={selectedGoodActions.includes(action) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleGoodAction(action)}
                      className={`text-xs transition-all ${
                        selectedGoodActions.includes(action)
                          ? 'bg-green-600 hover:bg-green-700 border-green-400'
                          : 'hover:border-green-400 hover:bg-green-950/20'
                      }`}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Summary Preview */}
              {(lessons.trim() || selectedMistakes.length > 0 || selectedGoodActions.length > 0 || 
                tradeManagement.movedToBreakeven || tradeManagement.partialCloseAt2R || 
                tradeManagement.orderflowBasedExit || tradeManagement.trailingStopUsed) && (
                <div className="p-4 bg-gradient-to-br from-blue-950/30 to-purple-950/30 rounded-xl border border-blue-400/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    <Label className="text-sm font-semibold text-blue-300">Review Summary</Label>
                  </div>
                  <div className="space-y-2 text-sm text-trading-muted">
                    {lessons.trim() && (
                      <div>
                        <span className="font-semibold text-purple-300">Lessons:</span> {lessons}
                      </div>
                    )}
                    {selectedMistakes.length > 0 && (
                      <div>
                        <span className="font-semibold text-red-300">Mistakes:</span> {selectedMistakes.join(', ')}
                      </div>
                    )}
                    {selectedGoodActions.length > 0 && (
                      <div>
                        <span className="font-semibold text-green-300">Good Actions:</span> {selectedGoodActions.join(', ')}
                      </div>
                    )}
                    {(tradeManagement.movedToBreakeven || tradeManagement.partialCloseAt2R || 
                      tradeManagement.orderflowBasedExit || tradeManagement.trailingStopUsed) && (
                      <div>
                        <span className="font-semibold text-blue-300">Trade Management:</span> 
                        {tradeManagement.movedToBreakeven && ` Moved to BE${tradeManagement.movedToBEAtR > 0 ? ` at ${tradeManagement.movedToBEAtR}R` : ''}`}
                        {tradeManagement.partialCloseAt2R && ` Partial at 2R`}
                        {tradeManagement.orderflowBasedExit && ` Order flow exit`}
                        {tradeManagement.trailingStopUsed && ` Trailing stop`}
                        {` (${tradeManagement.finalExitReason.replace('_', ' ')})`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ PHASE 2: Post-Trade Observation Form */}
              {trade.status === 'closed' && (
                <div className="space-y-3">
                  <Separator className="bg-trading-border" />
                  
                  <Button
                    type="button"
                    variant={showObservation ? "default" : "outline"}
                    onClick={() => setShowObservation(!showObservation)}
                    className="w-full h-12 border-cyan-400/50 hover:border-cyan-400"
                  >
                    <Lightbulb className="h-5 w-5 mr-2" />
                    {showObservation ? 'Hide' : 'Add'} Post-Trade Observation
                  </Button>
                  
                  {showObservation && (
                    <Card className="p-4 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border-cyan-500/30">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-cyan-200 mb-3">
                            Track what price did after your exit to identify patterns
                          </p>
                        </div>

                        {/* Observation Type */}
                        <div>
                          <Label className="text-sm font-medium text-cyan-200 mb-2 block">What happened?</Label>
                          <div className="grid grid-cols-2 gap-2">
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
                        <div>
                          <Label className="text-sm font-medium text-cyan-200 mb-2 block">When did you check?</Label>
                          <Select value={observationTime} onValueChange={setObservationTime}>
                            <SelectTrigger className="h-10 bg-trading-card border-cyan-400/30">
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
                        <div>
                          <Label className="text-sm font-medium text-cyan-200 mb-2 block">Price Action</Label>
                          <Select value={priceAction} onValueChange={setPriceAction}>
                            <SelectTrigger className="h-10 bg-trading-card border-cyan-400/30">
                              <SelectValue placeholder="What did price do?" />
                            </SelectTrigger>
                            <SelectContent className="bg-trading-card border-trading-border">
                              <SelectItem value="continuation">
                                ➡️ Continuation (kept moving same direction)
                              </SelectItem>
                              <SelectItem value="reversal">
                                ↩️ Reversal (turned around)
                              </SelectItem>
                              <SelectItem value="consolidation">
                                ↔️ Consolidation (went sideways)
                              </SelectItem>
                              <SelectItem value="unclear">
                                ❓ Unclear/Choppy
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Peak Price */}
                        <div>
                          <Label htmlFor="peak-price" className="text-sm font-medium text-cyan-200">
                            Peak Price Reached
                          </Label>
                          <Input
                            id="peak-price"
                            type="number"
                            step="0.00001"
                            inputMode="decimal"
                            placeholder={trade.direction === 'long' ? "Highest price..." : "Lowest price..."}
                            value={peakPrice}
                            onChange={(e) => setPeakPrice(e.target.value)}
                            className="h-10 mt-1 text-center font-mono bg-trading-card/80 text-foreground border-cyan-400/50 focus:border-cyan-400 placeholder:text-trading-muted"
                          />
                          <p className="text-xs text-trading-muted mt-1">
                            {trade.direction === 'long' || trade.direction === 'buy' 
                              ? 'Highest price reached after exit'
                              : 'Lowest price reached after exit'}
                          </p>
                          
                          {/* Auto-calc preview */}
                          {peakPrice && trade.exit_price && (
                            <div className="mt-2 p-2 bg-cyan-950/30 rounded border border-cyan-500/30 text-xs">
                              <div className="flex justify-between">
                                <span className="text-cyan-300">Pips from exit:</span>
                                <span className="text-cyan-200 font-mono">
                                  {(() => {
                                    const { pipMultiplier } = getPipValueConfig(trade.asset || 'EURUSD');
                                    const exitPriceNum = Number(trade.exit_price);
                                    const peakPriceNum = parseFloat(peakPrice);
                                    let pips = 0;
                                    if (trade.direction === 'long' || trade.direction === 'buy') {
                                      pips = (peakPriceNum - exitPriceNum) / pipMultiplier;
                                    } else {
                                      pips = (exitPriceNum - peakPriceNum) / pipMultiplier;
                                    }
                                    return `${pips >= 0 ? '+' : ''}${pips.toFixed(1)} pips`;
                                  })()}
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-cyan-300">R from exit:</span>
                                <span className="text-cyan-200 font-mono font-bold">
                                  {(() => {
                                    const { pipMultiplier, pipValuePerLot } = getPipValueConfig(trade.asset || 'EURUSD');
                                    const exitPriceNum = Number(trade.exit_price);
                                    const peakPriceNum = parseFloat(peakPrice);
                                    const lotSize = Number(trade.lot_size) || 1.0;
                                    const riskAmount = trade.risk_amount || 500;
                                    let pips = 0;
                                    if (trade.direction === 'long' || trade.direction === 'buy') {
                                      pips = (peakPriceNum - exitPriceNum) / pipMultiplier;
                                    } else {
                                      pips = (exitPriceNum - peakPriceNum) / pipMultiplier;
                                    }
                                    const dollarMove = pips * pipValuePerLot * lotSize;
                                    const rMoved = riskAmount > 0 ? dollarMove / riskAmount : 0;
                                    return `${rMoved >= 0 ? '+' : ''}${rMoved.toFixed(2)}R`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <Label htmlFor="obs-notes" className="text-sm font-medium text-cyan-200">
                            Notes (optional)
                          </Label>
                          <Textarea
                            id="obs-notes"
                            placeholder="Any additional context..."
                            value={observationNotes}
                            onChange={(e) => setObservationNotes(e.target.value)}
                            className="mt-1 h-20 bg-trading-card/80 text-foreground border-cyan-400/50 focus:border-cyan-400 resize-none placeholder:text-trading-muted"
                          />
                        </div>

                        {/* Save Button */}
                        <Button
                          onClick={handleSaveObservation}
                          disabled={!priceAction || !peakPrice || isSavingObservation}
                          className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                        >
                          {isSavingObservation ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              Saving...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Save Observation
                            </span>
                          )}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Bottom Spacing for mobile */}
              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-trading-border bg-gradient-to-r from-purple-950/30 to-blue-950/30">
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                disabled={!exitPrice || isClosing}
                className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                size="lg"
              >
                {isClosing ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Closing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Close Trade
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 px-6 border-trading-border hover:bg-red-950/20 hover:border-red-500"
                size="lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Warning if no reflection */}
            {exitPrice && !lessons.trim() && selectedMistakes.length === 0 && selectedGoodActions.length === 0 && 
             !tradeManagement.movedToBreakeven && !tradeManagement.partialCloseAt2R && 
             !tradeManagement.orderflowBasedExit && !tradeManagement.trailingStopUsed && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Add at least one reflection or trade management option to help improve your trading
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
