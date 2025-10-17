import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Edit3, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useToast } from '@/hooks/use-toast';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import type { Database } from '@/integrations/supabase/types';
import { 
  type ActionHintKey,
  type ActionHintEmphasis
} from '@/lib/orderFlowHints';
import { ManageTradeSheet } from './ManageTradeSheet';
import { PostTradeObservationModal } from './PostTradeObservationModal';
import { supabase } from '@/integrations/supabase/client';
import { getPipValueConfig } from '@/lib/tradingCalculations';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradeCardProps {
  trade: Trade;
  isOpen?: boolean;
  onEdit?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
}

const EmphasisClasses: Record<ActionHintEmphasis, string> = {
  neutral: 'border-trading-border text-trading-muted bg-muted/5',
  positive: 'border-trading-success text-trading-success bg-success/10',
  warning: 'border-yellow-500/70 text-yellow-300 bg-yellow-500/10',
  danger: 'border-red-500/70 text-red-300 bg-red-500/10'
};

export function TradeCard({ trade, isOpen = false, onEdit, onDelete }: TradeCardProps) {
  const { closeTrade, updateTrade, deleteTrade, refreshTrades } = useTradesOptimized();
  const { toast } = useToast();
  const { isMobile } = useMobileOptimizations();
  const [exitPrice, setExitPrice] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [orderFlowActions, setOrderFlowActions] = useState<Record<string, { action: string; timestamp: number }>>({});

  const handleCloseTrade = async () => {
    if (!exitPrice || isClosing) return;
    
    setIsClosing(true);
    try {
      await closeTrade(trade.id, parseFloat(exitPrice));
      toast({
        title: "Trade Closed",
        description: "Trade has been moved to closed trades",
        variant: "default"
      });
      setExitPrice('');
      
      // Refresh the trades list to update the display
      setTimeout(() => {
        refreshTrades();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close trade",
        variant: "destructive"
      });
    } finally {
      setIsClosing(false);
    }
  };

  const handleCloseTradeWithLessons = async (
    tradeId: string, 
    exitPrice: number, 
    lessons: string, 
    mistakeTags: string[], 
    goodActions: string[],
    screenshotUrl?: string,
    exitTime?: string,
    manualPnL?: number,
    tradeManagement?: any
  ) => {
    // ✅ Calculate efficiency if MAE/MFE provided
    // First calculate the actual P&L that will be saved
    const lotSize = trade.lot_size || 1.0;
    const asset = trade.asset || 'EURUSD';
    const priceDiff = trade.direction === 'long' 
      ? exitPrice - trade.entry_price
      : trade.entry_price - exitPrice;
    const { pipValuePerLot, pipMultiplier } = getPipValueConfig(asset);
    const pips = priceDiff / pipMultiplier;
    const grossProfit = pips * pipValuePerLot * lotSize;
    const commission = lotSize * 7.5;
    const calculatedPnL = grossProfit - commission;
    
    // Use manual P&L if provided, otherwise use calculated
    const finalPnL = manualPnL !== undefined ? manualPnL : calculatedPnL;
    
    let efficiency = null;
    if (tradeManagement?.mfeR && tradeManagement.mfeR > 0) {
      const riskAmount = trade.risk_amount || 500;
      const rMultiple = riskAmount > 0 ? finalPnL / riskAmount : 0;
      efficiency = Math.min(1.0, Math.abs(rMultiple / tradeManagement.mfeR));
    }

    // First update the trade with lessons, tags, screenshot, exit time, and NEW SCHEMA fields
    await supabase
      .from('trades')
      .update({
        trade_lessons: lessons || null,
        mistake_tags: mistakeTags.length > 0 ? mistakeTags : [],
        good_actions: goodActions.length > 0 ? goodActions : [],
        screenshot_url: screenshotUrl || trade.screenshot_url,
        exit_time: exitTime || null,
        // ✅ NEW SCHEMA: MAE/MFE Analytics
        mae_r: tradeManagement?.maeR || null,
        mfe_r: tradeManagement?.mfeR || null,
        efficiency: efficiency,
        // ✅ NEW SCHEMA: Trade Management
        moved_to_be: tradeManagement?.movedToBreakeven || false,
        be_trigger_r: tradeManagement?.movedToBEAtR || null,
        partial_at_2r: tradeManagement?.partialCloseAt2R || false,
        used_trailing_stop: tradeManagement?.trailingStopUsed || false,
        orderflow_exit: tradeManagement?.orderflowBasedExit || false,
        exit_reason: tradeManagement?.finalExitReason || null,
      })
      .eq('id', tradeId);

    // Then close the trade (this calculates P&L and R-Multiple)
    await closeTrade(tradeId, exitPrice);
    
    // Refresh the trades list to update the display
    setTimeout(() => {
      refreshTrades();
    }, 500);
  };

  const handleOrderFlowAction = (action: string, description: string) => {
    const timestamp = Date.now();
    setOrderFlowActions(prev => ({
      ...prev,
      [action]: { action: description, timestamp }
    }));
    
    toast({
      title: "Order Flow Action Recorded",
      description: `${description} - ${new Date(timestamp).toLocaleTimeString()}`,
      variant: "default"
    });
  };

  // Calculate current P/L if we have an exit price
  const currentPrice = parseFloat(exitPrice) || 0;
  const entryPrice = Number(trade.entry_price);
  const stopPrice = Number(trade.stop_loss);
  
  // Calculate R-Multiple using CORRECT logic: P&L / Risk Amount
  const rMultiple = trade.risk_amount > 0 && trade.pnl ? 
    Number((trade.pnl / trade.risk_amount).toFixed(3)) : 0;
  
  // Calculate price difference and estimated P&L
  const priceDiff = trade.direction === 'long' 
    ? currentPrice - entryPrice 
    : entryPrice - currentPrice;
  const estimatedPnL = entryPrice > 0 && currentPrice > 0 ? 
    (priceDiff / entryPrice) * trade.risk_amount : 0;
  
  // Calculate stop distance
  const stopDistance = Math.abs(entryPrice - trade.stop_loss);


  const formatPrice = (price: number) => {
    if (trade.asset?.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {trade.direction === 'long' ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="font-semibold text-foreground">{trade.asset}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {trade.direction.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {trade.risk_tier.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Entry Price - Most Important */}
            <div className="text-center">
              <div className="text-xs text-trading-muted">Entry Price</div>
              <div className="font-mono font-bold text-sm">{formatPrice(Number(trade.entry_price))}</div>
            </div>
            
            {/* P&L Display */}
            {currentPrice > 0 && (
              <div className="text-right">
                <div className={`font-bold text-sm ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${estimatedPnL.toFixed(2)}
                </div>
                <div className="text-xs text-trading-accent">
                  {rMultiple.toFixed(2)}R
                </div>
              </div>
            )}
            
            {/* Stop Loss */}
            <div className="text-center">
              <div className="text-xs text-trading-muted">Stop Loss</div>
              <div className="font-mono font-bold text-sm">{formatPrice(Number(trade.stop_loss))}</div>
            </div>
            
            {/* Manage Button */}
            {isOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManageSheet(true)}
                className="shrink-0 bg-gradient-to-r from-purple-950/50 to-blue-950/50 border-trading-accent/50 hover:border-trading-accent hover:bg-purple-950/70"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Manage
              </Button>
            )}
            {!isOpen && (
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(trade)}
                    className="shrink-0"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {trade.status === 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowObservationModal(true)}
                    className="shrink-0 border-cyan-400/50 hover:border-cyan-400 hover:bg-cyan-950/30"
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Observation
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="shrink-0"
                >
                  {isExpanded ? 'Hide' : 'Details'}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Trade Info */}
        <div className="flex items-center justify-between text-xs text-trading-muted mt-2">
          <span>{format(new Date(trade.entry_time), 'MMM d, HH:mm')} • {(Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : (trade.notes || 'Unknown'))?.replace(/_/g, ' ')}</span>
          {Object.keys(orderFlowActions).length > 0 && (
            <span className="text-trading-accent">
              {Object.keys(orderFlowActions).length} actions recorded
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Expanded Details - Different content for open vs closed trades */}
        {isExpanded && (
          <div className="space-y-4">
            {isOpen ? (
              // Open trade details - Live P/L Calculator
              <>
                <div className="space-y-2">
                  <Label htmlFor="exit-price" className="text-sm font-medium">Current Price</Label>
                  <Input
                    id="exit-price"
                    type="number"
                    step="0.00001"
                    placeholder="Enter current market price..."
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="text-lg font-mono"
                  />
                  {currentPrice > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-trading-muted">Current P&L:</span>
                        <div className="text-right">
                          <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${estimatedPnL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-trading-muted">Risk/Reward:</span>
                        <div className="text-right">
                          <span className="text-trading-accent font-bold">
                            {rMultiple.toFixed(2)}R
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-trading-muted">Distance to Stop:</span>
                        <div className="text-right">
                          <span className={`font-bold ${Math.abs(entryPrice - currentPrice) < stopDistance ? 'text-warning' : 'text-trading-muted'}`}>
                            {((Math.abs(entryPrice - currentPrice) / stopDistance) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Order Flow Actions */}
                <div>
              <h4 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                📊 Order Flow Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">⚡ Move to Breakeven</div>
                  <div className="text-xs text-trading-muted mb-2">
                    CVD aligns + last swing breaks
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOrderFlowAction('move_be', 'Move to Breakeven')}
                      className="w-full"
                    >
                      Move to BE
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">🛡️ Trail Stop</div>
                  <div className="text-xs text-trading-muted mb-2">
                    Trail behind aggression node
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOrderFlowAction('trail_stop', 'Trail Stop')}
                      className="w-full"
                    >
                      Trail Stop
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">📊 Take Partial</div>
                  <div className="text-xs text-trading-muted mb-2">
                    Scale out at VWAP σ2
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOrderFlowAction('partial_25', 'Take 25% Partial')}
                        className="flex-1"
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOrderFlowAction('partial_50', 'Take 50% Partial')}
                        className="flex-1"
                      >
                        50%
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">🎯 POC Exit</div>
                  <div className="text-xs text-trading-muted mb-2">
                    Exit into balance magnet
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOrderFlowAction('poc_exit', 'POC Exit')}
                      className="w-full"
                    >
                      Exit @ POC
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">💾 Save Delta</div>
                  <div className="text-xs text-trading-muted mb-2">
                    Bank gains before delta flips
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOrderFlowAction('save_delta', 'Save Delta')}
                      className="w-full"
                    >
                      Save Delta
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-trading-border bg-secondary/20">
                  <div className="font-semibold text-sm mb-1">✅ Full Exit</div>
                  <div className="text-xs text-trading-muted mb-2">
                    Close when flow flips
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="Current price..."
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="text-sm font-mono h-8"
                    />
                    {currentPrice > 0 && (
                      <div className="text-xs text-trading-muted">
                        P&L: <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${estimatedPnL.toFixed(2)}
                        </span> • R: <span className="text-trading-accent font-bold">{rMultiple.toFixed(2)}R</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOrderFlowAction('full_exit', 'Full Exit')}
                      className="w-full"
                    >
                      Full Exit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recorded Actions */}
            {Object.keys(orderFlowActions).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-trading-accent uppercase tracking-wide">
                  📝 Recorded Actions
                </h4>
                <div className="space-y-1">
                  {Object.entries(orderFlowActions).map(([key, action]) => (
                    <div key={key} className="flex items-center justify-between text-xs bg-secondary/30 rounded p-2">
                      <span>{action.action}</span>
                      <span className="text-trading-muted">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Manual Close */}
            <div className="flex gap-2">
              <Button
                onClick={handleCloseTrade}
                disabled={!exitPrice || isClosing}
                className="flex-1"
                size="lg"
              >
                {isClosing ? 'Closing...' : 'Close Trade'}
              </Button>
              <Button
                variant="outline"
                onClick={() => deleteTrade(trade.id)}
                size="lg"
              >
                Cancel
              </Button>
            </div>
              </>
            ) : (
              // Closed trade details - Show useful information
              <div className="space-y-4">
                {/* Trade Summary */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                    📊 Trade Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-trading-muted">Entry Time:</span>
                      <div className="font-mono text-xs">
                        {format(new Date(trade.entry_time), 'MMM d, HH:mm:ss')}
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Exit Time:</span>
                      <div className="font-mono text-xs">
                        {trade.exit_time ? format(new Date(trade.exit_time), 'MMM d, HH:mm:ss') : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Duration:</span>
                      <div className="font-mono text-xs">
                        {trade.duration_minutes ? 
                          `${Math.floor(trade.duration_minutes / 60)}h ${trade.duration_minutes % 60}m` :
                          'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Exit Reason:</span>
                      <div className="font-mono text-xs">
                        {(trade as any).exit_reason || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                    📈 Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-trading-muted">Entry Price:</span>
                      <div className="font-mono text-xs">
                        ${Number(trade.entry_price).toFixed(5)}
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Exit Price:</span>
                      <div className="font-mono text-xs">
                        {trade.exit_price ? `$${Number(trade.exit_price).toFixed(5)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Stop Loss:</span>
                      <div className="font-mono text-xs">
                        ${Number(trade.stop_loss).toFixed(5)}
                      </div>
                    </div>
                    <div>
                      <span className="text-trading-muted">Risk Amount:</span>
                      <div className="font-mono text-xs">
                        ${Number(trade.risk_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Lessons */}
                {trade.trade_lessons && (
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                      📚 Trade Lessons
                    </h4>
                    <div className="text-sm mt-1">{trade.trade_lessons}</div>
                  </div>
                )}

                {/* Order Flow Data */}
                {(trade as any).order_flow_data && (
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3 text-trading-accent uppercase tracking-wide">
                      📊 Order Flow Data
                    </h4>
                    <div className="text-xs text-trading-muted">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify((trade as any).order_flow_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isOpen && trade.notes && (
          <div className="mt-2 text-sm text-trading-muted bg-muted/20 rounded p-2">
            {trade.notes}
          </div>
        )}

        {/* Redesigned Performance Display for closed trades */}
        {!isOpen && trade.status === 'closed' && (
          <div className="mt-3 space-y-3">
            {/* Key Performance Metrics */}
            <div className="bg-gradient-to-r from-background/50 to-background/30 border border-trading-border rounded-lg p-4">
              {/* Top Row - Main Performance */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-sm text-trading-muted mb-1">P&L</div>
                  <div className={`text-2xl font-bold ${
                    (trade.pnl || 0) > 0 ? 'text-green-400' : (trade.pnl || 0) < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    ${(trade.pnl || 0).toFixed(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-trading-muted mb-1">R Multiple</div>
                  <div className={`text-2xl font-bold ${
                    (trade.r_multiple || 0) > 0 ? 'text-green-400' : (trade.r_multiple || 0) < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    {trade.r_multiple ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R` : '0.00R'}
                  </div>
                </div>
              </div>
              
              {/* Bottom Row - Key Details */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-trading-muted">Lot Size</div>
                  <div className="font-semibold">{(trade as any).lot_size || 1.0}</div>
                </div>
                <div className="text-center">
                  <div className="text-trading-muted">Duration</div>
                  <div className="font-semibold">
                    {trade.duration_minutes ? 
                      `${Math.floor(trade.duration_minutes / 60)}h ${trade.duration_minutes % 60}m` : 
                      '—'
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-trading-muted">Closed</div>
                  <div className="font-semibold">
                    {trade.exit_time ? format(new Date(trade.exit_time), 'HH:mm') : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshot */}
            {trade.screenshot_url && (
              <div className="relative group">
                <img 
                  src={trade.screenshot_url} 
                  alt="Trade screenshot" 
                  className="w-full h-48 object-cover rounded-lg border border-trading-border cursor-pointer transition-transform group-hover:scale-[1.02]"
                  onClick={() => window.open(trade.screenshot_url!, '_blank')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none" />
              </div>
            )}

            {/* Trade Lessons */}
            {trade.trade_lessons && (
              <div className="p-3 bg-gradient-to-br from-purple-950/30 to-blue-950/30 rounded-lg border border-purple-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-purple-300">📚 Lessons Learned</span>
                </div>
                <p className="text-sm text-trading-muted">{trade.trade_lessons}</p>
              </div>
            )}

            {/* Mistakes */}
            {trade.mistake_tags && trade.mistake_tags.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-300 mb-1">❌ Mistakes</div>
                <div className="flex flex-wrap gap-1">
                  {trade.mistake_tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-red-950/30 border-red-500/50 text-red-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Good Actions */}
            {trade.good_actions && trade.good_actions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-300 mb-1">✅ What Went Well</div>
                <div className="flex flex-wrap gap-1">
                  {trade.good_actions.map((action, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-green-950/30 border-green-500/50 text-green-300">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Manage Trade Sheet */}
        <ManageTradeSheet
          isOpen={showManageSheet}
          onClose={() => setShowManageSheet(false)}
          trade={trade}
          onCloseTrade={handleCloseTradeWithLessons}
          isMobile={isMobile}
          onRefresh={refreshTrades}
        />

        <PostTradeObservationModal
          isOpen={showObservationModal}
          onClose={() => setShowObservationModal(false)}
          trade={trade}
          onSuccess={refreshTrades}
        />
    </Card>
  );
}