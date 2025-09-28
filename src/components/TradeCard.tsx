import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Target, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useTrades } from '@/hooks/useTrades';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { 
  generateOrderFlowSnapshot, 
  deriveActionHints, 
  getAggressionBadge, 
  type OrderFlowTradeInput,
  type ActionHintKey,
  type ActionHintEmphasis
} from '@/lib/orderFlowHints';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradeCardProps {
  trade: Trade;
  isOpen?: boolean;
}

const EmphasisClasses: Record<ActionHintEmphasis, string> = {
  neutral: 'border-trading-border text-trading-muted bg-muted/5',
  positive: 'border-trading-success text-trading-success bg-success/10',
  warning: 'border-yellow-500/70 text-yellow-300 bg-yellow-500/10',
  danger: 'border-red-500/70 text-red-300 bg-red-500/10'
};

export function TradeCard({ trade, isOpen = false }: TradeCardProps) {
  const { closeTrade, updateTrade, deleteTrade } = useTrades();
  const { toast } = useToast();
  const [exitPrice, setExitPrice] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [orderFlowSnapshot, setOrderFlowSnapshot] = useState<ReturnType<typeof generateOrderFlowSnapshot> | null>(null);

  // Generate order flow data for open trades
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const tradeInput: OrderFlowTradeInput = {
        id: trade.id,
        side: trade.direction === 'long' ? 'Long' : 'Short',
        entry: Number(trade.entry_price),
        stop: Number(trade.stop_loss),
        asset: trade.asset,
        model: trade.model
      };

      const snapshot = generateOrderFlowSnapshot(tradeInput, Date.now());
      setOrderFlowSnapshot(snapshot);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [isOpen, trade.id, trade.direction, trade.entry_price, trade.stop_loss, trade.asset, trade.model]);

  const handleCloseTrade = async () => {
    if (!exitPrice || isClosing) return;
    
    setIsClosing(true);
    try {
      await closeTrade(trade.id, parseFloat(exitPrice));
      toast({
        title: "Trade Closed",
        description: "Trade has been successfully closed",
        variant: "default"
      });
      setExitPrice('');
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

  const handleQuickAction = async (action: ActionHintKey, price?: number) => {
    try {
      switch (action) {
        case 'move_be':
          await updateTrade(trade.id, { stop_loss: trade.entry_price });
          toast({
            title: "Stop Moved to BE",
            description: "Stop loss moved to break-even",
            variant: "default"
          });
          break;
        case 'trail_stop':
          if (orderFlowSnapshot?.trailStopPrice) {
            await updateTrade(trade.id, { stop_loss: orderFlowSnapshot.trailStopPrice });
            toast({
              title: "Stop Trailed",
              description: `Stop loss updated to ${orderFlowSnapshot.trailStopPrice}`,
              variant: "default"
            });
          }
          break;
        case 'partial':
        case 'full_exit':
        case 'poc_tp':
        case 'save_delta':
          if (price) {
            await closeTrade(trade.id, price);
            toast({
              title: "Trade Closed",
              description: "Trade closed based on order flow hint",
              variant: "default"
            });
          }
          break;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "destructive"
      });
    }
  };

  // Calculate current P/L if we have an exit price
  const currentPrice = parseFloat(exitPrice) || 0;
  const entryPrice = Number(trade.entry_price);
  const stopPrice = Number(trade.stop_loss);
  
  const priceDiff = trade.direction === 'long' 
    ? currentPrice - entryPrice 
    : entryPrice - currentPrice;
  
  const stopDistance = Math.abs(entryPrice - stopPrice);
  const rMultiple = stopDistance > 0 && currentPrice > 0 ? priceDiff / stopDistance : 0;
  const estimatedPnL = entryPrice > 0 && currentPrice > 0 ? 
    (priceDiff / entryPrice) * trade.risk_amount : 0;

  // Get order flow hints
  const tradeInput: OrderFlowTradeInput = {
    id: trade.id,
    side: trade.direction === 'long' ? 'Long' : 'Short',
    entry: Number(trade.entry_price),
    stop: Number(trade.stop_loss),
    asset: trade.asset,
    model: trade.model
  };

  const hints = orderFlowSnapshot ? 
    deriveActionHints(tradeInput, orderFlowSnapshot, { guardrailActive: false }) : 
    null;

  const aggressionBadge = getAggressionBadge(orderFlowSnapshot);

  const formatPrice = (price: number) => {
    if (trade.asset?.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
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
            <div className="text-sm text-trading-muted">
              {format(new Date(trade.entry_time), 'MMM d, HH:mm')} • {trade.model?.replace(/_/g, ' ')}
            </div>
            {aggressionBadge && (
              <Badge className={aggressionBadge.className}>
                {aggressionBadge.shortLabel}
              </Badge>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-sm text-trading-muted">Entry: {formatPrice(Number(trade.entry_price))}</div>
            <div className="text-sm text-trading-muted">Stop: {formatPrice(Number(trade.stop_loss))}</div>
            {trade.exit_price && (
              <>
                <div className="text-sm text-trading-muted">Exit: {formatPrice(Number(trade.exit_price))}</div>
                <div className={`font-bold text-sm ${(trade.pnl || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${trade.pnl?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-trading-accent">
                  {trade.r_multiple?.toFixed(2) || '0.00'}R
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isOpen && (
          <div className="space-y-4">
            {/* Live P/L Calculator */}
            <div className="space-y-2">
              <Label htmlFor="exit-price" className="text-sm font-medium">Exit Price</Label>
              <Input
                id="exit-price"
                type="number"
                step="0.00001"
                placeholder="Enter exit price..."
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="text-lg font-mono"
              />
              {currentPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-trading-muted">Live P&L:</span>
                  <div className="text-right">
                    <span className={`font-bold ${estimatedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${estimatedPnL.toFixed(2)}
                    </span>
                    <span className="text-trading-accent ml-2">
                      {rMultiple.toFixed(2)}R
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Order Flow Hints */}
            {hints && orderFlowSnapshot && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4" />
                  Order Flow Actions
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(hints).map(([key, hint]) => {
                    if (key === 'guardrail') return null; // Skip guardrail for individual trades
                    
                    return (
                      <div 
                        key={key}
                        className={`rounded-lg border p-3 transition-all ${EmphasisClasses[hint.emphasis]} ${
                          hint.isActive ? 'ring-1 ring-current' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium leading-tight">
                              {hint.message}
                            </div>
                            <div className="text-xs opacity-75 mt-1 truncate">
                              {hint.signalLine}
                            </div>
                          </div>
                          {hint.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-7 text-xs"
                              onClick={() => {
                                const targetPrice = key === 'poc_tp' && orderFlowSnapshot.pocLevel 
                                  ? orderFlowSnapshot.pocLevel 
                                  : currentPrice || Number(trade.entry_price);
                                handleQuickAction(key as ActionHintKey, targetPrice);
                              }}
                            >
                              {key === 'move_be' ? 'Move BE' : 
                               key === 'trail_stop' ? 'Trail' :
                               key === 'partial' ? 'Partial' :
                               key === 'full_exit' ? 'Exit' :
                               key === 'poc_tp' ? 'TP@POC' :
                               key === 'save_delta' ? 'Bank' : 'Execute'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
          </div>
        )}

        {!isOpen && trade.notes && (
          <div className="mt-2 text-sm text-trading-muted bg-muted/20 rounded p-2">
            {trade.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}