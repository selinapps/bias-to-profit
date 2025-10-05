import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Trade = Database['public']['Tables']['trades']['Row'];

interface ImprovedTradeCardProps {
  trade: Trade;
  isOpen: boolean;
  onEdit?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
  onView?: (trade: Trade) => void;
}

export function ImprovedTradeCard({ 
  trade, 
  isOpen, 
  onEdit, 
  onDelete, 
  onView 
}: ImprovedTradeCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatRMultiple = (value?: number | null) => {
    if (typeof value !== 'number') return '0.00R';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}R`;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'long' ? TrendingUp : TrendingDown;
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'long' ? 'text-success' : 'text-destructive';
  };

  const getPnLColor = (pnl?: number | null) => {
    if (typeof pnl !== 'number') return 'text-muted-foreground';
    return pnl > 0 ? 'text-success' : pnl < 0 ? 'text-destructive' : 'text-muted-foreground';
  };

  const getRiskTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'a': return 'bg-success/20 text-success border-success/50';
      case 'b': return 'bg-warning/20 text-warning border-warning/50';
      case 'c': return 'bg-destructive/20 text-destructive border-destructive/50';
      default: return 'bg-muted/20 text-muted-foreground border-muted/50';
    }
  };

  const DirectionIcon = getDirectionIcon(trade.direction);

  return (
    <Card className={`bg-trading-card border-trading-border hover:border-trading-accent/50 transition-all ${
      isOpen ? 'ring-2 ring-trading-accent/20' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getDirectionColor(trade.direction)} bg-secondary/50`}>
                  <DirectionIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{trade.asset}</span>
                    <Badge variant="outline" className="text-xs">
                      {trade.direction.toUpperCase()}
                    </Badge>
                    <Badge className={`text-xs ${getRiskTierColor(trade.risk_tier)}`}>
                      {trade.risk_tier.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-trading-muted">
                    {format(new Date(trade.entry_time), 'MMM d, HH:mm')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOpen && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Open
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Price Levels */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-trading-muted">Entry</div>
                <div className="font-mono font-semibold">{trade.entry_price}</div>
              </div>
              <div>
                <div className="text-xs text-trading-muted">Stop</div>
                <div className="font-mono font-semibold">{trade.stop_loss}</div>
              </div>
              <div>
                <div className="text-xs text-trading-muted">Target</div>
                <div className="font-mono font-semibold">
                  {trade.exit_price || '—'}
                </div>
              </div>
            </div>

            {/* Performance - Enhanced for closed trades */}
            {!isOpen && (
              <div className="bg-gradient-to-r from-background/50 to-background/30 border border-trading-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-trading-muted">Lot Size:</span>
                    <span className="font-semibold text-foreground">
                      {(trade as any).lot_size || 1.0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-trading-muted">Duration:</span>
                    <span className="font-semibold text-foreground">
                      {trade.duration_minutes ? 
                        `${Math.floor(trade.duration_minutes / 60)}h ${trade.duration_minutes % 60}m` : 
                        '—'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-trading-muted mb-1">P&L</div>
                    <div className={`text-lg font-bold ${getPnLColor(trade.pnl)}`}>
                      {formatCurrency(trade.pnl || 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-trading-muted mb-1">R Multiple</div>
                    <div className={`text-lg font-bold ${getPnLColor(trade.r_multiple)}`}>
                      {formatRMultiple(trade.r_multiple)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model & Risk */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-trading-muted">Model:</span>
                <Badge variant="outline" className="text-xs">
                  {trade.model}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-trading-muted">Risk:</span>
                <span className="font-semibold">{formatCurrency(trade.risk_amount)}</span>
              </div>
            </div>

            {/* Duration for closed trades */}
            {!isOpen && trade.duration_minutes && (
              <div className="flex items-center gap-2 text-xs text-trading-muted">
                <Clock className="h-3 w-3" />
                <span>Duration: {Math.floor(trade.duration_minutes / 60)}h {trade.duration_minutes % 60}m</span>
              </div>
            )}

            {/* Notes */}
            {trade.notes && (
              <div className="text-xs text-trading-muted bg-secondary/30 p-2 rounded">
                {trade.notes}
              </div>
            )}

            {/* Emotions for closed trades */}
            {!isOpen && trade.emotions && (
              <div className="space-y-1">
                <div className="text-xs text-trading-muted">Emotions:</div>
                <div className="flex gap-2">
                  {Object.entries(trade.emotions as any).map(([emotion, value]) => (
                    <div key={emotion} className="text-xs">
                      <span className="capitalize">{emotion.replace('_', ' ')}:</span>
                      <span className="ml-1 font-semibold">{value as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mistake tags */}
            {trade.mistake_tags && trade.mistake_tags.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-trading-muted">Mistakes:</div>
                <div className="flex flex-wrap gap-1">
                  {trade.mistake_tags.map((mistake, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {mistake}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Menu */}
          {showActions && (
            <div className="absolute right-2 top-12 bg-trading-card border border-trading-border rounded-lg shadow-lg z-10 min-w-[120px]">
              <div className="p-1">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onView(trade);
                      setShowActions(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Eye className="h-3 w-3 mr-2" />
                    View
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onEdit(trade);
                      setShowActions(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelete(trade);
                      setShowActions(false);
                    }}
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
