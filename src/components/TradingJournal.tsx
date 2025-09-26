import React, { useState, useEffect, useCallback } from 'react';
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

const SCENARIOS = [
  { id: 'move_be', title: '⚡ Move to Breakeven', desc: 'Move stop to entry price', requiresExit: false },
  { id: 'partial_25', title: '📊 Partial 25%', desc: 'Take 25% off at current price', requiresExit: true },
  { id: 'partial_50', title: '📊 Partial 50%', desc: 'Take 50% off at current price', requiresExit: true },
  { id: 'partial_80', title: '📊 Partial 80%', desc: 'Take majority off, let runner go', requiresExit: true },
  { id: 'full_exit', title: '✅ Full Exit', desc: 'Close entire position at current price', requiresExit: true, closeTrade: true },
  { id: 'stopped', title: '❌ Stopped Out', desc: 'Position hit stop loss', requiresExit: true, closeTrade: true },
  { id: 'target_hit', title: '🎯 Target Hit', desc: 'Position reached target', requiresExit: true, closeTrade: true },
  { id: 'manual_close', title: '🚪 Manual Close', desc: 'Manual exit based on conditions', requiresExit: true, closeTrade: true }
];

const ASSETS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'
];

// Trading Sessions (EST time zones)
const TRADING_SESSIONS = [
  {
    id: 'asian_range',
    name: 'Asian Range',
    start: { hour: 20, minute: 0 }, // 8:00 PM EST
    end: { hour: 4, minute: 0 }, // 4:00 AM EST (next day)
    localTime: '3:00 AM - 11:00 AM (+03)',
    color: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
    description: 'Consolidation period'
  },
  {
    id: 'london_killzone',
    name: 'London Killzone',
    start: { hour: 2, minute: 0 }, // 2:00 AM EST
    end: { hour: 5, minute: 0 }, // 5:00 AM EST
    localTime: '9:00 AM - 12:00 PM (+03)',
    color: 'bg-red-500/20 text-red-300 border-red-400/50',
    description: 'High volatility - London open'
  },
  {
    id: 'london_lunch',
    name: 'London Lunch',
    start: { hour: 7, minute: 0 }, // 7:00 AM EST
    end: { hour: 8, minute: 0 }, // 8:00 AM EST
    localTime: '2:00 PM - 3:00 PM (+03)',
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
    description: 'Lower volatility'
  },
  {
    id: 'london_ny_overlap',
    name: 'London vs. New York',
    start: { hour: 8, minute: 0 }, // 8:00 AM EST
    end: { hour: 12, minute: 0 }, // 12:00 PM EST
    localTime: '3:00 PM - 7:00 PM (+03)',
    color: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
    description: 'Key trading window - Major overlap'
  },
  {
    id: 'silver_bullet',
    name: 'Silver Bullet Hours',
    start: { hour: 10, minute: 0 }, // 10:00 AM EST
    end: { hour: 11, minute: 0 }, // 11:00 AM EST
    localTime: '5:00 PM - 6:00 PM (+03)',
    color: 'bg-green-500/20 text-green-300 border-green-400/50',
    description: 'Reversal window'
  },
  {
    id: 'ny_session',
    name: 'New York Session',
    start: { hour: 8, minute: 0 }, // 8:00 AM EST
    end: { hour: 17, minute: 0 }, // 5:00 PM EST
    localTime: '3:00 PM - 12:00 AM (+03)',
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
    description: 'Major U.S. trading hours'
  }
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
  
  // Trading states
  const [bias, setBias] = useState('');
  const [marketState, setMarketState] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<typeof EXECUTION_MODELS.OutOfBalance>([]);
  
  // Trade form
  const [tradeForm, setTradeForm] = useState({
    asset: 'EURUSD',
    side: 'Long' as 'Long' | 'Short',
    model: '',
    entry: '',
    stop: '',
    target: '',
    risk: '250',
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
  const [currentSession, setCurrentSession] = useState<typeof TRADING_SESSIONS[0] | null>(null);
  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Detect current trading session
      const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const currentHour = est.getHours();
      const currentMinute = est.getMinutes();
      
      const activeSession = TRADING_SESSIONS.find(session => {
        const startMinutes = session.start.hour * 60 + session.start.minute;
        const endMinutes = session.end.hour * 60 + session.end.minute;
        const currentMinutes = currentHour * 60 + currentMinute;
        
        // Handle overnight sessions (like Asian Range)
        if (startMinutes > endMinutes) {
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      });
      
      setCurrentSession(activeSession || null);
    }, 1000);
    return () => clearInterval(timer);
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
    
    // House of Money logic: After 3 trades, if profitable, activate house money
    const isHouseMoneyActive = todayTrades.length >= 3 && totalPnL > 0;
    
    // Disable day if 3 consecutive losses
    const isDayDisabled = lossTrades.length >= 3;
    
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
  
  // Calculate trading stats
  const calculateStats = useCallback((): KPIStats => {
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => (t.rMultiple || 0) > 0).length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgR = totalTrades > 0 ? closedTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0) / totalTrades : 0;
    
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const lossTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / lossTrades.length) : 0;
    
    const grossWin = winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;
    
    const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0;
    
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
    
    let multiplier = 10000; // Default for major FX pairs
    if (tradeForm.asset.includes("JPY")) multiplier = 100;
    if (tradeForm.asset.includes("XAU") || tradeForm.asset.includes("GOLD")) multiplier = 10;
    if (tradeForm.asset.includes("ES") || tradeForm.asset.includes("NQ") || tradeForm.asset.includes("BTC")) multiplier = 1;
    
    const pips = Math.abs((entry - stop) * multiplier);
    const riskReward = target ? Math.abs((target - entry) / (entry - stop)) : 0;
    
    return { pips: Math.round(pips * 10) / 10, riskReward: Math.round(riskReward * 100) / 100 };
  };
  
  const { pips, riskReward } = calculateRiskMetrics();
  
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
    setCurrentTrade(trade);
    setExitPrice('');
    setExitReason('Target Hit');
    setSelectedScenario('');
    setShowTradeSheet(true);
    
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
      rulesTracked: { ...currentRulesChecked }
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
  
  const resetDay = () => {
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
    // Reset risk back to default
    setTradeForm(prev => ({ ...prev, risk: '250' }));
    toast({ title: "Day Reset", description: "All trades and settings cleared." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-trading-border bg-background/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">Edge Day – Mechanical Trading Journal</h1>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline" className="bg-trading-card border-trading-border">
              <Clock className="mr-1 h-3 w-3" />
              {currentTime.toLocaleTimeString()}
            </Badge>
            {currentSession && (
              <Badge className={`${currentSession.color} border`}>
                <Globe className="mr-1 h-3 w-3" />
                {currentSession.name}
              </Badge>
            )}
            {dailyStats.isHouseMoneyActive && (
              <Badge className="bg-green-500/20 text-green-300 border-green-400/50">
                <Shield className="mr-1 h-3 w-3" />
                House Money
              </Badge>
            )}
            {dailyStats.isDayDisabled && (
              <Badge className="bg-red-500/20 text-red-300 border-red-400/50">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Day Disabled
              </Badge>
            )}
            <Button variant="terminal" size="sm" onClick={() => exportReport('md')} className="w-full sm:w-auto">
              <FileText className="mr-1 h-3 w-3" />
              Export MD
            </Button>
            <Button variant="terminal" size="sm" onClick={() => exportReport('csv')} className="w-full sm:w-auto">
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
            <Button variant="terminal" size="sm" onClick={() => exportReport('json')} className="w-full sm:w-auto">
              <Download className="mr-1 h-3 w-3" />
              JSON
            </Button>
            <Button variant="danger" size="sm" onClick={resetDay} className="w-full sm:w-auto">
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset Day
            </Button>
          </div>
        </div>
      </header>

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
                    <span className="text-sm font-medium">Day Disabled</span>
                  </div>
                  <p className="text-xs text-red-300/80 mt-1">
                    3 losses reached. No more trading today.
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
          {/* New Trade Form */}
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
                      {ASSETS.map(asset => (
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
                    placeholder="250"
                    value={tradeForm.risk}
                    onChange={(e) => setTradeForm({...tradeForm, risk: e.target.value})}
                    className="bg-input border-trading-border"
                  />
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
                    {dailyStats.isDayDisabled ? 'Day Disabled' : 'Add Trade'}
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
                      {openTrades.map(trade => (
                        <tr key={trade.id} className="border-b border-trading-border/50 hover:bg-secondary/30">
                          <td className="p-2">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                          <td className="p-2 font-medium">{trade.asset}</td>
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
                      ))}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-trading-accent">
                Manage Trade - {currentTrade.asset} {currentTrade.side}
              </CardTitle>
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
                  {SCENARIOS.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => executeScenario(scenario.id)}
                      className={`p-4 rounded-lg border text-left transition-all hover:border-trading-accent hover:bg-secondary/50 ${
                        selectedScenario === scenario.id 
                          ? 'border-trading-success bg-success/10' 
                          : 'border-trading-border bg-secondary/20'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">{scenario.title}</div>
                      <div className="text-xs text-trading-muted">{scenario.desc}</div>
                    </button>
                  ))}
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
    </div>
  );
}