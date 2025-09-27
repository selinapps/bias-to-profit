import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { isMeanReversionModel, isTrendModel } from '@/lib/executionModels';

type Trade = Database['public']['Tables']['trades']['Row'];

interface TradeHeatmapProps {
  trades: Trade[];
}

export function TradeHeatmap({ trades }: TradeHeatmapProps) {
  // Hour performance analysis
  const hourPerformance = trades.reduce((acc, trade) => {
    if (trade.status !== 'closed') return acc;
    
    const hour = new Date(trade.entry_time).getHours();
    if (!acc[hour]) {
      acc[hour] = { trades: 0, pnl: 0, wins: 0, totalR: 0 };
    }
    
    acc[hour].trades++;
    acc[hour].pnl += trade.pnl || 0;
    acc[hour].totalR += trade.r_multiple || 0;
    if ((trade.pnl || 0) > 0) acc[hour].wins++;
    
    return acc;
  }, {} as Record<number, { trades: number; pnl: number; wins: number; totalR: number }>);

  // Mistake impact analysis
  const mistakeImpact = trades.reduce((acc, trade) => {
    if (trade.status !== 'closed' || !trade.mistake_tags) return acc;
    
    trade.mistake_tags.forEach(mistake => {
      if (!acc[mistake]) {
        acc[mistake] = { count: 0, totalR: 0, totalPnL: 0 };
      }
      acc[mistake].count++;
      acc[mistake].totalR += trade.r_multiple || 0;
      acc[mistake].totalPnL += trade.pnl || 0;
    });
    
    return acc;
  }, {} as Record<string, { count: number; totalR: number; totalPnL: number }>);

  // Emotion correlation with losses
  const emotionAnalysis = trades.filter(trade => 
    trade.status === 'closed' && trade.emotions && (trade.pnl || 0) < 0
  ).reduce((acc, trade) => {
    if (!trade.emotions) return acc;
    
    Object.entries(trade.emotions as any).forEach(([emotion, value]) => {
      if (!acc[emotion]) {
        acc[emotion] = { sum: 0, count: 0, avgValue: 0 };
      }
      acc[emotion].sum += value as number;
      acc[emotion].count++;
      acc[emotion].avgValue = acc[emotion].sum / acc[emotion].count;
    });
    
    return acc;
  }, {} as Record<string, { sum: number; count: number; avgValue: number }>);

  // Model performance comparison
  const modelStats = {
    trend: trades.filter(t => t.status === 'closed' && isTrendModel(t.model)),
    mean_reversion: trades.filter(t => t.status === 'closed' && isMeanReversionModel(t.model))
  };

  const modelPerformance = Object.entries(modelStats).map(([model, modelTrades]) => {
    const wins = modelTrades.filter(t => (t.pnl || 0) > 0).length;
    const totalR = modelTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);
    const totalPnL = modelTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      model,
      trades: modelTrades.length,
      winRate: modelTrades.length > 0 ? (wins / modelTrades.length) * 100 : 0,
      avgR: modelTrades.length > 0 ? totalR / modelTrades.length : 0,
      totalPnL
    };
  });

  // Generate hour grid
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const getHourColor = (hour: number) => {
    const data = hourPerformance[hour];
    if (!data || data.trades === 0) return 'bg-muted/20';
    
    const winRate = (data.wins / data.trades) * 100;
    if (winRate >= 70) return 'bg-success/80';
    if (winRate >= 50) return 'bg-success/40';
    if (winRate >= 30) return 'bg-warning/40';
    return 'bg-destructive/40';
  };

  return (
    <div className="space-y-6">
      {/* Hour Performance Heatmap */}
      <Card className="bg-trading-card border-trading-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-trading-accent" />
            Trading Hour Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-12 gap-1">
              {hours.map(hour => {
                const data = hourPerformance[hour];
                const winRate = data ? (data.wins / data.trades) * 100 : 0;
                
                return (
                  <div
                    key={hour}
                    className={`aspect-square rounded p-1 text-xs font-medium flex flex-col items-center justify-center relative group cursor-pointer ${getHourColor(hour)}`}
                  >
                    <div className="text-[10px] text-foreground">{hour}</div>
                    {data && data.trades > 0 && (
                      <div className="text-[8px] text-foreground">{data.trades}</div>
                    )}
                    
                    {/* Tooltip */}
                    {data && data.trades > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-background border border-trading-border rounded p-2 text-xs whitespace-nowrap shadow-trading">
                          <div className="font-semibold">{hour}:00 - {hour + 1}:00</div>
                          <div>Trades: {data.trades}</div>
                          <div>Win Rate: {winRate.toFixed(0)}%</div>
                          <div>P&L: ${data.pnl.toFixed(2)}</div>
                          <div>Avg R: {(data.totalR / data.trades).toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success/80 rounded"></div>
                <span>70%+ Win Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success/40 rounded"></div>
                <span>50-70%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-warning/40 rounded"></div>
                <span>30-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-destructive/40 rounded"></div>
                <span>&lt;30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-muted/20 rounded"></div>
                <span>No trades</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Performance Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modelPerformance.map(model => (
          <Card key={model.model} className="bg-trading-card border-trading-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                {model.model === 'trend' ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-trading-accent" />
                )}
                {model.model.replace('_', ' ')} Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="font-bold">{model.trades}</span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span className="font-bold text-success">{model.winRate.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg R:</span>
                  <span className="font-bold text-trading-accent">{model.avgR.toFixed(2)}R</span>
                </div>
                <div className="flex justify-between">
                  <span>Total P&L:</span>
                  <span className={`font-bold ${model.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${model.totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mistake Impact Analysis */}
      {Object.keys(mistakeImpact).length > 0 && (
        <Card className="bg-trading-card border-trading-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Mistake Impact Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(mistakeImpact)
                .sort(([,a], [,b]) => Math.abs(b.totalR) - Math.abs(a.totalR))
                .map(([mistake, data]) => (
                  <div key={mistake} className="flex items-center justify-between p-3 bg-background rounded-lg border border-trading-border">
                    <div>
                      <div className="font-medium">{mistake}</div>
                      <div className="text-sm text-trading-muted">{data.count} occurrences</div>
                    </div>
                    <div className="text-right">
                      <div className="text-destructive font-bold">
                        {data.totalR.toFixed(2)}R lost
                      </div>
                      <div className="text-sm text-destructive">
                        ${data.totalPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotion Correlation with Losses */}
      {Object.keys(emotionAnalysis).length > 0 && (
        <Card className="bg-trading-card border-trading-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-trading-accent" />
              Emotion Correlation (Losing Trades)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(emotionAnalysis).map(([emotion, data]) => (
                <div key={emotion} className="flex items-center justify-between">
                  <span className="capitalize">{emotion.replace('_', ' ↔ ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-trading-muted">{data.count} losses</span>
                    <Badge variant={data.avgValue > 7 ? 'destructive' : data.avgValue > 4 ? 'secondary' : 'outline'}>
                      {data.avgValue.toFixed(1)} avg
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-background rounded-lg border border-trading-border">
              <p className="text-sm text-trading-muted">
                Higher emotion scores during losses may indicate psychological factors affecting performance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}