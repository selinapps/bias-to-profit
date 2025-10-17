import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, Zap, CheckCircle2, Plus, Settings, Clock, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useChallenge } from '@/hooks/useChallenge';
import { format } from 'date-fns';
import { calculateDirectionalPips, getPipValueConfig, calculateEstimatedProfit } from '@/lib/tradingCalculations';
import { getActiveSession, type TradingSession } from '@/lib/tradingSessions';

interface SimplifiedAddTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onManageSetups?: () => void;
  refreshTrades?: () => void;
}

const ALL_ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'] as const;

export function SimplifiedAddTradeSheet({ isOpen, onClose, onManageSetups, refreshTrades }: SimplifiedAddTradeSheetProps) {
  const { user } = useAuth();
  const { addTrade } = useTradesOptimized();
  const { settings } = useSettings();
  const { toast } = useToast();
  const { activeChallenge } = useChallenge();

  // Form state
  const [asset, setAsset] = useState<string>(settings.preferredAssets[0] || 'EURUSD');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [selectedSetup, setSelectedSetup] = useState<string>('');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [lotSize, setLotSize] = useState<string>('1.00');
  const [riskTier, setRiskTier] = useState<'a' | 'b' | 'c'>(settings.defaultRiskTier);
  const [entryTime, setEntryTime] = useState(() => new Date());
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(() => getActiveSession());
  
  // Checklist state
  const [checklistItems, setChecklistItems] = useState<{ text: string; checked: boolean }[]>([]);
  
  // Emotion tracking state
  const [emotions, setEmotions] = useState({
    calm_stressed: 5,
    focus: 7,
    urge_recover: 3
  });
  const [showEmotions, setShowEmotions] = useState(false);
  
  // ✅ NEW SCHEMA: Confidence & Discipline
  const [confidence, setConfidence] = useState<number>(3); // Default to 3 (medium)
  const [disciplineTag, setDisciplineTag] = useState<string>('');
  
  // Loading state
  const [submitting, setSubmitting] = useState(false);

  // Update session when entry time changes
  useEffect(() => {
    const session = getActiveSession(entryTime);
    setCurrentSession(session);
  }, [entryTime]);

  // Get current setup
  const currentSetup = settings.customSetups.find(s => s.id === selectedSetup);

  // Real-time calculations
  const riskAmount = settings.customRiskAmounts[riskTier];
  const entryNum = parseFloat(entryPrice) || 0;
  const stopNum = parseFloat(stopLoss) || 0;
  const targetNum = parseFloat(target) || 0;
  const lotSizeNum = parseFloat(lotSize) || 0;
  
  const { pipMultiplier, pipValuePerLot } = getPipValueConfig(asset);
  const { riskPips, rewardPips } = entryNum > 0 && stopNum > 0 && targetNum > 0 
    ? calculateDirectionalPips(entryNum, stopNum, targetNum, direction, asset)
    : { riskPips: 0, rewardPips: 0 };
  
  const estimatedProfit = entryNum > 0 && targetNum > 0 && lotSizeNum > 0 
    ? calculateEstimatedProfit(entryNum, targetNum, lotSizeNum, direction, asset)
    : 0;
  
  const rMultiple = riskAmount > 0 && estimatedProfit !== 0 ? 
    Number((estimatedProfit / riskAmount).toFixed(3)) : 0;

  // Initialize checklist when setup changes
  useEffect(() => {
    if (currentSetup?.checklist && currentSetup.checklist.length > 0) {
      setChecklistItems(currentSetup.checklist.map(text => ({ text, checked: false })));
    } else {
      setChecklistItems([]);
    }
  }, [selectedSetup, currentSetup]);

  const toggleChecklist = (index: number) => {
    setChecklistItems(items =>
      items.map((item, idx) =>
        idx === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const checklistComplete = checklistItems.length === 0 || checklistItems.every(item => item.checked);
  const isFormValid = Boolean(
    entryPrice && 
    stopLoss && 
    target && 
    asset && 
    selectedSetup && 
    checklistComplete
    // Note: activeChallenge is optional - trades can be logged without a challenge
  );

  const resetForm = () => {
    setAsset(settings.preferredAssets[0] || 'EURUSD');
    setDirection('long');
    setSelectedSetup('');
    setEntryPrice('');
    setStopLoss('');
    setTarget('');
    setLotSize('1.00');
    setRiskTier(settings.defaultRiskTier);
    setChecklistItems([]);
    setConfidence(3);
    setDisciplineTag('');
    const now = new Date();
    setEntryTime(now);
    setCurrentSession(getActiveSession(now));
  };

  const handleSubmit = async () => {
    if (!user || !isFormValid) return;

    setSubmitting(true);

    try {
      // Get session info for ICT analysis
      const sessionAtEntry = getActiveSession(entryTime);
      const estTime = new Date(entryTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Prepare trade data - omit challenge_id if no active challenge
      const tradeData: any = {
        // Required fields
        asset,
        direction,
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        risk_tier: riskTier,
        risk_amount: riskAmount,
        model: 'trend', // Still required by DB constraint
        
        // NEW SCHEMA: Setup & Context
        setup_name: currentSetup?.name || null,  // ✅ NEW - replaces locations[0]
        session: sessionAtEntry?.name || null,   // ✅ NEW - replaces trading_session
        target_price: parseFloat(target) || null, // ✅ NEW - planned target (NOT exit_price)
        
        // Entry timing
        entry_time: entryTime.toISOString(),
        lot_size: parseFloat(lotSize) || 1.0,
        
        // Psychology & Discipline
        emotions: emotions,
        checklist_passed: checklistComplete, // ✅ NEW - based on checklist completion
        confidence: confidence || null, // ✅ NEW - 1-5 scale
        discipline_tag: disciplineTag || null, // ✅ NEW - discipline classification
        
        // Optional fields
        notes: currentSetup?.name || null,
        is_experimental: false,
        override_reason: null,
        
        // DEPRECATED - keep for backward compatibility
        locations: [currentSetup?.name || 'Custom'],
        trading_session: sessionAtEntry?.name || null,
        aggression: [],
        scenarios: [],
        externals: [],
        mistake_tags: [],
        screenshot_url: null
      };

      // Only include challenge_id if there's an active challenge
      if (activeChallenge?.id) {
        tradeData.challenge_id = activeChallenge.id;
      }

      console.log('📝 Just Journal - Submitting trade with ICT session:', {
        session: sessionAtEntry?.name,
        localTime: format(entryTime, 'HH:mm:ss'),
        estTime: format(estTime, 'HH:mm:ss'),
        dayOfWeek: format(entryTime, 'EEEE')
      });
      
      console.log('📦 Full trade data being sent:', JSON.stringify(tradeData, null, 2));
      
      await addTrade(tradeData);

      toast({
        title: "Trade Added",
        description: "Your trade has been logged successfully.",
        variant: "default"
      });

      // Explicitly call refresh to ensure UI updates
      if (refreshTrades) {
        await refreshTrades();
      }

      resetForm();
      onClose()
    } catch (error: any) {
      console.error('Error adding trade:', error);
      console.error('Error details:', {
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-700">
        <SheetHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-sm pb-4 border-b border-slate-700 z-10">
          <SheetTitle className="text-foreground flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-emerald-400" />
            Quick Trade Entry
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Just the essentials - log your trade in seconds
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Entry Time & ICT Session */}
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">Entry Time & Session</span>
              </div>
              {currentSession && (
                <Badge className={currentSession.color}>
                  {currentSession.name}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="entry-date" className="text-xs text-trading-muted">Date</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={format(entryTime, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const [year, month, day] = dateValue.split('-').map(Number);
                      const newTime = new Date(entryTime);
                      newTime.setFullYear(year, month - 1, day);
                      setEntryTime(newTime);
                    }
                  }}
                  className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-200"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entry-time" className="text-xs text-trading-muted">Time</Label>
                <Input
                  id="entry-time"
                  type="time"
                  value={format(entryTime, 'HH:mm')}
                  onChange={(e) => {
                    const timeValue = e.target.value;
                    if (timeValue) {
                      const [hours, minutes] = timeValue.split(':').map(Number);
                      const newTime = new Date(entryTime);
                      newTime.setHours(hours, minutes, 0, 0);
                      setEntryTime(newTime);
                    }
                  }}
                  className="h-10 text-sm bg-input border-trading-border text-foreground focus:border-trading-accent focus:ring-trading-accent/20 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-200"
                />
              </div>
            </div>

            {/* Enhanced Session Snapshot - Matching Advanced Journal */}
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 mt-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                Current Session Snapshot
              </p>
              {currentSession ? (
                <div className="space-y-1 text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="relative inline-flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-sm font-semibold">{currentSession.name}</span>
                    <span className="text-xs text-slate-400">
                      ({format(entryTime, 'HH:mm')})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentSession.localTime}
                  </p>
                  {currentSession.priceHint && (
                    <p className="text-xs text-blue-400 font-medium mt-1">{currentSession.priceHint}</p>
                  )}
                  {currentSession.description && (
                    <p className="text-xs text-slate-400 mt-1">{currentSession.description}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No active session detected
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntryTime(new Date())}
                className="text-xs h-8 flex-1 border-slate-700"
              >
                Now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntryTime(new Date(Date.now() - 5 * 60 * 1000))}
                className="text-xs h-8 flex-1 border-slate-700"
              >
                -5min
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntryTime(new Date(Date.now() - 15 * 60 * 1000))}
                className="text-xs h-8 flex-1 border-slate-700"
              >
                -15min
              </Button>
            </div>
          </Card>

          {/* Asset & Direction */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="h-12 text-lg bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {settings.preferredAssets.map(a => (
                    <SelectItem key={a} value={a} className="text-lg">{a}</SelectItem>
                  ))}
                  <div className="border-t border-slate-700 my-1" />
                  {ALL_ASSETS.filter(a => !settings.preferredAssets.includes(a)).map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'long' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${direction === 'long' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-slate-700'}`}
                  onClick={() => setDirection('long')}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Long
                </Button>
                <Button
                  type="button"
                  variant={direction === 'short' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${direction === 'short' ? 'bg-red-600 hover:bg-red-500' : 'border-slate-700'}`}
                  onClick={() => setDirection('short')}
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Short
                </Button>
              </div>
            </div>
          </div>

          {/* Setup Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-300">Setup</Label>
              {onManageSetups && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onManageSetups}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Setups
                </Button>
              )}
            </div>
            <Select value={selectedSetup} onValueChange={setSelectedSetup}>
              <SelectTrigger className="h-12 text-lg bg-slate-800 border-slate-700">
                <SelectValue placeholder="Choose your setup..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {settings.customSetups.map(setup => (
                  <SelectItem key={setup.id} value={setup.id} className="text-base">
                    <div>
                      <div className="font-medium">{setup.name}</div>
                      {setup.description && (
                        <div className="text-xs text-slate-400">{setup.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Setup Checklist */}
          {currentSetup && checklistItems.length > 0 && (
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-200">Setup Checklist</span>
                <Badge variant={checklistComplete ? "default" : "secondary"} className={checklistComplete ? "bg-emerald-600" : ""}>
                  {checklistItems.filter(item => item.checked).length}/{checklistItems.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <label key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklist(index)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-300">{item.text}</span>
                    {item.checked && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />}
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Price Levels */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-slate-200">Price Levels</Label>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="entry-price" className="text-sm text-slate-400">Entry *</Label>
                <Input
                  id="entry-price"
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder="1.1000"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="h-12 text-lg bg-slate-800 border-slate-700 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stop-loss" className="text-sm text-slate-400">Stop Loss *</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder="1.0950"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-12 text-lg bg-slate-800 border-slate-700 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="target" className="text-sm text-slate-400">Target *</Label>
                <Input
                  id="target"
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder="1.1050"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-12 text-lg bg-slate-800 border-slate-700 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Size & Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lot-size" className="text-sm text-slate-400">Lot Size</Label>
              <Input
                id="lot-size"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="1.00"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="h-12 text-lg bg-slate-800 border-slate-700 mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm text-slate-400 mb-1 block">Risk Tier</Label>
              <div className="flex gap-2">
                {Object.entries(settings.customRiskAmounts).map(([tier, amount]) => (
                  <Button
                    key={tier}
                    type="button"
                    variant={riskTier === tier ? 'default' : 'outline'}
                    className={`flex-1 h-12 ${riskTier === tier ? 'bg-blue-600 hover:bg-blue-500' : 'border-slate-700'}`}
                    onClick={() => setRiskTier(tier as 'a' | 'b' | 'c')}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* ✅ NEW SCHEMA: Confidence & Discipline */}
          <Card className="p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
            <div className="space-y-4">
              {/* Confidence Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-purple-200">Trade Confidence</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-400/50 text-purple-300 px-3">
                      {confidence}/5
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {confidence === 1 && "Very Low"}
                      {confidence === 2 && "Low"}
                      {confidence === 3 && "Medium"}
                      {confidence === 4 && "High"}
                      {confidence === 5 && "Very High"}
                    </span>
                  </div>
                </div>
                <Slider
                  value={[confidence]}
                  onValueChange={([val]) => setConfidence(val)}
                  min={1}
                  max={5}
                  step={1}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1 - Very Low</span>
                  <span>3 - Medium</span>
                  <span>5 - Very High</span>
                </div>
              </div>

              {/* Discipline Tag */}
              <div>
                <Label className="text-sm font-medium text-purple-200 mb-2 block">Discipline Status</Label>
                <Select value={disciplineTag} onValueChange={setDisciplineTag}>
                  <SelectTrigger className="h-11 bg-slate-800 border-purple-400/30">
                    <SelectValue placeholder="Select discipline classification (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="followed_plan">✅ Followed Plan</SelectItem>
                    <SelectItem value="fomo">😰 FOMO Entry</SelectItem>
                    <SelectItem value="revenge">😤 Revenge Trading</SelectItem>
                    <SelectItem value="impatient">⏱️ Impatient Entry</SelectItem>
                    <SelectItem value="perfect_setup">🎯 Perfect Setup</SelectItem>
                    <SelectItem value="forced">🔨 Forced Trade</SelectItem>
                    <SelectItem value="disciplined">🧘 Fully Disciplined</SelectItem>
                    <SelectItem value="emotional">😵 Emotional Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Live Calculations */}
          {entryNum > 0 && stopNum > 0 && targetNum > 0 && (
            <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {rMultiple.toFixed(2)}R
                  </div>
                  <div className="text-sm text-slate-400">Risk Multiple</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${estimatedProfit.toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-400">Est. Profit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {riskPips.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-400">Risk Pips</div>
                </div>
              </div>
              
              {/* ICT Session Info */}
              {currentSession && (
                <div className="pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>📊 ICT Session:</span>
                      <span className="text-blue-400 font-medium">{currentSession.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>⏰ Entry Time (Local):</span>
                      <span className="text-slate-300 font-mono">{format(entryTime, 'HH:mm:ss')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🌍 Entry Time (EST):</span>
                      <span className="text-slate-300 font-mono">
                        {format(new Date(entryTime.toLocaleString('en-US', { timeZone: 'America/New_York' })), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>📅 Day of Week:</span>
                      <span className="text-slate-300">{format(entryTime, 'EEEE')}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Emotion Tracker - Collapsible */}
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEmotions(!showEmotions)}
              className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-200">Emotion Tracker</span>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              {showEmotions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showEmotions && (
              <div className="mt-4 space-y-4">
                {Object.entries(emotions).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm capitalize text-slate-300">
                        {key.replace('_', ' ↔ ').replace('calm', 'Calm').replace('stressed', 'Stressed').replace('focus', 'Focus').replace('urge', 'Urge to').replace('recover', 'Recover')}
                      </Label>
                      <span className="text-sm font-bold text-emerald-400">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([val]) => setEmotions(prev => ({ ...prev, [key]: val }))}
                      min={0}
                      max={10}
                      step={1}
                      className="mb-1"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{key === 'calm_stressed' ? 'Calm' : key === 'focus' ? 'Low' : 'Low'}</span>
                      <span>{key === 'calm_stressed' ? 'Stressed' : key === 'focus' ? 'High' : 'High'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Spacer for mobile */}
          <div className="h-20" />
        </div>

        {/* Sticky Submit Button */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50"
            size="lg"
          >
            {submitting ? 'Saving...' : 
             !checklistComplete ? 'Complete Checklist' :
             'Log Trade'}
          </Button>
          
          {!isFormValid && (
            <div className="mt-2 text-xs text-slate-400 text-center">
              {!selectedSetup && 'Select a setup • '}
              {!entryPrice && 'Enter prices • '}
              {!checklistComplete && 'Complete checklist'}
            </div>
          )}
          
          {!activeChallenge && isFormValid && (
            <div className="mt-2 text-xs text-amber-400 text-center">
              ⚠️ No active challenge - trade will be logged without challenge tracking
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

