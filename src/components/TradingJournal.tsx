import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Download, FileText, RotateCcw, TrendingUp, TrendingDown, Minus, Shield, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TRADING_SESSIONS, getActiveSession, type TradingSession } from '@/lib/tradingSessions';
import { cn } from '@/lib/utils';
import type { BiasValue, MarketStateValue } from '@/types/bias';
import { type ActionHintKey, type ActionHintEmphasis } from '@/lib/orderFlowHints';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSettings } from '@/hooks/useSettings';
import { getPipValueConfig } from '@/lib/tradingCalculations';
import { MobileTradeCard } from './MobileTradeCard';
import { ResponsiveHeader } from './ResponsiveHeader';
import { SettingsModal } from './SettingsModal';
import { MobileTradeForm } from './MobileTradeForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBiasState } from '@/hooks/useBiasState';

// Trading models and rules
const EXECUTION_MODELS = {
  OutOfBalance: [
    { value: 'Trend', label: '🌊 Trend Continuation', description: 'Follow the momentum' }
  ],
  InBalance: [
    { value: 'MeanRev', label: '↩️ Mean Reversion', description: 'Fade extremes back to center' }
  ],
  Extreme: [
    { value: 'Sweep', label: '🌀 Liquidity Sweep', description: 'Fade sweep for reversal' },
    { value: 'ExtremeScalp', label: '⚡ Extreme Scalping', description: 'Quick fade off extremes' }
  ]
};

const TRADING_RULES: Record<string, string[]> = {
  Trend: [
    "🎯 Entry: Retracement into LVN/FVG with order flow aggression (footprint delta flip, CVD confirm).",
    "⛔ SL: Beyond LVN/OB (+1–2 ticks). Never widen - tight invalidation.",
    "🎯 TP: Next balance POC or VWAP σ2. 70% of time price reacts in balance.",
    "⚡ BE: After impulsive displacement in favor (and CVD pressure confirms).",
    "💰 Partials: 50% at σ2 or first inefficiency fill when momentum confirmed.",
    "🚪 Early Exit: Delta flips or opposite absorption floods price action."
  ],
  MeanRev: [
    "🎯 Entry: Failed breakout → reclaim inside balance → LVN pullback + absorption.",
    "⛔ SL: Just beyond failed high/low. Never widen - mechanical invalidation.",
    "🎯 TP: Balance POC (center of value) - high probability mean reversion target.",
    "⚡ BE: Once price rotates firmly inside Value Area boundaries.",
    "💰 Partials: Optional 50% inside VA on first solid rotation with volume.",
    "🚪 Early Exit: Aggression reappears outside balance - fade thesis broken."
  ],
  Sweep: [
    "🎯 Entry: Sweep of Asia/London/NY high/low + CVD divergence + absorption → confirm with MSS/BOS.",
    "⛔ SL: Beyond swept high/low - clear mechanical invalidation level.",
    "🎯 TP: VWAP reversion / fair value gap fill - institutional target zones.",
    "⚡ BE: Immediately after displacement away from sweep confirms reversal.",
    "💰 Partials: First at VWAP σ1 to lock profits on initial reversal wave.",
    "🚪 Early Exit: Flow sustains in sweep direction - no fade confirmation."
  ],
  ExtremeScalp: [
    "🎯 Entry: Heatmap/Footprint limit cluster absorbs aggression → fade extremes.",
    "⛔ SL: 1–2 ticks beyond cluster - ultra-tight risk management required.",
    "🎯 TP: VWAP or next micro-imbalance - quick profit targets only.",
    "⚡ BE: Within 1–2 minutes if price reacts favorably to absorption.",
    "💰 Partials: 50% at 1R immediately - scalp methodology requires speed.",
    "🚪 Early Exit: Absorption breaks and market pushes through - wrong read."
  ]
};

type Scenario = {
  id: string;
  title: string;
  desc: string;
  requiresExit: boolean;
  closeTrade?: boolean;
  hintKey?: ActionHintKey;
};

const SCENARIOS: Scenario[] = [
  { id: 'move_be', title: '⚡ Move to Breakeven', desc: 'Move stop to entry price', requiresExit: false, hintKey: 'move_be' },
  { id: 'trail_stop', title: '🛡️ Aggression Trail', desc: 'Slide stop behind the last aggression node', requiresExit: false, hintKey: 'trail_stop' },
  { id: 'partial_25', title: '📊 Partial 25%', desc: 'Take 25% off at current price', requiresExit: true, hintKey: 'partial' },
  { id: 'partial_50', title: '📊 Partial 50%', desc: 'Take 50% off at current price', requiresExit: true, hintKey: 'partial' },
  { id: 'partial_80', title: '📊 Partial 80%', desc: 'Take majority off, let runner go', requiresExit: true, hintKey: 'partial' },
  { id: 'poc_exit', title: '🎯 POC / Fair Value', desc: 'Exit into balance magnet', requiresExit: true, closeTrade: true, hintKey: 'poc_tp' },
  { id: 'save_delta', title: '💾 Save Delta Profit', desc: 'Bank gains before aggression fails', requiresExit: true, closeTrade: true, hintKey: 'save_delta' },
  { id: 'full_exit', title: '✅ Full Exit', desc: 'Close entire position at current price', requiresExit: true, closeTrade: true, hintKey: 'full_exit' },
  { id: 'stopped', title: '❌ Stopped Out', desc: 'Position hit stop loss', requiresExit: true, closeTrade: true },
  { id: 'manual_close', title: '🚪 Manual Close', desc: 'Manual exit based on conditions', requiresExit: true, closeTrade: true }
];

const SCENARIO_EMPHASIS_STYLES: Record<ActionHintEmphasis, string> = {
  neutral: 'border-trading-border bg-secondary/20',
  positive: 'border-trading-accent/60 bg-secondary/30 shadow-[0_0_0_1px_rgba(129,140,248,0.2)]',
  warning: 'border-yellow-500/60 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(234,179,8,0.25)]',
  danger: 'border-red-500/70 bg-red-500/10 shadow-[0_0_0_1px_rgba(248,113,113,0.3)]',
};

// Assets will be dynamically loaded from settings
const ALL_ASSETS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'
];


interface Trade {
  id: string;
  timestamp: string;
  asset: string;
  side: 'Long' | 'Short';
  model: string;
  entry: number;
  stop: number;
  target?: number;
  risk: number;
  notes: string;
  status: 'open' | 'closed';
  exitPrice?: number;
  exitReason?: string;
  rMultiple?: number;
  pnl?: number;
  duration?: string;
  entryChecklist?: Record<string, boolean>;
  rulesTracked?: Record<string, boolean>;
  orderFlowData?: {
    cvdDelta: number | null;
    cvdAligned: boolean | null;
    lastSwingBroken: boolean | null;
    footprintSupport: boolean | null;
    followThrough: boolean | null;
    strongImbalanceNode: string | null;
    projectionTag: boolean | null;
    momentumPause: boolean | null;
    structureChallenged: boolean | null;
    valueReentry: boolean | null;
    trendExceptional: boolean | null;
    deltaBreakOff: boolean | null;
    opposingDelta: number | null;
    pocLevel: number | null;
    trailStopPrice: number | null;
    checkedAt: Record<string, number>;
  } | null;
}

interface DailyStats {
  tradesCount: number;
  profitableCount: number;
  totalPnL: number;
  isHouseMoneyActive: boolean;
  isDayDisabled: boolean;
}

interface KPIStats {
  totalTrades: number;
  wins: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
}

export default function TradingJournal() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Real-time sync and mobile optimizations
  const { isConnected, lastSyncTime, forceSync } = useRealtimeSync({
    onTradeUpdate: () => {
      // Refresh trades when real-time updates occur
      logger.realtime('Trade updated via real-time sync');
    },
    onBiasStateUpdate: () => {
      // Refresh bias state when real-time updates occur
      logger.realtime('Bias state updated via real-time sync');
    },
  });
  
  const {
    isMobile,
    isOnline,
    isLowBandwidth,
    orientation,
    touchSupport,
    enableHapticFeedback,
    enableOfflineMode,
    disableOfflineMode,
    isOfflineMode,
  } = useMobileOptimizations();
  
  const {
    isOffline,
    pendingChanges,
    saveOffline,
    syncPendingChanges,
    clearOfflineData,
  } = useOfflineStorage();
  
  const {
    isSupported: notificationsSupported,
    isEnabled: notificationsEnabled,
    requestPermission: requestNotificationPermission,
    showTradeAlert,
    showBiasAlert,
    showSessionAlert,
  } = usePushNotifications();
  
  const { settings } = useSettings();
  const { biasState, saveBiasState } = useBiasState();
  
  // Trading states
  const [bias, setBias] = useState('');
  const [marketState, setMarketState] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<typeof EXECUTION_MODELS.OutOfBalance>([]);
  
  // Trade form - initialize with settings
  const [tradeForm, setTradeForm] = useState({
    asset: settings.preferredAssets[0] || 'EURUSD',
    side: 'Long' as 'Long' | 'Short',
    model: settings.defaultModel || '',
    entry: '',
    stop: '',
    target: '',
    risk: settings.defaultRiskAmount.toString(),
    lotSize: '1.00',
    notes: '',
    datetime: new Date().toISOString().slice(0, 16)
  });
  
  // Trades and stats
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [showTradeSheet, setShowTradeSheet] = useState(false);
  const [exitPrice, setExitPrice] = useState('');
  const [exitReason, setExitReason] = useState('Target Hit');
  const [selectedScenario, setSelectedScenario] = useState('');
  
  // Entry checklist and rules tracking
  const [entryChecklist, setEntryChecklist] = useState<Record<string, boolean>>({});
  const [currentRulesChecked, setCurrentRulesChecked] = useState<Record<string, boolean>>({});
  
  // House of Money & Daily limits
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    tradesCount: 0,
    profitableCount: 0,
    totalPnL: 0,
    isHouseMoneyActive: false,
    isDayDisabled: false
  });
  
  // Time and session
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(null);
  
  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setCurrentSession(getActiveSession(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mobile cache busting - clear cache on mobile devices
  useEffect(() => {
    if (isMobile && 'serviceWorker' in navigator) {
      // Clear all caches on mobile to force fresh load
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('bias-to-profit')) {
            caches.delete(cacheName);
            logger.debug('Cleared cache:', cacheName);
          }
        });
      });
      
      // Force service worker update
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update();
        }
      });
    }
  }, [isMobile]);

  // Handle authentication errors gracefully
  useEffect(() => {
    const handleAuthError = (event: any) => {
      logger.warn('Authentication error detected, continuing in offline mode');
    };

    const handleExtensionError = (event: any) => {
      // Ignore Chrome extension errors
      if (event.filename && event.filename.includes('chrome-extension://')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('unhandledrejection', handleAuthError);
    window.addEventListener('error', handleExtensionError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleAuthError);
      window.removeEventListener('error', handleExtensionError);
    };
  }, []);
  
  // Update available models when market state changes
  useEffect(() => {
    if (marketState && EXECUTION_MODELS[marketState as keyof typeof EXECUTION_MODELS]) {
      setAvailableModels(EXECUTION_MODELS[marketState as keyof typeof EXECUTION_MODELS]);
      // Reset entry checklist when model changes
      setEntryChecklist({});
    } else {
      setAvailableModels([]);
    }
    setSelectedModel('');
  }, [marketState]);
  
  // Initialize entry checklist when model is selected
  useEffect(() => {
    if (selectedModel && TRADING_RULES[selectedModel]) {
      const initialChecklist: Record<string, boolean> = {};
      TRADING_RULES[selectedModel].forEach((_, index) => {
        initialChecklist[`rule_${index}`] = false;
      });
      setEntryChecklist(initialChecklist);
    }
  }, [selectedModel]);
  
  // Update daily stats when trades change
  useEffect(() => {
    const todayTrades = closedTrades.filter(trade => {
      const tradeDate = new Date(trade.timestamp).toDateString();
      const today = new Date().toDateString();
      return tradeDate === today;
    });
    
    const profitableTrades = todayTrades.filter(trade => (trade.pnl || 0) > 0);
    const lossTrades = todayTrades.filter(trade => (trade.pnl || 0) < 0);
    const totalPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // House of Money logic: After threshold trades, if profitable, activate house money
    const isHouseMoneyActive = settings.enableHouseMoney && 
                               todayTrades.length >= settings.houseMoneyThreshold && 
                               totalPnL > 0;
    
    // Disable day if max daily losses reached (from settings)
    const isDayDisabled = settings.enableStopRule && lossTrades.length >= settings.maxDailyLosses;
    
    setDailyStats({
      tradesCount: todayTrades.length,
      profitableCount: profitableTrades.length,
      totalPnL,
      isHouseMoneyActive,
      isDayDisabled
    });
    
    // Update trade form risk based on House of Money
    if (isHouseMoneyActive && !isDayDisabled) {
      const halfProfit = Math.floor(totalPnL / 2);
      setTradeForm(prev => ({ 
        ...prev, 
        risk: Math.max(halfProfit, 125).toString() // Min risk of $125
      }));
    }
  }, [closedTrades]);
  
  // Calculate trading stats using centralized calculation functions
  const calculateStats = useCallback((): KPIStats => {
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => (t.rMultiple || 0) > 0).length;
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Import centralized calculation functions
    const { calculateWinRate, calculateAverageRMultiple, calculateProfitFactor, calculateExpectancy } = require('@/lib/tradingCalculations');
    
    const winRate = calculateWinRate(closedTrades);
    const avgR = calculateAverageRMultiple(closedTrades);
    const profitFactor = calculateProfitFactor(closedTrades);
    const expectancy = calculateExpectancy(closedTrades);
    
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const lossTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / lossTrades.length) : 0;
    
    return {
      totalTrades,
      wins,
      winRate,
      totalPnL,
      avgR,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy
    };
  }, [closedTrades]);
  
  const stats = calculateStats();
  
  // Form validation with checklist requirement
  const allRulesChecked = selectedModel && TRADING_RULES[selectedModel] ? 
    TRADING_RULES[selectedModel].every((_, index) => entryChecklist[`rule_${index}`]) : false;
  
  const isFormValid = tradeForm.asset && tradeForm.side && tradeForm.model && 
                     tradeForm.entry && tradeForm.stop && tradeForm.risk && 
                     allRulesChecked && !dailyStats.isDayDisabled;
  
  // Calculate risk metrics
  const calculateRiskMetrics = () => {
    const entry = parseFloat(tradeForm.entry);
    const stop = parseFloat(tradeForm.stop);
    const target = parseFloat(tradeForm.target);
    const risk = parseFloat(tradeForm.risk);
    
    if (!entry || !stop) return { pips: 0, riskReward: 0 };
    
    // Use centralized pip configuration
    const { pipMultiplier } = getPipValueConfig(tradeForm.asset);
    const multiplier = pipMultiplier;
    
    const pips = Math.abs((entry - stop) * multiplier);
    const riskReward = target ? Math.abs((target - entry) / (entry - stop)) : 0;
    
    return { pips: Math.round(pips * 10) / 10, riskReward: Math.round(riskReward * 100) / 100 };
  };
  
  const { pips, riskReward } = calculateRiskMetrics();

  // Manual order flow tracking - no simulation
  const [manualOrderFlow, setManualOrderFlow] = useState<Record<string, {
    cvdDelta: number | null;
    cvdAligned: boolean | null;
    lastSwingBroken: boolean | null;
    footprintSupport: boolean | null;
    followThrough: boolean | null;
    strongImbalanceNode: string | null;
    projectionTag: boolean | null;
    momentumPause: boolean | null;
    structureChallenged: boolean | null;
    valueReentry: boolean | null;
    trendExceptional: boolean | null;
    deltaBreakOff: boolean | null;
    opposingDelta: number | null;
    pocLevel: number | null;
    trailStopPrice: number | null;
    checkedAt: Record<string, number>; // timestamp when each option was checked
  }>>({});

  const guardrailActive = dailyStats.isDayDisabled;
  const currentManualOrderFlow = currentTrade ? manualOrderFlow[currentTrade.id] : undefined;
  
  // Initialize manual order flow for new trades
  const initializeManualOrderFlow = (tradeId: string) => {
    if (!manualOrderFlow[tradeId]) {
      setManualOrderFlow(prev => ({
        ...prev,
        [tradeId]: {
          cvdDelta: null,
          cvdAligned: null,
          lastSwingBroken: null,
          footprintSupport: null,
          followThrough: null,
          strongImbalanceNode: null,
          projectionTag: null,
          momentumPause: null,
          structureChallenged: null,
          valueReentry: null,
          trendExceptional: null,
          deltaBreakOff: null,
          opposingDelta: null,
          pocLevel: null,
          trailStopPrice: null,
          checkedAt: {}
        }
      }));
    }
  };

  // Add new trade
  const addTrade = () => {
    if (!isFormValid) return;
    
    const newTrade: Trade = {
      id: Math.random().toString(36).slice(2, 11),
      timestamp: tradeForm.datetime,
      asset: tradeForm.asset,
      side: tradeForm.side,
      model: tradeForm.model,
      entry: parseFloat(tradeForm.entry),
      stop: parseFloat(tradeForm.stop),
      target: tradeForm.target ? parseFloat(tradeForm.target) : undefined,
      risk: parseFloat(tradeForm.risk),
      notes: tradeForm.notes,
      status: 'open',
      entryChecklist: { ...entryChecklist },
      rulesTracked: {}
    };
    
    setOpenTrades(prev => [...prev, newTrade]);
    
    // Clear form and checklist
    setTradeForm({
      ...tradeForm,
      model: '',
      entry: '',
      stop: '',
      target: '',
      notes: ''
    });
    setEntryChecklist({});
    
    toast({
      title: "Trade Added",
      description: `${newTrade.side} ${newTrade.asset} trade added to open positions.`,
    });
  };
  
  // Manage trade
  const manageTrade = (trade: Trade) => {
    logger.trade('Opening trade management modal', trade.id, trade);
    setCurrentTrade(trade);
    setExitPrice('');
    setExitReason('Target Hit');
    setSelectedScenario('');
    setShowTradeSheet(true);
    
    // Initialize manual order flow for this trade
    initializeManualOrderFlow(trade.id);
    
    // Initialize rules tracking for this trade
    if (trade.model && TRADING_RULES[trade.model]) {
      const initialRulesTracked: Record<string, boolean> = {};
      TRADING_RULES[trade.model].forEach((_, index) => {
        initialRulesTracked[`rule_${index}`] = trade.rulesTracked?.[`rule_${index}`] || false;
      });
      setCurrentRulesChecked(initialRulesTracked);
    }
  };
  
  // Execute scenario
  const executeScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario || !currentTrade) return;
    
    setSelectedScenario(scenarioId);
    
    if (scenario.requiresExit) {
      // Show exit section for scenarios that need exit price
    } else if (scenarioId === 'move_be') {
      // Move to breakeven
      const updatedTrade = { ...currentTrade, stop: currentTrade.entry };
      setOpenTrades(prev => prev.map(t => t.id === currentTrade.id ? updatedTrade : t));
      setCurrentTrade(updatedTrade);

      toast({
        title: "Stop Moved to Breakeven",
        description: `${currentTrade.asset} stop moved to entry price.`,
      });
    } else if (scenarioId === 'trail_stop') {
      const manualFlow = manualOrderFlow[currentTrade.id];
      if (!manualFlow?.trailStopPrice) {
        toast({
          title: "No Aggression Anchor",
          description: "Please set a trail stop price in the order flow section first.",
        });
        return;
      }

      const updatedTrade = { ...currentTrade, stop: manualFlow.trailStopPrice };
      setOpenTrades(prev => prev.map(t => t.id === currentTrade.id ? updatedTrade : t));
      setCurrentTrade(updatedTrade);

      toast({
        title: "Stop Trailed",
        description: manualFlow.strongImbalanceNode
          ? `Stop slid behind imbalance ${manualFlow.strongImbalanceNode}`
          : 'Stop trailed behind latest aggression node.',
      });
    }
  };
  
  // Close trade
  const closeTrade = () => {
    if (!currentTrade || !exitPrice) return;
    
    const exit = parseFloat(exitPrice);
    const pnlDirection = currentTrade.side === 'Long' ? 1 : -1;
    const priceDiff = (exit - currentTrade.entry) * pnlDirection;
    const stopDiff = Math.abs(currentTrade.entry - currentTrade.stop);
    const rMultiple = priceDiff / stopDiff;
    const pnl = rMultiple * currentTrade.risk;
    
    const closedTrade: Trade = {
      ...currentTrade,
      status: 'closed',
      exitPrice: exit,
      exitReason,
      rMultiple,
      pnl,
      duration: calculateDuration(currentTrade.timestamp),
      rulesTracked: { ...currentRulesChecked },
      orderFlowData: manualOrderFlow[currentTrade.id] || null
    };
    
    setClosedTrades(prev => [...prev, closedTrade]);
    setOpenTrades(prev => prev.filter(t => t.id !== currentTrade.id));
    setShowTradeSheet(false);
    setCurrentRulesChecked({});
    
    toast({
      title: "Trade Closed",
      description: `${currentTrade.asset} closed with ${rMultiple > 0 ? 'profit' : 'loss'} of ${rMultiple.toFixed(2)}R`,
      variant: rMultiple > 0 ? "default" : "destructive"
    });
  };
  
  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const end = new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Generate report
  const generateReport = () => {
    const date = new Date().toLocaleDateString();
    const report = `# Trading Journal - ${date}

## Daily Summary
- **Total Trades**: ${stats.totalTrades}
- **Win Rate**: ${stats.winRate}%
- **Total P&L**: ${formatCurrency(stats.totalPnL)}
- **Average R**: ${stats.avgR.toFixed(2)}R
- **Profit Factor**: ${stats.profitFactor.toFixed(2)}

## Closed Trades
${closedTrades.map(trade => 
  `- ${trade.timestamp.split('T')[1]} | ${trade.asset} ${trade.side} | ${trade.rMultiple?.toFixed(2)}R | ${formatCurrency(trade.pnl || 0)}`
).join('\n')}

## Notes
- Market bias: ${bias || 'Not set'}
- Market state: ${marketState || 'Not set'}
- Primary model: ${selectedModel || 'Not set'}
`;
    
    return report;
  };
  
  // Export functions
  const exportReport = (format: 'md' | 'csv' | 'json') => {
    const report = generateReport();
    
    if (format === 'md') {
      navigator.clipboard.writeText(report);
      toast({ title: "Report Copied", description: "Markdown report copied to clipboard." });
    } else if (format === 'csv') {
      const csvData = closedTrades.map(t => 
        `${t.timestamp},${t.asset},${t.side},${t.model},${t.entry},${t.exitPrice},${t.rMultiple?.toFixed(2)},${t.pnl?.toFixed(0)},${t.duration},${t.exitReason}`
      ).join('\n');
      const header = 'Timestamp,Asset,Side,Model,Entry,Exit,R Multiple,P&L,Duration,Reason\n';
      navigator.clipboard.writeText(header + csvData);
      toast({ title: "CSV Copied", description: "CSV data copied to clipboard." });
    } else if (format === 'json') {
      navigator.clipboard.writeText(JSON.stringify({ stats, trades: closedTrades }, null, 2));
      toast({ title: "JSON Copied", description: "JSON data copied to clipboard." });
    }
  };
  
  const resetDay = async () => {
    if (confirm('Are you sure you want to reset the day? This will clear all today\'s trades and reset your bias state.')) {
      try {
        // Reset bias state
        if (biasState) {
          await saveBiasState({
            bias: 'FLAT' as BiasValue,
            market_state: 'UNCLEAR' as MarketStateValue,
            confidence: null,
            tags: []
          });
        }
        
        // Clear today's trades from database
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('trades')
          .delete()
          .eq('user_id', user?.id)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);
        
        if (error) {
          logger.error('Error resetting day:', error);
          toast({ 
            title: "Reset Failed", 
            description: "Failed to reset day. Please try again.",
            variant: "destructive"
          });
        } else {
          // Reset local state
          setOpenTrades([]);
          setClosedTrades([]);
          setBias('');
          setMarketState('');
          setSelectedModel('');
          setEntryChecklist({});
          setCurrentRulesChecked({});
          setDailyStats({
            tradesCount: 0,
            profitableCount: 0,
            totalPnL: 0,
            isHouseMoneyActive: false,
            isDayDisabled: false
          });
          // Reset risk back to settings default
          setTradeForm(prev => ({ ...prev, risk: settings.defaultRiskAmount.toString() }));
          
          toast({ 
            title: "Day Reset", 
            description: "All today's trades and bias state have been cleared." 
          });
        }
      } catch (error) {
        logger.error('Error in reset day:', error);
        toast({ 
          title: "Reset Failed", 
          description: "An error occurred while resetting the day.",
          variant: "destructive"
        });
      }
    }
  };

  // Debug info for mobile
  const debugInfo = {
    isMobile,
    isOnline,
    isConnected,
    pendingChanges: pendingChanges.length,
    settingsLoaded: Object.keys(settings).length > 0,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Debug info for mobile - remove in production */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black text-xs p-2 z-50">
          Mobile Debug: {JSON.stringify(debugInfo, null, 0)}
        </div>
      )}
      
      {/* Responsive Header */}
      <ResponsiveHeader
        currentTime={currentTime}
        currentSession={currentSession}
        dailyStats={dailyStats}
        isMobile={isMobile}
        isConnected={isConnected}
        pendingChanges={pendingChanges.length}
        lastSyncTime={lastSyncTime}
        onExportReport={exportReport}
        onResetDay={resetDay}
        onForceSync={forceSync}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 p-6 max-w-7xl mx-auto">
        {/* Left Sidebar - Decision Tree & KPIs */}
        <div className="space-y-6">
          {/* Current Session Display */}
          <Card className="bg-gradient-card border-trading-border shadow-trading">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Trading Sessions (EST)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TRADING_SESSIONS.map(session => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border transition-all ${
                      currentSession?.id === session.id
                        ? session.color + ' border-opacity-100'
                        : 'border-trading-border bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{session.name}</div>
                        <div className="text-xs text-trading-muted">{session.localTime}</div>
                      </div>
                      <div className="text-xs text-trading-muted">{session.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Stats Card */}
          <Card className="bg-gradient-card border-trading-border shadow-trading">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Daily Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{dailyStats.tradesCount}</div>
                  <div className="text-xs text-trading-muted uppercase">Today's Trades</div>
                </div>
                <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                  <div className={`text-lg font-bold ${dailyStats.totalPnL >= 0 ? 'text-trading-success' : 'text-trading-danger'}`}>
                    {formatCurrency(dailyStats.totalPnL)}
                  </div>
                  <div className="text-xs text-trading-muted uppercase">Daily P&L</div>
                </div>
              </div>
              
              {dailyStats.isHouseMoneyActive && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-400/50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-300">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">House Money Active</span>
                  </div>
                  <p className="text-xs text-green-300/80 mt-1">
                    Risk adjusted to half of current profit: ${Math.floor(dailyStats.totalPnL / 2)}
                  </p>
                </div>
              )}
              
              {dailyStats.isDayDisabled && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-400/50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Session Guardrail</span>
                  </div>
                  <p className="text-xs text-red-300/80 mt-1">
                    Rule hit: 3 losses today—pause trading.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-trading-border shadow-trading sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Decision Tree (Live)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1 - Bias */}
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">🌍 Step 1 – Bias</Label>
                <Select value={bias} onValueChange={setBias}>
                  <SelectTrigger className="bg-input border-trading-border">
                    <SelectValue placeholder="Select bias..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-trading-border">
                    <SelectItem value="Bullish">🔵 Bullish (HTF uptrend, VWAP support, CVD+)</SelectItem>
                    <SelectItem value="Bearish">🔴 Bearish (HTF downtrend, VWAP resistance, CVD-)</SelectItem>
                    <SelectItem value="Neutral">⚪ Neutral / Balance (rotation inside VA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2 - Market State */}
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">🧭 Step 2 – Market State</Label>
                <Select value={marketState} onValueChange={setMarketState}>
                  <SelectTrigger className="bg-input border-trading-border">
                    <SelectValue placeholder="Select market state..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-trading-border">
                    <SelectItem value="OutOfBalance">📈 Out of Balance → Trend Continuation</SelectItem>
                    <SelectItem value="InBalance">🔄 In Balance → Mean Reversion</SelectItem>
                    <SelectItem value="Extreme">📊 Extreme σ2–σ3 → Liquidity Sweep</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-trading-muted">Pick market state to filter models mechanically.</p>
              </div>

              {/* Step 3 - Execution Model */}
              <div className="space-y-2">
                <Label className="text-xs text-trading-muted">⚙️ Step 3 – Execution Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-input border-trading-border">
                    <SelectValue placeholder="Select execution model..." />
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

              {/* Entry Rules Checklist */}
              {selectedModel && TRADING_RULES[selectedModel] && (
                <div className="space-y-2 pt-4 border-t border-trading-border">
                  <h4 className="text-xs font-medium text-trading-accent uppercase tracking-wider flex items-center gap-2">
                    Entry Checklist
                    <Badge variant="outline" className="text-xs">
                      {Object.values(entryChecklist).filter(Boolean).length}/{TRADING_RULES[selectedModel].length}
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {TRADING_RULES[selectedModel].map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-trading-border/50">
                        <Checkbox
                          id={`rule_${idx}`}
                          checked={entryChecklist[`rule_${idx}`] || false}
                          onCheckedChange={(checked) => 
                            setEntryChecklist(prev => ({ ...prev, [`rule_${idx}`]: !!checked }))
                          }
                          className="mt-1"
                        />
                        <label htmlFor={`rule_${idx}`} className="text-xs leading-relaxed cursor-pointer flex-1">
                          {rule}
                        </label>
                      </div>
                    ))}
                  </div>
                  {!allRulesChecked && (
                    <p className="text-xs text-trading-muted italic">
                      ⚠️ Complete all checklist items to enable trade entry
                    </p>
                  )}
                </div>
              )}

              {/* KPI Dashboard */}
              <div className="pt-4 border-t border-trading-border">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-foreground">{stats.totalTrades + openTrades.length}</div>
                    <div className="text-xs text-trading-muted uppercase">Trades</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-trading-success">{stats.wins}</div>
                    <div className="text-xs text-trading-muted uppercase">Wins</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-trading-accent">{stats.winRate}%</div>
                    <div className="text-xs text-trading-muted uppercase">Win Rate</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-3 text-center">
                    <div className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-trading-success' : 'text-trading-danger'}`}>
                      {formatCurrency(stats.totalPnL)}
                    </div>
                    <div className="text-xs text-trading-muted uppercase">Total P&L</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold">{formatCurrency(stats.avgWin)}</div>
                    <div className="text-xs text-trading-muted">Avg Win</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold">{formatCurrency(stats.avgLoss)}</div>
                    <div className="text-xs text-trading-muted">Avg Loss</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold">{stats.profitFactor.toFixed(2)}</div>
                    <div className="text-xs text-trading-muted">Profit Factor</div>
                  </div>
                  <div className="bg-secondary/50 border border-trading-border rounded-lg p-2 text-center">
                    <div className="text-sm font-semibold">{stats.avgR.toFixed(2)}R</div>
                    <div className="text-xs text-trading-muted">Avg R</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Trade Management */}
        <div className="space-y-6">
          {/* New Trade Form - Mobile Optimized */}
          {isMobile ? (
            <MobileTradeForm
              tradeForm={tradeForm}
              setTradeForm={setTradeForm}
              availableModels={availableModels}
              preferredAssets={settings.preferredAssets}
              allAssets={ALL_ASSETS}
              entryChecklist={entryChecklist}
              setEntryChecklist={setEntryChecklist}
              tradingRules={TRADING_RULES}
              selectedModel={selectedModel}
              isFormValid={isFormValid}
              onAddTrade={addTrade}
              onClearForm={() => {
                setTradeForm({
                  ...tradeForm,
                  model: '',
                  entry: '',
                  stop: '',
                  target: '',
                  notes: ''
                });
                setEntryChecklist({});
              }}
              isMobile={isMobile}
              enableHapticFeedback={enableHapticFeedback}
              pips={pips}
              riskReward={riskReward}
            />
          ) : (
            <Card className="bg-gradient-card border-trading-border shadow-trading">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                  New Trade
                </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Asset *</Label>
                  <Select value={tradeForm.asset} onValueChange={(value) => setTradeForm({...tradeForm, asset: value})}>
                    <SelectTrigger className="bg-input border-trading-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-trading-border">
                      {/* Show preferred assets first, then all others */}
                      {settings.preferredAssets.map(asset => (
                        <SelectItem key={asset} value={asset}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">★</Badge>
                            {asset}
                          </span>
                        </SelectItem>
                      ))}
                      {ALL_ASSETS.filter(asset => !settings.preferredAssets.includes(asset)).map(asset => (
                        <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Side *</Label>
                  <Select value={tradeForm.side} onValueChange={(value: 'Long' | 'Short') => setTradeForm({...tradeForm, side: value})}>
                    <SelectTrigger className="bg-input border-trading-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-trading-border">
                      <SelectItem value="Long">
                        <TrendingUp className="inline mr-1 h-3 w-3" />
                        Long
                      </SelectItem>
                      <SelectItem value="Short">
                        <TrendingDown className="inline mr-1 h-3 w-3" />
                        Short
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Model *</Label>
                  <Select value={tradeForm.model} onValueChange={(value) => setTradeForm({...tradeForm, model: value})}>
                    <SelectTrigger className="bg-input border-trading-border">
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

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Entry Price *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    inputMode="decimal"
                    placeholder="Entry price"
                    value={tradeForm.entry}
                    onChange={(e) => setTradeForm({...tradeForm, entry: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Stop Loss *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    inputMode="decimal"
                    placeholder="Stop price"
                    value={tradeForm.stop}
                    onChange={(e) => setTradeForm({...tradeForm, stop: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Target (Optional)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    inputMode="decimal"
                    placeholder="Target price"
                    value={tradeForm.target}
                    onChange={(e) => setTradeForm({...tradeForm, target: e.target.value})}
                    className="bg-input border-trading-border"
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
                    onChange={(e) => setTradeForm({...tradeForm, risk: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Lot Size (EURUSD: $60/pip)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="1.00"
                    value={tradeForm.lotSize}
                    onChange={(e) => setTradeForm({...tradeForm, lotSize: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                  {tradeForm.lotSize && parseFloat(tradeForm.lotSize) > 0 && (
                    <div className="text-xs text-trading-muted">
                      Pip Value: ${(parseFloat(tradeForm.lotSize) * 60).toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Date/Time</Label>
                  <Input
                    type="datetime-local"
                    value={tradeForm.datetime}
                    onChange={(e) => setTradeForm({...tradeForm, datetime: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-trading-muted">Risk Info</Label>
                  <div className="flex gap-4 text-xs text-trading-muted pt-2">
                    <span>Risk: {pips} pips</span>
                    <span>R:R = {riskReward || '—'}</span>
                  </div>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label className="text-xs text-trading-muted">Notes</Label>
                  <Input
                    placeholder="Setup description, confirmation signals..."
                    value={tradeForm.notes}
                    onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                    className="bg-input border-trading-border"
                  />
                </div>

                <div className="md:col-span-3 flex gap-3">
                  <Button
                    variant="trading"
                    onClick={addTrade}
                    disabled={!isFormValid}
                    className="flex-1"
                  >
                    {dailyStats.isDayDisabled ? 'Guardrail Active' : 'Add Trade'}
                  </Button>
                  <Button variant="terminal" onClick={() => {
                    setTradeForm({
                      ...tradeForm,
                      model: '',
                      entry: '',
                      stop: '',
                      target: '',
                      notes: ''
                    });
                  }}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Open Trades */}
          <Card className="bg-gradient-card border-trading-border shadow-trading">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Open Trades ({openTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <p className="text-center text-trading-muted py-8">No open trades</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-trading-border">
                        <th className="text-left p-2 text-trading-muted font-medium">Time</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Asset</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Side</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Model</th>
                        <th className="text-right p-2 text-trading-muted font-medium">Entry</th>
                        <th className="text-right p-2 text-trading-muted font-medium">Stop</th>
                        <th className="text-right p-2 text-trading-muted font-medium">Risk $</th>
                        <th className="text-center p-2 text-trading-muted font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map(trade => {
                        const manualFlow = manualOrderFlow[trade.id];
                        return (
                          <tr key={trade.id} className="border-b border-trading-border/50 hover:bg-secondary/30">
                            <td className="p-2">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                            <td className="p-2 font-medium">
                                <span>{trade.asset}</span>
                            </td>
                            <td className="p-2">
                              <Badge variant={trade.side === 'Long' ? 'default' : 'secondary'} className="text-xs">
                                {trade.side === 'Long' ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                                {trade.side}
                              </Badge>
                            </td>
                            <td className="p-2">{trade.model}</td>
                            <td className="p-2 text-right font-mono">{trade.entry}</td>
                            <td className="p-2 text-right font-mono">{trade.stop}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(trade.risk)}</td>
                            <td className="p-2 text-center">
                              <Button
                                variant="terminal"
                                size="sm"
                                onClick={() => manageTrade(trade)}
                              >
                                Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closed Trades */}
          <Card className="bg-gradient-card border-trading-border shadow-trading">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Closed Trades ({closedTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedTrades.length === 0 ? (
                <p className="text-center text-trading-muted py-8">No closed trades</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-trading-border">
                        <th className="text-left p-2 text-trading-muted font-medium">Asset</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Side</th>
                        <th className="text-right p-2 text-trading-muted font-medium">Entry</th>
                        <th className="text-right p-2 text-trading-muted font-medium">Exit</th>
                        <th className="text-right p-2 text-trading-muted font-medium">R Multiple</th>
                        <th className="text-right p-2 text-trading-muted font-medium">P&L $</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Duration</th>
                        <th className="text-left p-2 text-trading-muted font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.map(trade => (
                        <tr key={trade.id} className={`border-b border-trading-border/50 ${(trade.pnl || 0) > 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
                          <td className="p-2 font-medium">{trade.asset}</td>
                          <td className="p-2">
                            <Badge variant={trade.side === 'Long' ? 'default' : 'secondary'} className="text-xs">
                              {trade.side === 'Long' ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                              {trade.side}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{trade.entry}</td>
                          <td className="p-2 text-right font-mono">{trade.exitPrice}</td>
                          <td className={`p-2 text-right font-mono font-semibold ${(trade.rMultiple || 0) > 0 ? 'text-trading-success' : 'text-trading-danger'}`}>
                            {trade.rMultiple?.toFixed(2)}R
                          </td>
                          <td className={`p-2 text-right font-mono font-semibold ${(trade.pnl || 0) > 0 ? 'text-trading-success' : 'text-trading-danger'}`}>
                            {formatCurrency(trade.pnl || 0)}
                          </td>
                          <td className="p-2">{trade.duration}</td>
                          <td className="p-2">{trade.exitReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Report */}
          <Card className="bg-gradient-card border-trading-border shadow-trading">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-trading-muted">
                Daily Report (Preview)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generateReport()}
                readOnly
                className="font-mono text-xs bg-secondary/50 border-trading-border min-h-[200px]"
                placeholder="Report will appear here..."
              />
              <div className="flex gap-2 mt-4">
                <Button variant="terminal" size="sm" onClick={() => exportReport('md')}>
                  Copy Markdown
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trade Management Modal */}
      {showTradeSheet && currentTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-card border-trading-border shadow-accent">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <CardTitle className="text-trading-accent">
                  Manage Trade - {currentTrade.asset} {currentTrade.side}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTradeSheet(false)}>
                ×
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-lg border border-trading-border">
                <div>
                  <div className="text-xs text-trading-muted">Entry</div>
                  <div className="font-mono font-semibold">{currentTrade.entry}</div>
                </div>
                <div>
                  <div className="text-xs text-trading-muted">Stop</div>
                  <div className="font-mono font-semibold">{currentTrade.stop}</div>
                </div>
                <div>
                  <div className="text-xs text-trading-muted">Target</div>
                  <div className="font-mono font-semibold">{currentTrade.target || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-trading-muted">Risk</div>
                  <div className="font-mono font-semibold">{formatCurrency(currentTrade.risk)}</div>
                </div>
              </div>

              {/* Manual Order Flow Actions - Always Visible */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                  📊 Order Flow Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">⚡ Move to Breakeven</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Move stop to entry price when CVD aligns and last swing breaks
                </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeScenario('move_be')}
                      className="w-full"
                    >
                      Move to BE
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">🛡️ Trail Stop</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Trail stop behind aggression node when momentum continues
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeScenario('trail_stop')}
                      className="w-full"
                    >
                      Trail Stop
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">📊 Take Partial</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Scale out at VWAP σ2 or first inefficiency when flow holds
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeScenario('partial_25')}
                        className="flex-1"
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeScenario('partial_50')}
                        className="flex-1"
                      >
                        50%
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">🎯 POC Exit</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Exit into balance magnet when price reaches POC level
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeScenario('poc_exit')}
                      className="w-full"
                    >
                      Exit @ POC
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">💾 Save Delta</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Bank gains before aggression fails and delta flips
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeScenario('save_delta')}
                      className="w-full"
                    >
                      Save Delta
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg border border-trading-border bg-secondary/20">
                    <div className="font-semibold text-sm mb-2">✅ Full Exit</div>
                    <div className="text-xs text-trading-muted mb-3">
                      Close entire position when price and flow flip against you
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeScenario('full_exit')}
                      className="w-full"
                    >
                      Full Exit
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Order Flow Tracking */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                  📊 Manual Order Flow Tracking
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-trading-border">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cvd_aligned"
                        checked={currentManualOrderFlow?.cvdAligned === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                cvdAligned: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  cvdAligned: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="cvd_aligned" className="text-xs cursor-pointer">
                        CVD Aligned with trade direction
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="swing_broken"
                        checked={currentManualOrderFlow?.lastSwingBroken === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                lastSwingBroken: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  lastSwingBroken: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="swing_broken" className="text-xs cursor-pointer">
                        Last swing broken
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="footprint_support"
                        checked={currentManualOrderFlow?.footprintSupport === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                footprintSupport: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  footprintSupport: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="footprint_support" className="text-xs cursor-pointer">
                        Footprint support/resistance
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="follow_through"
                        checked={currentManualOrderFlow?.followThrough === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                followThrough: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  followThrough: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="follow_through" className="text-xs cursor-pointer">
                        Follow-through momentum
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="projection_tag"
                        checked={currentManualOrderFlow?.projectionTag === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                projectionTag: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  projectionTag: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="projection_tag" className="text-xs cursor-pointer">
                        Projection tag visible
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="momentum_pause"
                        checked={currentManualOrderFlow?.momentumPause === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                momentumPause: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  momentumPause: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="momentum_pause" className="text-xs cursor-pointer">
                        Momentum pause
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="structure_challenged"
                        checked={currentManualOrderFlow?.structureChallenged === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                structureChallenged: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  structureChallenged: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="structure_challenged" className="text-xs cursor-pointer">
                        Structure challenged
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="value_reentry"
                        checked={currentManualOrderFlow?.valueReentry === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                valueReentry: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  valueReentry: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="value_reentry" className="text-xs cursor-pointer">
                        Value area reentry
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="trend_exceptional"
                        checked={currentManualOrderFlow?.trendExceptional === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                trendExceptional: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  trendExceptional: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="trend_exceptional" className="text-xs cursor-pointer">
                        Trend exceptional
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="delta_break_off"
                        checked={currentManualOrderFlow?.deltaBreakOff === true}
                        onCheckedChange={(checked) => {
                          if (currentTrade) {
                            setManualOrderFlow(prev => ({
                              ...prev,
                              [currentTrade.id]: {
                                ...prev[currentTrade.id],
                                deltaBreakOff: checked === true,
                                checkedAt: {
                                  ...prev[currentTrade.id]?.checkedAt,
                                  deltaBreakOff: checked === true ? Date.now() : 0
                                }
                              }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="delta_break_off" className="text-xs cursor-pointer">
                        Delta break off
                      </label>
                    </div>
                  </div>
                </div>

                {/* Manual Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-trading-muted">CVD Delta</Label>
                    <Input
                      type="number"
                      placeholder="Enter CVD delta value"
                      value={currentManualOrderFlow?.cvdDelta || ''}
                      onChange={(e) => {
                        if (currentTrade) {
                          setManualOrderFlow(prev => ({
                            ...prev,
                            [currentTrade.id]: {
                              ...prev[currentTrade.id],
                              cvdDelta: e.target.value ? parseFloat(e.target.value) : null,
                              checkedAt: {
                                ...prev[currentTrade.id]?.checkedAt,
                                cvdDelta: e.target.value ? Date.now() : 0
                              }
                            }
                          }));
                        }
                      }}
                      className="bg-input border-trading-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-trading-muted">Opposing Delta</Label>
                    <Input
                      type="number"
                      placeholder="Enter opposing delta value"
                      value={currentManualOrderFlow?.opposingDelta || ''}
                      onChange={(e) => {
                        if (currentTrade) {
                          setManualOrderFlow(prev => ({
                            ...prev,
                            [currentTrade.id]: {
                              ...prev[currentTrade.id],
                              opposingDelta: e.target.value ? parseFloat(e.target.value) : null,
                              checkedAt: {
                                ...prev[currentTrade.id]?.checkedAt,
                                opposingDelta: e.target.value ? Date.now() : 0
                              }
                            }
                          }));
                        }
                      }}
                      className="bg-input border-trading-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-trading-muted">POC Level</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Enter POC level"
                      value={currentManualOrderFlow?.pocLevel || ''}
                      onChange={(e) => {
                        if (currentTrade) {
                          setManualOrderFlow(prev => ({
                            ...prev,
                            [currentTrade.id]: {
                              ...prev[currentTrade.id],
                              pocLevel: e.target.value ? parseFloat(e.target.value) : null,
                              checkedAt: {
                                ...prev[currentTrade.id]?.checkedAt,
                                pocLevel: e.target.value ? Date.now() : 0
                              }
                            }
                          }));
                        }
                      }}
                      className="bg-input border-trading-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-trading-muted">Trail Stop Price</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Enter trail stop price"
                      value={currentManualOrderFlow?.trailStopPrice || ''}
                      onChange={(e) => {
                        if (currentTrade) {
                          setManualOrderFlow(prev => ({
                            ...prev,
                            [currentTrade.id]: {
                              ...prev[currentTrade.id],
                              trailStopPrice: e.target.value ? parseFloat(e.target.value) : null,
                              checkedAt: {
                                ...prev[currentTrade.id]?.checkedAt,
                                trailStopPrice: e.target.value ? Date.now() : 0
                              }
                            }
                          }));
                        }
                      }}
                      className="bg-input border-trading-border"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-xs text-trading-muted">Strong Imbalance Node</Label>
                  <Input
                    placeholder="Enter imbalance node description"
                    value={currentManualOrderFlow?.strongImbalanceNode || ''}
                    onChange={(e) => {
                      if (currentTrade) {
                        setManualOrderFlow(prev => ({
                          ...prev,
                          [currentTrade.id]: {
                            ...prev[currentTrade.id],
                            strongImbalanceNode: e.target.value || null,
                            checkedAt: {
                              ...prev[currentTrade.id]?.checkedAt,
                              strongImbalanceNode: e.target.value ? Date.now() : 0
                            }
                          }
                        }));
                      }
                    }}
                    className="bg-input border-trading-border"
                  />
                </div>
              </div>

              {/* Rules Tracking in Trade Management */}
              {currentTrade.model && TRADING_RULES[currentTrade.model] && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide flex items-center gap-2">
                    Trade Rules Tracking
                    <Badge variant="outline" className="text-xs">
                      {Object.values(currentRulesChecked).filter(Boolean).length}/{TRADING_RULES[currentTrade.model].length}
                    </Badge>
                  </h3>
                  <div className="space-y-2 mb-6">
                    {TRADING_RULES[currentTrade.model].map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-trading-border/50">
                        <Checkbox
                          id={`manage_rule_${idx}`}
                          checked={currentRulesChecked[`rule_${idx}`] || false}
                          onCheckedChange={(checked) => 
                            setCurrentRulesChecked(prev => ({ ...prev, [`rule_${idx}`]: !!checked }))
                          }
                          className="mt-1"
                        />
                        <label htmlFor={`manage_rule_${idx}`} className="text-xs leading-relaxed cursor-pointer flex-1">
                          {rule}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <div>
                <h3 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">Trade Scenarios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {SCENARIOS.map(scenario => {
                      const buttonClasses = cn(
                        'p-4 rounded-lg border text-left transition-all hover:border-trading-accent hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-trading-accent/30',
                        selectedScenario === scenario.id
                          ? 'border-trading-success bg-success/10 shadow-[0_0_0_1px_rgba(34,197,94,0.35)]'
                        : 'border-trading-border bg-secondary/20'
                      );

                      return (
                            <button
                        key={scenario.id}
                              onClick={() => executeScenario(scenario.id)}
                              className={buttonClasses}
                            >
                              <div className="font-semibold text-sm mb-1">{scenario.title}</div>
                                <div className="text-xs text-trading-muted">{scenario.desc}</div>
                            </button>
                      );
                    })}
                  </div>
              </div>

              {selectedScenario && SCENARIOS.find(s => s.id === selectedScenario)?.requiresExit && (
                <div className="p-4 bg-secondary/30 rounded-lg border border-trading-border space-y-4">
                  <h4 className="text-sm font-medium text-trading-accent">Exit Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-trading-muted">Exit Price *</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        placeholder="Exit price"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(e.target.value)}
                        className="bg-input border-trading-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-trading-muted">Exit Reason</Label>
                      <Select value={exitReason} onValueChange={setExitReason}>
                        <SelectTrigger className="bg-input border-trading-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-trading-border">
                          <SelectItem value="Target Hit">Target Hit</SelectItem>
                          <SelectItem value="Stop Loss">Stop Loss</SelectItem>
                          <SelectItem value="Manual Exit">Manual Exit</SelectItem>
                          <SelectItem value="Time Exit">Time Exit</SelectItem>
                          <SelectItem value="News Event">News Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="trading" 
                      onClick={closeTrade} 
                      disabled={!exitPrice}
                    >
                      Close Trade
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}