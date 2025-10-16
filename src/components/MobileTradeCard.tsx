import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useToast } from '@/hooks/use-toast';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import type { Database } from '@/integrations/supabase/types';
import { ManageTradeSheet } from './ManageTradeSheet';

type Trade = Database['public']['Tables']['trades']['Row'];

interface MobileTradeCardProps {
  trade: Trade;
  isOpen?: boolean;
  onEdit?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
}

export function MobileTradeCard({ trade, isOpen = false, onEdit, onDelete }: MobileTradeCardProps) {
  const { closeTrade, deleteTrade, refreshTrades } = useTradesOptimized();
  const { toast } = useToast();
  const { isMobile } = useMobileOptimizations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManageSheet, setShowManageSheet] = useState(false);

  const formatPrice = (price: number) => {
    if (trade.asset?.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-muted-foreground';
  };

  const getPnLIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp className="h-3 w-3" />;
    if (pnl < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card className="bg-trading-card border-trading-border hover:border-trading-accent/30 transition-colors">
      <CardContent className="p-2">
        {/* Compact Main Row - Most Important Info */}
        <div className="flex items-center justify-between">
          {/* Left: Asset, Direction & Status */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {trade.direction === 'long' ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className="font-semibold text-sm truncate">{trade.asset}</span>
            </div>
            <Badge variant="outline" className="text-xs px-1 py-0.5 h-5">
              {trade.direction.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-xs px-1 py-0.5 h-5">
              {trade.risk_tier.toUpperCase()}
            </Badge>
          </div>

          {/* Center: Entry Price (Most Important Price) */}
          <div className="text-center min-w-0">
            <div className="text-xs text-trading-muted">Entry</div>
            <div className="font-mono text-sm font-bold">{formatPrice(Number(trade.entry_price))}</div>
          </div>

          {/* Right: P&L & Actions */}
          <div className="flex items-center gap-1.5">
            {!isOpen && trade.status === 'closed' && (
              <div className="text-right min-w-0">
                <div className={`text-sm font-bold flex items-center gap-0.5 ${getPnLColor(trade.pnl || 0)}`}>
                  {getPnLIcon(trade.pnl || 0)}
                  ${(trade.pnl || 0).toFixed(0)}
                </div>
                <div className="text-xs text-trading-accent">
                  {trade.r_multiple ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple.toFixed(1)}R` : '0.0R'}
                </div>
              </div>
            )}
            
            {isOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManageSheet(true)}
                className="h-7 px-2 text-xs bg-gradient-to-r from-purple-950/50 to-blue-950/50 border-trading-accent/50 hover:border-trading-accent hover:bg-purple-950/70"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
            
            {!isOpen && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(trade)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Secondary Info */}
        <div className="flex items-center justify-between mt-1 text-xs text-trading-muted">
          <div className="flex items-center gap-1.5">
            <span>{formatTime(trade.entry_time)}</span>
            <span>•</span>
            <span className="truncate">{(Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : (trade.notes || 'Unknown'))?.replace(/_/g, ' ')}</span>
            {trade.duration_minutes && (
              <>
                <span>•</span>
                <span>
                  {Math.floor(trade.duration_minutes / 60)}h{trade.duration_minutes % 60}m
                </span>
              </>
            )}
          </div>
          
          {!isOpen && trade.exit_time && (
            <span className="text-xs">Closed {formatTime(trade.exit_time)}</span>
          )}
        </div>

        {/* Expanded Details for Closed Trades */}
        {isExpanded && !isOpen && (
          <div className="mt-3 pt-3 border-t border-trading-border space-y-3">
            {/* Price Levels & Risk */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/20 rounded p-2 text-center">
                <div className="text-trading-muted mb-1">Stop Loss</div>
                <div className="font-mono font-semibold">{formatPrice(Number(trade.stop_loss))}</div>
              </div>
              <div className="bg-muted/20 rounded p-2 text-center">
                <div className="text-trading-muted mb-1">Exit Price</div>
                <div className="font-mono font-semibold">
                  {trade.exit_price ? formatPrice(Number(trade.exit_price)) : 'N/A'}
                </div>
              </div>
              <div className="bg-muted/20 rounded p-2 text-center">
                <div className="text-trading-muted mb-1">Risk Amount</div>
                <div className="font-mono font-semibold">${Number(trade.risk_amount).toFixed(0)}</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gradient-to-r from-blue-950/20 to-blue-950/10 rounded p-2 border border-blue-500/20">
                <div className="text-blue-300 mb-1">Duration</div>
                <div className="font-semibold">
                  {trade.duration_minutes ? 
                    `${Math.floor(trade.duration_minutes / 60)}h ${trade.duration_minutes % 60}m` : 
                    'N/A'
                  }
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-950/20 to-purple-950/10 rounded p-2 border border-purple-500/20">
                <div className="text-purple-300 mb-1">Model</div>
                <div className="font-semibold">{(Array.isArray(trade.locations) && trade.locations.length > 0 ? String(trade.locations[0]) : (trade.notes || 'Unknown'))?.replace(/_/g, ' ').toUpperCase()}</div>
              </div>
            </div>

            {/* Trade Lessons */}
            {trade.trade_lessons && (
              <div className="bg-gradient-to-br from-purple-950/30 to-blue-950/30 rounded p-2 border border-purple-400/30">
                <div className="text-xs font-semibold text-purple-300 mb-1">📚 Lessons</div>
                <p className="text-xs text-trading-muted">{trade.trade_lessons}</p>
              </div>
            )}

            {/* Mistakes & Good Actions */}
            <div className="space-y-2">
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

              {trade.good_actions && trade.good_actions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-green-300 mb-1">✅ Good Actions</div>
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

            {/* Screenshot */}
            {trade.screenshot_url && (
              <div className="relative group">
                <img 
                  src={trade.screenshot_url} 
                  alt="Trade screenshot" 
                  className="w-full h-32 object-cover rounded border border-trading-border cursor-pointer transition-transform group-hover:scale-[1.02]"
                  onClick={() => window.open(trade.screenshot_url!, '_blank')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded pointer-events-none" />
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
        onCloseTrade={async (tradeId, exitPrice, lessons, mistakeTags, goodActions, screenshotUrl, exitTime, manualPnL) => {
          // Handle close trade with lessons
          await closeTrade(tradeId, exitPrice);
          refreshTrades();
        }}
        isMobile={isMobile}
        onRefresh={refreshTrades}
      />
    </Card>
  );
}