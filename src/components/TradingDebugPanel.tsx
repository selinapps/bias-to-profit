import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useTradingStats } from '@/hooks/useTradingStats';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Bug, Database, Activity } from 'lucide-react';
import { logger } from '@/lib/logger';

export function TradingDebugPanel() {
  const { user } = useAuth();
  const { trades, openTrades, closedTrades, loading, refreshTrades } = useTradesOptimized();
  const { todayPerformance, modelPerformance, dailyLosses, refreshStats } = useTradingStats();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dbFunctions, setDbFunctions] = useState<any>(null);

  const runDebugCheck = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Client-side calculations
    const todayTrades = closedTrades.filter(trade => 
      trade.entry_time && trade.entry_time.startsWith(today)
    );
    
    const clientTodayPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const clientTodayWins = todayTrades.filter(trade => (trade.pnl || 0) > 0).length;
    const clientTodayLosses = todayTrades.filter(trade => (trade.pnl || 0) < 0).length;

    // Test database functions
    try {
      const [todayPerf, modelPerf, dailyLosses] = await Promise.all([
        supabase.rpc('get_today_performance', { p_user_id: user.id }),
        supabase.rpc('get_model_performance', { p_user_id: user.id }),
        supabase.rpc('get_daily_losses', { p_user_id: user.id })
      ]);

      setDbFunctions({
        todayPerformance: todayPerf.data?.[0],
        modelPerformance: modelPerf.data,
        dailyLosses: dailyLosses.data,
        errors: {
          todayPerformance: todayPerf.error,
          modelPerformance: modelPerf.error,
          dailyLosses: dailyLosses.error
        }
      });
    } catch (error) {
      logger.error('Database function test failed:', error);
    }

    setDebugInfo({
      timestamp: new Date().toISOString(),
      user: user.id,
      today,
      trades: {
        total: trades.length,
        open: openTrades.length,
        closed: closedTrades.length
      },
      clientCalculations: {
        todayTrades: todayTrades.length,
        todayPnL: clientTodayPnL,
        todayWins: clientTodayWins,
        todayLosses: clientTodayLosses,
        winRate: todayTrades.length > 0 ? (clientTodayWins / todayTrades.length) * 100 : 0
      },
      sampleTrade: trades[0] || null,
      sampleTodayTrade: todayTrades[0] || null
    });
  }, [user, trades, closedTrades, openTrades, dailyLosses]);

  useEffect(() => {
    runDebugCheck();
  }, [trades, user, runDebugCheck]);

  return (
    <div className="space-y-4">
      <Card className="bg-trading-card border-trading-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Trading Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runDebugCheck} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Debug Check
            </Button>
            <Button onClick={refreshTrades} size="sm" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Refresh Trades
            </Button>
            <Button onClick={refreshStats} size="sm" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>

          {debugInfo && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Client-Side Data:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Trades:</span>
                    <span className="ml-2 font-mono">{debugInfo.trades.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Open Trades:</span>
                    <span className="ml-2 font-mono">{debugInfo.trades.open}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Closed Trades:</span>
                    <span className="ml-2 font-mono">{debugInfo.trades.closed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Today's Trades:</span>
                    <span className="ml-2 font-mono">{debugInfo.clientCalculations.todayTrades}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Today's P&L:</span>
                    <span className={`ml-2 font-mono ${debugInfo.clientCalculations.todayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${debugInfo.clientCalculations.todayPnL.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Rate:</span>
                    <span className="ml-2 font-mono">{debugInfo.clientCalculations.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {debugInfo.sampleTrade && (
                <div>
                  <h4 className="font-semibold mb-2">Sample Trade:</h4>
                  <div className="bg-muted p-3 rounded text-sm font-mono">
                    <div>ID: {debugInfo.sampleTrade.id}</div>
                    <div>Asset: {debugInfo.sampleTrade.asset}</div>
                    <div>Status: <Badge variant="outline">{debugInfo.sampleTrade.status}</Badge></div>
                    <div>Entry Time: {debugInfo.sampleTrade.entry_time}</div>
                    <div>Exit Time: {debugInfo.sampleTrade.exit_time || 'N/A'}</div>
                    <div>P&L: {debugInfo.sampleTrade.pnl || 'N/A'}</div>
                    <div>Model: {debugInfo.sampleTrade.model}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {dbFunctions && (
            <div>
              <h4 className="font-semibold mb-2">Database Functions:</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Today Performance:</span>
                  {dbFunctions.errors.todayPerformance ? (
                    <Badge variant="destructive" className="ml-2">Error</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">OK</Badge>
                  )}
                  {dbFunctions.todayPerformance && (
                    <div className="text-xs text-muted-foreground ml-4">
                      Trades: {dbFunctions.todayPerformance.total_trades}, 
                      P&L: ${dbFunctions.todayPerformance.total_pnl}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Model Performance:</span>
                  {dbFunctions.errors.modelPerformance ? (
                    <Badge variant="destructive" className="ml-2">Error</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">OK</Badge>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Daily Losses:</span>
                  {dbFunctions.errors.dailyLosses ? (
                    <Badge variant="destructive" className="ml-2">Error</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">OK</Badge>
                  )}
                  <span className="ml-2 text-sm">{dbFunctions.dailyLosses} losses</span>
                </div>
              </div>
            </div>
          )}

          {todayPerformance && (
            <div>
              <h4 className="font-semibold mb-2">Hook Performance Data:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Trades:</span>
                  <span className="ml-2 font-mono">{todayPerformance.total_trades}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Wins:</span>
                  <span className="ml-2 font-mono text-green-500">{todayPerformance.wins}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Losses:</span>
                  <span className="ml-2 font-mono text-red-500">{todayPerformance.losses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">P&L:</span>
                  <span className={`ml-2 font-mono ${todayPerformance.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${todayPerformance.total_pnl.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="ml-2 font-mono">{todayPerformance.win_rate.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Losses:</span>
                  <span className="ml-2 font-mono">{dailyLosses}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
