import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Camera, TrendingUp, TrendingDown, Lock, Zap, Shield, X, Upload, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useChallenge } from '@/hooks/useChallenge';
import { format } from 'date-fns';
import { getActiveSession, type TradingSession } from '@/lib/tradingSessions';
import { BiasStateCard } from './BiasStateCard';
import { SessionPatternTracker } from './SessionPatternTracker';
import { SessionPatternBadge } from './SessionPatternBadge';
import { useSessionPatterns } from '@/hooks/useSessionPatterns';
import { useBiasStateForDate } from '@/hooks/useBiasStateForDate';
import { HistoricalBiasModal } from './HistoricalBiasModal';
import type { BiasStateSnapshot, BiasQuizResult } from '@/types/bias';
import { MODELS_BY_STATE, getExecutionModelChecklist, getExecutionModelLabel, type ExecutionModel } from '@/lib/executionModels';
import { getPipValueConfig, calculateDirectionalPips, validateTradeDirection, calculateEstimatedProfit } from '@/lib/tradingCalculations';
import { logger } from '@/lib/logger';

interface AddTradeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  biasState?: BiasStateSnapshot | null;
  onRequestBiasEdit?: () => void;
  refreshTrades?: () => void;
  presetDate?: Date | null;
  onManageSetups?: () => void;
}
const LOCATIONS = ['LVN', 'POC', 'OB', 'FVG', 'IFVG', 'Breaker'] as const;
const AGGRESSION_TYPES = ['Big Print', 'Imbalance', 'Delta Push', 'Absorption', 'Exhaustion'] as const;
const SCENARIOS = ['Move to BE', 'BE Hit', 'Partial @X', 'Full TP', 'Manual Exit', 'Re-entry', 'News', 'Slippage'] as const;
const EXTERNALS = ['Sleep<6h', 'Distraction', 'Family stress', 'Illness', 'Caffeine'] as const;
const MISTAKE_TAGS = ['Overtrade', 'FOMO', 'Chased', 'Skipped Aggression', 'Fought Balance'] as const;
const ALL_ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'] as const;

const RISK_TIERS = {
  a: 100,
  b: 50,
  c: 25
};

export function AddTradeBottomSheet({ isOpen, onClose, biasState, onRequestBiasEdit, refreshTrades, presetDate, onManageSetups }: AddTradeBottomSheetProps) {
  const { user } = useAuth();
  const { addTrade, canAddTrade, dailyLosses } = useTradesOptimized();
  const { settings } = useSettings();
  const { toast } = useToast();
  const { currentPattern, updatePattern, scenario } = useSessionPatterns();
  const { activeChallenge, challengeSummary, validateTrade, getPhaseStatus } = useChallenge();

  // Use date-specific bias hook when presetDate is provided
  // FIXED: Use useMemo to prevent creating new Date() on every render
  const targetDate = useMemo(() => presetDate || new Date(), [presetDate]);
  const dateSpecificBias = useBiasStateForDate(targetDate);
  const [dateSpecificBiasState, setDateSpecificBiasState] = useState<BiasStateSnapshot | null>(null);
  const [showHistoricalBiasModal, setShowHistoricalBiasModal] = useState(false);
  
  // Handler for entry time changes
  const handleEntryTimeChange = useCallback(async (newDate: Date) => {
    console.log('🔄 handleEntryTimeChange CALLED');
    console.log('  Input newDate:', newDate);
    console.log('  Current entryTime state:', entryTime);
    
    setEntryTime(newDate);
    console.log('  ✅ setEntryTime called with:', newDate);
    
    const session = getActiveSession(newDate);
    setCurrentSession(session);
    console.log('  ✅ setCurrentSession called with:', session);
    
    // Update bias state for the new date if it's different from current date
    const currentDate = new Date();
    const isHistoricalDate = format(newDate, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd');
    console.log('  Is historical date?', isHistoricalDate);
    console.log('  New date formatted:', format(newDate, 'yyyy-MM-dd'));
    console.log('  Current date formatted:', format(currentDate, 'yyyy-MM-dd'));
    
    if (isHistoricalDate) {
      // For historical dates, load bias for that specific date
      console.log('  📥 Loading bias for historical date...');
      try {
        const dayKey = format(newDate, 'yyyy-MM-dd');
        console.log('  Day key:', dayKey);
        
        const { data, error } = await supabase
          .from('bias_state')
          .select('*')
          .eq('active', true)
          .eq('day_key', dayKey)
          .order('selected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('  Supabase query result:', { data, error });

        if (!error && data) {
          const biasSnapshot = {
            id: data.id ? String(data.id) : undefined,
            day_key: data.day_key || undefined,
            bias: (data.bias || 'NONE') as any,
            market_state: (data.market_state || null) as any,
            confidence: (data.confidence || null) as any,
            tags: data.tags ? (Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : null) : null,
            selected_at: data.selected_at || data.created_at,
          };
          console.log('  ✅ Setting date-specific bias state:', biasSnapshot);
          setDateSpecificBiasState(biasSnapshot);
        } else {
          console.log('  ℹ️ No bias found for this date, clearing state');
          setDateSpecificBiasState(null);
        }
      } catch (error) {
        console.error('  ❌ Error loading bias for historical date:', error);
        logger.error('Error loading bias for historical date:', error);
        setDateSpecificBiasState(null);
      }
    } else {
      // For current date, clear date-specific bias and use current bias
      console.log('  ℹ️ Current date - clearing date-specific bias state');
      setDateSpecificBiasState(null);
    }
    
    console.log('✅ handleEntryTimeChange COMPLETE');
  }, []);

  const [entryTime, setEntryTime] = useState(() => {
    const now = new Date();
    // Convert to local time by adjusting for timezone offset
    const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    console.log('🎯 Initial entryTime state:', localTime);
    return localTime;
  });
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(getActiveSession());

  // Debug: Track entryTime state changes
  useEffect(() => {
    console.log('📊 entryTime STATE UPDATED:', entryTime);
  }, [entryTime]);

  // Debug: Track currentSession state changes
  useEffect(() => {
    console.log('📊 currentSession STATE UPDATED:', currentSession);
  }, [currentSession]);

  // Debug: Track dateSpecificBiasState changes
  useEffect(() => {
    console.log('📊 dateSpecificBiasState STATE UPDATED:', dateSpecificBiasState);
  }, [dateSpecificBiasState]);

  // Form state
  const [asset, setAsset] = useState<string>(settings.preferredAssets[0] || 'EURUSD');
  const [selectedSetup, setSelectedSetup] = useState<string>(''); // Using setup instead of model
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [locations, setLocations] = useState<string[]>([]);
  const [aggression, setAggression] = useState<string[]>([]);
  const [riskTier, setRiskTier] = useState<'a' | 'b' | 'c'>(settings.defaultRiskTier);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [externals, setExternals] = useState<string[]>([]);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ text: string; checked: boolean }[]>([]);
  
  // Price levels
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [lotSize, setLotSize] = useState<string>('1.00');
  
  // Psychology
  const [emotions, setEmotions] = useState({
    calm_stressed: 5,
    focus: 7,
    urge_recover: 3
  });
  
  // Other
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [isExperimental, setIsExperimental] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [autoCalculateLotSize, setAutoCalculateLotSize] = useState(true);
  
  // Loading state
  const [submitting, setSubmitting] = useState(false);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOverride, setShowOverride] = useState(false);
  
  // Challenge-related state
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [phaseStatus, setPhaseStatus] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [antiHeroWarning, setAntiHeroWarning] = useState<string>('');

  // Real-time calculations
  const riskAmount = settings.customRiskAmounts[riskTier];
  const entryNum = parseFloat(entryPrice) || 0;
  const stopNum = parseFloat(stopLoss) || 0;
  const targetNum = parseFloat(target) || 0;
  const lotSizeNum = parseFloat(lotSize) || 0;
  
  // Get pip value for the selected asset (based on real broker data)
  // Get pip configuration for asset (use centralized logic)
  const { pipMultiplier, pipValuePerLot } = getPipValueConfig(asset);
  
  // Calculate directional pips using proper logic
  const { riskPips, rewardPips } = entryNum > 0 && stopNum > 0 && targetNum > 0 
    ? calculateDirectionalPips(entryNum, stopNum, targetNum, direction, asset)
    : { riskPips: 0, rewardPips: 0 };
  
  // Validate trade direction logic
  const validation = entryNum > 0 && stopNum > 0 && targetNum > 0
    ? validateTradeDirection(entryNum, stopNum, targetNum, direction)
    : { isValid: true, errors: [] };
  
  // Auto-calculate lot size based on risk amount and stop distance (FIXED LOGIC)
  const calculateLotSize = () => {
    if (entryNum > 0 && stopNum > 0 && riskAmount > 0 && riskPips > 0) {
      // Calculate lot size: risk amount / (risk pips * pip value per lot)
      const calculatedLotSize = riskAmount / (riskPips * pipValuePerLot);
      return Math.max(0.01, Math.round(calculatedLotSize * 100) / 100); // Minimum 0.01 lot
    }
    return 1.0;
  };

  const autoCalculatedLotSize = calculateLotSize();
  
  // Update lot size when entry, stop, or risk changes (only if auto-calculate is enabled)
  useEffect(() => {
    if (autoCalculateLotSize && entryNum > 0 && stopNum > 0 && riskAmount > 0) {
      setLotSize(autoCalculatedLotSize.toString());
    }
  }, [entryNum, stopNum, riskAmount, asset, autoCalculateLotSize, autoCalculatedLotSize]);

  // Use calculated lot size for R Multiple and profit calculations (this is what will be used for the trade)
  const effectiveLotSize = autoCalculateLotSize ? autoCalculatedLotSize : lotSizeNum;
  
  // Calculate estimated profit using directional logic with effective lot size
  const estimatedProfit = entryNum > 0 && targetNum > 0 && effectiveLotSize > 0 
    ? calculateEstimatedProfit(entryNum, targetNum, effectiveLotSize, direction, asset)
    : 0;
  
  // Calculate R Multiple using CORRECT method: Estimated Profit / Risk Amount
  const rMultiple = riskAmount > 0 && estimatedProfit !== 0 ? 
    Number((estimatedProfit / riskAmount).toFixed(3)) : 0;

  // Challenge-related calculations
  const isBuildPhase = phaseStatus?.phase === 'BUILD';
  const isLocked = phaseStatus?.isLocked;
  const allowedRiskAmounts = isBuildPhase ? [250, 500] : [100, 250, 500, 1000];
  const isRiskAllowed = allowedRiskAmounts.includes(riskAmount);
  
  // Anti-Hero trade detection
  const distanceToPass = challengeSummary?.distanceToPass || 0;
  const isAntiHeroTrade = distanceToPass > (2.5 * riskAmount) && rMultiple > 2.5;

  // Determine which bias state to use - check if entry date is historical
  const currentBiasState = useMemo(() => {
    const isHistoricalDate = format(entryTime, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
    console.log('🎯 Determining bias state:', {
      entryDate: format(entryTime, 'yyyy-MM-dd'),
      todayDate: format(new Date(), 'yyyy-MM-dd'),
      isHistoricalDate,
      dateSpecificBiasState: dateSpecificBiasState ? `${dateSpecificBiasState.bias} (${dateSpecificBiasState.market_state})` : 'null',
      currentBiasState: biasState ? `${biasState.bias} (${biasState.market_state})` : 'null',
      using: isHistoricalDate ? 'dateSpecificBiasState' : 'biasState'
    });
    return isHistoricalDate ? dateSpecificBiasState : biasState;
  }, [entryTime, dateSpecificBiasState, biasState]);

  // Simplified validation - no longer checking bias/model restrictions
  const checklistComplete = checklistItems.length > 0 && checklistItems.every(item => item.checked);
  const baseFormValid = Boolean(entryPrice && stopLoss && asset && locations.length > 0 && aggression.length > 0 && selectedChallengeId && selectedSetup);
  const challengeValid = !validationError && !isLocked && isRiskAllowed;
  const canConfirmEntry = baseFormValid && checklistComplete && challengeValid;

  // Reset form
  const resetForm = () => {
    setAsset(settings.preferredAssets[0] || 'EURUSD');
    setSelectedSetup('');
    setDirection('long');
    setLocations([]);
    setAggression([]);
    setRiskTier(settings.defaultRiskTier);
    setScenarios([]);
    setExternals([]);
    setMistakeTags([]);
    setChecklistItems([]);
    setEntryPrice('');
    setStopLoss('');
    setTarget('');
    setLotSize('1.00');
    setEmotions({ calm_stressed: 5, focus: 7, urge_recover: 3 });
    setScreenshotUrl('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setNotes('');
    setIsExperimental(false);
    setOverrideReason('');
    setShowOverride(false);
    setAutoCalculateLotSize(true);
    setSelectedChallengeId(activeChallenge?.id || '');
    setValidationError('');
    setAntiHeroWarning('');
    const now = new Date();
    setEntryTime(now);
    setCurrentSession(getActiveSession(now));
  };

  // Set default challenge when active challenge changes
  useEffect(() => {
    if (activeChallenge && !selectedChallengeId) {
      setSelectedChallengeId(activeChallenge.id);
    } else if (!activeChallenge) {
      // No active challenge - this is normal for new users
      setSelectedChallengeId('');
    }
  }, [activeChallenge, selectedChallengeId]);

  // Fetch phase status when challenge changes
  useEffect(() => {
    if (selectedChallengeId) {
      getPhaseStatus(selectedChallengeId).then(setPhaseStatus);
    }
  }, [selectedChallengeId, getPhaseStatus]);

  // Validate trade in real-time
  useEffect(() => {
    if (selectedChallengeId && entryNum > 0 && stopNum > 0 && targetNum > 0) {
      validateTrade(selectedChallengeId, riskAmount, targetNum, entryNum, stopNum)
        .then(result => {
          setValidationError(result.errorMessage || '');
          setAntiHeroWarning(result.warningMessage || '');
        });
    } else {
      setValidationError('');
      setAntiHeroWarning('');
    }
  }, [selectedChallengeId, entryNum, stopNum, targetNum, riskAmount, validateTrade]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) return;

    // Check stop rule
    if (!canAddTrade && !overrideReason) {
      setShowOverride(true);
      return;
    }

    if (!baseFormValid) {
      toast({
        title: "Invalid Form",
        description: "Please fill in all required fields including setup selection",
        variant: "destructive"
      });
      return;
    }

    if (!checklistComplete) {
      toast({
        title: "Checklist incomplete",
        description: "Confirm each checklist item before entering.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload screenshot if provided
      let finalScreenshotUrl = screenshotUrl;
      if (screenshot) {
        const uploadedUrl = await uploadScreenshot();
        if (uploadedUrl) {
          finalScreenshotUrl = uploadedUrl;
        }
      }

      const checklistPayload = checklistItems.map(item => ({ text: item.text, checked: item.checked }));
      const setup = settings.customSetups.find(s => s.id === selectedSetup);
      const finalLocations = (() => {
        const base = [...locations];
        if (setup?.name && !base.includes(setup.name)) base.unshift(setup.name);
        return base;
      })();
      const goodActions = [] as string[];
      const mistakeTagsFinal = [...mistakeTags];
      if (checklistItems.length > 0) {
        if (checklistItems.every(i => i.checked)) {
          goodActions.push('Plan Followed');
        } else if (!mistakeTagsFinal.includes('Plan Not Followed')) {
          mistakeTagsFinal.push('Plan Not Followed');
        }
      }
      
      // Get session at trade entry time for tracking
      const tradeDate = entryTime;
      const sessionAtTradeTime = getActiveSession(tradeDate);

      await addTrade({
        asset,
        model: 'trend', // Use 'trend' as default (DB constraint only allows 'trend' or 'mean_reversion')
        direction,
        locations: finalLocations,
        aggression,
        risk_tier: riskTier,
        risk_amount: riskAmount,
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        exit_price: target ? parseFloat(target) : null,
        entry_time: entryTime.toISOString(),
        trading_session: sessionAtTradeTime?.name || null,
        scenarios,
        emotions,
        externals,
        good_actions: goodActions.length > 0 ? goodActions : null,
        mistake_tags: mistakeTagsFinal,
        screenshot_url: finalScreenshotUrl || null,
        notes: (notes || setup?.name || null),
        is_experimental: isExperimental,
        override_reason: overrideReason || null,
        lot_size: parseFloat(lotSize) || 1.0,
        challenge_id: selectedChallengeId
      });

      toast({
        title: "Trade Added",
        description: "Your trade has been logged successfully. Check the 'Trades' tab to manage it.",
        variant: "default"
      });

      resetForm();
      onClose();
      
      // Refresh the trades list to show the new trade immediately
      if (refreshTrades) {
        refreshTrades();
      }
    } catch (error: any) {
      logger.error('Error adding trade:', error);
      console.error('Full error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast({
        title: "Error",
        description: error?.message || "Failed to add trade. Please try again.",
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

  const toggleChecklist = (index: number) => {
    setChecklistItems(items =>
      items.map((item, idx) =>
        idx === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // Screenshot handling functions
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
      setScreenshotUrl(''); // Clear URL when file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot) return null;

    setIsUploading(true);
    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `trade-entry_${Date.now()}.${fileExt}`;
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
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    setScreenshotUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const setup = settings.customSetups.find(s => s.id === selectedSetup);
    if (setup?.checklist && setup.checklist.length > 0) {
      setChecklistItems(setup.checklist.map(text => ({ text, checked: false })));
    } else {
      setChecklistItems([]);
    }
  }, [selectedSetup, settings.customSetups]);

  // Removed bias-based model restriction logic - setups are now independent of bias state

  useEffect(() => {
    console.log('🔁 isOpen useEffect triggered - isOpen:', isOpen);
    if (isOpen) {
      if (presetDate) {
        console.log('  Setting preset date:', presetDate);
        setEntryTime(presetDate);
        setCurrentSession(getActiveSession(presetDate));
        
        // Load bias state for the specific date
        dateSpecificBias.loadBiasForDate().then(bias => {
          setDateSpecificBiasState(bias);
        }).catch(error => {
          logger.error('Error loading bias for date:', error);
        });
      } else {
        const now = new Date();
        console.log('  Setting current time (no preset):', now);
        setEntryTime(now);
        setCurrentSession(getActiveSession(now));
        
        // Clear date-specific bias state when using current date
        setDateSpecificBiasState(null);
      }
    }
  }, [isOpen, presetDate]); // FIXED: Removed dateSpecificBias from dependencies to prevent infinite loop

  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const formattedLocalTime = format(entryTime, 'MMM d, yyyy • HH:mm');
  const formattedEstTime = estFormatter.format(entryTime);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-trading-card border-trading-border">
        <SheetHeader className="sticky top-0 bg-trading-card/95 backdrop-blur-sm pb-4 border-b border-trading-border">
          <SheetTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-trading-accent" />
            Add New Trade
          </SheetTitle>
          <SheetDescription className="text-trading-muted">
            Log your trade details quickly and efficiently
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-muted/10 border-trading-border">
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-trading-muted">Entry time</p>
                  <p className="text-lg font-semibold text-foreground">{formattedLocalTime}</p>
                  <p className="text-xs text-trading-muted">EST: {formattedEstTime}</p>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs text-trading-muted">Adjust entry date and time</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="entry-date" className="text-xs text-trading-muted">Date</Label>
                      <Input
                        id="entry-date"
                        type="date"
                        value={format(entryTime, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          console.log('🗓️ DATE INPUT CHANGED');
                          console.log('  Current entryTime:', entryTime);
                          console.log('  Input value:', e.target.value);
                          
                          const dateValue = e.target.value;
                          if (dateValue) {
                            const [year, month, day] = dateValue.split('-').map(Number);
                            console.log('  Parsed date:', { year, month, day });
                            
                            const newDate = new Date(entryTime);
                            console.log('  Before setFullYear:', newDate);
                            newDate.setFullYear(year, month - 1, day);
                            console.log('  After setFullYear:', newDate);
                            console.log('  Calling handleEntryTimeChange with:', newDate);
                            
                            handleEntryTimeChange(newDate);
                          }
                        }}
                        className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="entry-time" className="text-xs text-trading-muted">Time</Label>
                      <Input
                        id="entry-time"
                        type="time"
                        value={format(entryTime, 'HH:mm')}
                        onChange={(e) => {
                          console.log('⏰ TIME INPUT CHANGED');
                          console.log('  Current entryTime:', entryTime);
                          console.log('  Input value:', e.target.value);
                          
                          const timeValue = e.target.value;
                          if (timeValue) {
                            const [hours, minutes] = timeValue.split(':').map(Number);
                            console.log('  Parsed time:', { hours, minutes });
                            
                            const newDate = new Date(entryTime);
                            console.log('  Before setHours:', newDate);
                            newDate.setHours(hours, minutes, 0, 0);
                            console.log('  After setHours:', newDate);
                            console.log('  Calling handleEntryTimeChange with:', newDate);
                            
                            handleEntryTimeChange(newDate);
                          }
                        }}
                        className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEntryTimeChange(new Date())}
                      className="text-xs h-8 flex-1"
                    >
                      Now
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEntryTimeChange(new Date(Date.now() - 5 * 60 * 1000))}
                      className="text-xs h-8 flex-1"
                    >
                      -5min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEntryTimeChange(new Date(Date.now() - 15 * 60 * 1000))}
                      className="text-xs h-8 flex-1"
                    >
                      -15min
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEntryTimeChange(new Date(Date.now() - 60 * 60 * 1000))}
                      className="text-xs h-8 flex-1"
                    >
                      -1hr
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          <Card className="bg-muted/10 border-trading-border">
            <div className="space-y-3 p-4">
              <BiasStateCard
                value={currentBiasState ?? undefined}
                onEdit={() => {
                  // Check if current entry time is a historical date
                  const currentDate = new Date();
                  const isHistoricalDate = format(entryTime, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd');
                  
                  if (isHistoricalDate) {
                    setShowHistoricalBiasModal(true);
                  } else {
                    onRequestBiasEdit?.();
                  }
                }}
                isCompact
              />
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-[0.18em] text-trading-muted">
                  {(() => {
                    const currentDate = new Date();
                    const isHistoricalDate = format(entryTime, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd');
                    return isHistoricalDate ? 'Bias Snapshot for Trade Date' : 'Current Session Snapshot';
                  })()}
                </p>
                {(() => {
                  const currentDate = new Date();
                  const isHistoricalDate = format(entryTime, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd');
                  return isHistoricalDate && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      This bias will be saved with the trade for {format(entryTime, 'MMM dd, yyyy')}
                    </p>
                  );
                })()}
                {(() => {
                  // Show session based on the actual trade time, not current time
                  const sessionAtTradeTime = getActiveSession(entryTime);
                  return sessionAtTradeTime ? (
                    <div className="mt-1 space-y-1 text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="relative inline-flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-sm font-semibold">{sessionAtTradeTime.name}</span>
                        {presetDate && (
                          <span className="text-xs text-slate-400">
                            ({format(entryTime, 'HH:mm')})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-trading-muted">
                        {presetDate ? format(entryTime, 'HH:mm:ss') : sessionAtTradeTime.localTime}
                      </p>
                      {sessionAtTradeTime.priceHint && (
                        <p className="text-xs text-trading-accent font-medium mt-1">{sessionAtTradeTime.priceHint}</p>
                      )}
                      {sessionAtTradeTime.description && (
                        <p className="text-xs text-muted-foreground mt-1">{sessionAtTradeTime.description}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-trading-muted">
                      No active session {presetDate ? `at ${format(entryTime, 'HH:mm')}` : 'detected'}
                    </p>
                  );
                })()}
              </div>
              
              {/* Session Pattern Badge */}
              {scenario && scenario.scenario !== 'none' && (
                <div className="mt-3">
                  <SessionPatternBadge 
                    scenario={scenario.scenario}
                    confidence={scenario.confidence}
                    isLive={!!currentSession}
                  />
                </div>
              )}
            </div>
          </Card>
          </div>

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

          {/* Session Pattern Tracker */}
          <SessionPatternTracker
            currentPattern={currentPattern ? {
              asia_behavior: currentPattern.asia_behavior,
              london_behavior: currentPattern.london_behavior,
              ny_behavior: currentPattern.ny_behavior,
              notes: currentPattern.notes || undefined
            } : undefined}
            onPatternChange={updatePattern}
          />

          {/* Asset & Basic Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-trading-card/95 backdrop-blur-sm border-trading-border">
                  {settings.preferredAssets.length > 0 ? (
                    <>
                      {settings.preferredAssets.map(a => (
                        <SelectItem key={a} value={a} className="hover:bg-trading-accent/20 focus:bg-trading-accent/20">{a}</SelectItem>
                      ))}
                      <div className="border-t border-trading-border my-1" />
                      {ALL_ASSETS.filter(a => !settings.preferredAssets.includes(a)).map(a => (
                        <SelectItem key={a} value={a} className="hover:bg-trading-accent/20 focus:bg-trading-accent/20">{a}</SelectItem>
                      ))}
                    </>
                  ) : (
                    ALL_ASSETS.map(a => (
                      <SelectItem key={a} value={a} className="hover:bg-trading-accent/20 focus:bg-trading-accent/20">{a}</SelectItem>
                    ))
                  )}
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

          {/* Setup Selection */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Setup</Label>
              {onManageSetups && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onManageSetups}
                  className="text-xs text-trading-muted hover:text-foreground"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Setups
                </Button>
              )}
            </div>
            <Select value={selectedSetup} onValueChange={setSelectedSetup}>
              <SelectTrigger className="h-12 text-lg rounded-xl border border-slate-700 bg-slate-900/60">
                <SelectValue placeholder="Choose your setup..." />
              </SelectTrigger>
              <SelectContent className="bg-trading-card/95 backdrop-blur-sm border-trading-border text-sm">
                {settings.customSetups.map(setup => (
                  <SelectItem key={setup.id} value={setup.id} className="py-2 hover:bg-trading-accent/20 focus:bg-trading-accent/20">
                    <div>
                      <div className="font-medium">{setup.name}</div>
                      {setup.description && (
                        <div className="text-xs text-trading-muted">{setup.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Challenge Selection */}
          {activeChallenge && (
            <div>
              <Label>Challenge *</Label>
              <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Select challenge" />
                </SelectTrigger>
                <SelectContent className="bg-trading-card/95 backdrop-blur-sm border-trading-border">
                  <SelectItem value={activeChallenge.id} className="hover:bg-trading-accent/20 focus:bg-trading-accent/20">
                    {challengeSummary?.challengeName || `${activeChallenge.prop_firm} - Phase ${activeChallenge.phase}`}
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Phase Status Display */}
              {phaseStatus && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {phaseStatus.phase === 'BUILD' && <Zap className="h-4 w-4 text-orange-500" />}
                      {phaseStatus.phase === 'NORMAL' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                      {phaseStatus.phase === 'PRESERVATION' && <Shield className="h-4 w-4 text-green-500" />}
                      {phaseStatus.phase === 'LOCKED' && <Lock className="h-4 w-4 text-red-500" />}
                      <span className="font-medium">{phaseStatus.phase}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {phaseStatus.buildProgress} • {phaseStatus.stopLossCount}
                    </div>
                  </div>
                  {phaseStatus.bankedAmount > 0 && (
                    <div className="mt-1 text-sm text-green-600">
                      🏦 Banked: ${phaseStatus.bankedAmount}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Challenge Validation Errors */}
          {validationError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Trade Blocked</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{validationError}</p>
            </div>
          )}

          {/* Anti-Hero Trade Warning */}
          {antiHeroWarning && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Anti-Hero Trade Detected</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{antiHeroWarning}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setTarget(((entryNum + stopNum) / 2).toFixed(4))}>
                  1:2 Target
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTarget((entryNum + (entryNum - stopNum) * 2.5).toFixed(4))}>
                  1:2.5 Target
                </Button>
              </div>
            </div>
          )}

          {/* Setup Checklist - Show if setup has checklist */}
          {checklistItems.length > 0 && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Entry Checklist</span>
                <span className="text-xs text-slate-400">{checklistItems.filter(item => item.checked).length}/{checklistItems.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {checklistItems.map((item, index) => (
                  <label key={item.text} className="flex items-start gap-3 text-sm text-slate-200">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklist(index)}
                      className="mt-0.5"
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
            {isBuildPhase && (
              <div className="mt-1 mb-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-orange-600">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Build Phase Active</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Risk capped at $250 or $500 only
                </p>
              </div>
            )}
            <div className="flex gap-2 mt-1">
              {Object.entries(settings.customRiskAmounts).map(([tier, amount]) => {
                const isAllowed = allowedRiskAmounts.includes(amount);
                return (
                  <Button
                    key={tier}
                    type="button"
                    variant={riskTier === tier ? 'default' : 'outline'}
                    className={`flex-1 h-12 ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => isAllowed && setRiskTier(tier as 'a' | 'b' | 'c')}
                    disabled={!isAllowed}
                  >
                    {tier.toUpperCase()} (${amount})
                    {!isAllowed && <Lock className="h-3 w-3 ml-1" />}
                  </Button>
                );
              })}
            </div>
            {!isRiskAllowed && riskAmount > 0 && (
              <p className="mt-1 text-xs text-red-600">
                Risk amount ${riskAmount} not allowed in {phaseStatus?.phase} phase
              </p>
            )}
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
                  inputMode="decimal"
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
                  inputMode="decimal"
                  placeholder="1.0950"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="target">Target Price (optional)</Label>
              <Input
                id="target"
                type="number"
                step="0.0001"
                inputMode="decimal"
                placeholder="1.1050"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            {/* Lot Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="lot-size">Lot Size ({asset}: ${pipValuePerLot}/pip)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-calculate-lot"
                    checked={autoCalculateLotSize}
                    onChange={(e) => setAutoCalculateLotSize(e.target.checked)}
                    className="rounded border-trading-border"
                  />
                  <Label htmlFor="auto-calculate-lot" className="text-sm text-trading-muted">
                    Auto-calculate
                  </Label>
                </div>
              </div>
              <Input
                id="lot-size"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="1.00"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="h-12 text-lg"
                disabled={autoCalculateLotSize}
              />
              {lotSize && parseFloat(lotSize) > 0 && (
                <div className="text-sm text-trading-muted space-y-1">
                  <div>Pip Value: ${(effectiveLotSize * pipValuePerLot).toFixed(2)}</div>
                  {autoCalculateLotSize && entryNum > 0 && stopNum > 0 && (
                    <div className="text-xs text-blue-400">
                      Auto-calculated from ${riskAmount} risk and {riskPips.toFixed(1)} pips
                    </div>
                  )}
                </div>
              )}
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
                    <div className={`text-2xl font-bold ${estimatedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${estimatedProfit.toFixed(2)}
                    </div>
                    <div className="text-sm text-trading-muted">Est. Profit</div>
                  </div>
                </div>
                
                {/* Validation Errors */}
                {!validation.isValid && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="text-sm text-destructive font-medium">Trade Direction Issues:</div>
                    {validation.errors.map((error, index) => (
                      <div key={index} className="text-xs text-destructive mt-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Trade Summary */}
                {entryNum > 0 && stopNum > 0 && effectiveLotSize > 0 && (
                  <div className="mt-3 pt-3 border-t border-trading-border">
                    <div className="text-sm text-trading-muted space-y-1">
                      <div>Risk: ${riskAmount.toFixed(2)} | Stop: {riskPips.toFixed(1)} pips | Lot: {effectiveLotSize.toFixed(2)}</div>
                      {targetNum > 0 && (
                        <div className="text-xs">
                          Reward: {rewardPips.toFixed(1)} pips | R/R: {riskPips > 0 ? (rewardPips / riskPips).toFixed(1) : '0'}:1
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
              <Label htmlFor="screenshot">Screenshot</Label>
              
              {/* Screenshot Preview */}
              {screenshotPreview && (
                <div className="relative mb-3">
                  <img 
                    src={screenshotPreview} 
                    alt="Screenshot preview" 
                    className="w-full h-32 object-cover rounded border border-trading-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={removeScreenshot}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* File Upload or URL Input */}
              <div className="flex gap-2 mt-1">
                <Input
                  id="screenshot"
                  placeholder={screenshot ? "File selected" : "https://..."}
                  value={screenshotUrl}
                  onChange={(e) => {
                    setScreenshotUrl(e.target.value);
                    if (e.target.value) {
                      setScreenshot(null);
                      setScreenshotPreview(null);
                    }
                  }}
                  className="h-12"
                  disabled={!!screenshot}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Upload className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-trading-muted mt-1">
                Upload image (max 5MB) or paste URL
              </p>
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
          {/* Challenge Status Summary */}
          {phaseStatus && (
            <div className="mb-3 p-2 rounded-lg bg-muted/50 border text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {phaseStatus.phase === 'BUILD' && <Zap className="h-4 w-4 text-orange-500" />}
                  {phaseStatus.phase === 'NORMAL' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                  {phaseStatus.phase === 'PRESERVATION' && <Shield className="h-4 w-4 text-green-500" />}
                  {phaseStatus.phase === 'LOCKED' && <Lock className="h-4 w-4 text-red-500" />}
                  <span className="font-medium">{phaseStatus.phase}</span>
                </div>
                <div className="text-muted-foreground">
                  {phaseStatus.buildProgress} • {phaseStatus.stopLossCount}
                </div>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={!canConfirmEntry || submitting || isLocked}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {submitting ? 'Saving...' : 
             isLocked ? 'Trading Locked' :
             !challengeValid ? 'Fix Validation Issues' :
             'Confirm Entry'}
          </Button>
          
          {!canConfirmEntry && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {!baseFormValid && 'Fill required fields (including setup) • '}
              {!checklistComplete && 'Complete checklist • '}
              {!challengeValid && 'Fix challenge validation'}
            </div>
          )}
        </div>
      </SheetContent>
      
      {/* Historical Bias Modal */}
      <HistoricalBiasModal
        isOpen={showHistoricalBiasModal}
        onClose={() => setShowHistoricalBiasModal(false)}
        targetDate={entryTime}
        onBiasSet={(bias) => {
          // Update the local bias state
          setDateSpecificBiasState({
            id: undefined,
            day_key: format(entryTime, 'yyyy-MM-dd'),
            bias: bias.bias,
            market_state: bias.market_state,
            confidence: bias.confidence,
            tags: bias.tags,
            selected_at: new Date().toISOString()
          });
        }}
      />
    </Sheet>
  );
}
