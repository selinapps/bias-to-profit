import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useTradesPerformance } from '@/hooks/useTradesPerformance';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { TradeHeatmap } from './TradeHeatmap';
import { TradingCalendar } from './TradingCalendar';
import { ImprovedTradeCard } from './ImprovedTradeCard';
import { AddTradeBottomSheet } from './AddTradeBottomSheet';
import { EditTradeModal } from './EditTradeModal';
import { ResponsiveHeader } from './ResponsiveHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type Trade = Database['public']['Tables']['trades']['Row'];
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Plus,
  RefreshCw,
  Zap
} from 'lucide-react';

interface OptimizedTradingDashboardProps {
  className?: string;
}

export function OptimizedTradingDashboard({ className }: OptimizedTradingDashboardProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [selectedView, setSelectedView] = useState<'dashboard' | 'calendar' | 'heatmap'>('dashboard');
  const [addTradeWithDate, setAddTradeWithDate] = useState<Date | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit handlers
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTrade(null);
  };
  
  // Performance monitoring
  const { metrics, isSlowConnection, shouldUseOptimizations, logPerformance, logError } = useTradesPerformance();
  
  // Optimized trades hook
  const {
    trades,
    openTrades,
    closedTrades,
    loading,
    addTrade,
    updateTrade,
    closeTrade,
    deleteTrade,
    canAddTrade,
    dailyLosses,
    refreshTrades,
    getTradeStats
  } = useTradesOptimized();

  // Real-time sync with performance monitoring
  const { isConnected, lastSyncTime, forceSync } = useRealtimeSync({
    onTradeUpdate: useCallback(() => {
      logPerformance('realtime', performance.now());
    }, [logPerformance]),
    onBiasStateUpdate: useCallback(() => {
      logPerformance('bias_update', performance.now());
    }, [logPerformance]),
  });

  // Performance-optimized calculations - use entry_time for today's trades
  const todayTrades = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return closedTrades.filter(trade => 
      trade.entry_time && trade.entry_time.startsWith(today)
    );
  }, [closedTrades]);

  const todayWins = useMemo(() => 
    todayTrades.filter(trade => (trade.pnl || 0) > 0).length,
    [todayTrades]
  );

  const winRate = useMemo(() => 
    todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : 0,
    [todayTrades.length, todayWins]
  );

  // Model performance with memoization
  const modelPerformance = useMemo(() => {
    const trendTrades = closedTrades.filter(trade => trade.model === 'trend');
    const mrTrades = closedTrades.filter(trade => trade.model === 'mean_reversion');
    
    const trendPnL = trendTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const mrPnL = mrTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    return {
      trend: {
        count: trendTrades.length,
        pnl: trendPnL,
        winRate: trendTrades.length > 0 ? (trendTrades.filter(t => (t.pnl || 0) > 0).length / trendTrades.length) * 100 : 0
      },
      meanReversion: {
        count: mrTrades.length,
        pnl: mrPnL,
        winRate: mrTrades.length > 0 ? (mrTrades.filter(t => (t.pnl || 0) > 0).length / mrTrades.length) * 100 : 0
      }
    };
  }, [closedTrades]);

  // Performance-optimized trade operations
  const handleAddTrade = useCallback(async (tradeData: any) => {
    const startTime = performance.now();
    
    try {
      await addTrade(tradeData);
      const duration = performance.now() - startTime;
      logPerformance('add_trade', duration);
      
      toast({
        title: "Trade Added",
        description: "Your trade has been recorded successfully",
      });
    } catch (error) {
      logError(`Failed to add trade: ${error}`);
      toast({
        title: "Error",
        description: "Failed to add trade. Please try again.",
        variant: "destructive",
      });
    }
  }, [addTrade, logPerformance, logError, toast]);

  const handleCloseTrade = useCallback(async (id: string, exitPrice: number) => {
    const startTime = performance.now();
    
    try {
      await closeTrade(id, exitPrice);
      const duration = performance.now() - startTime;
      logPerformance('close_trade', duration);
      
      toast({
        title: "Trade Closed",
        description: "Trade has been closed successfully",
      });
    } catch (error) {
      logError(`Failed to close trade: ${error}`);
      toast({
        title: "Error",
        description: "Failed to close trade. Please try again.",
        variant: "destructive",
      });
    }
  }, [closeTrade, logPerformance, logError, toast]);

  // Performance monitoring effect
  useEffect(() => {
    if (shouldUseOptimizations) {
      logger.info('Performance optimizations enabled due to:', {
        slowConnection: isSlowConnection,
        metrics
      });
    }
  }, [shouldUseOptimizations, isSlowConnection, metrics]);

  // Render performance warning
  if (isSlowConnection && !shouldUseOptimizations) {
    logger.warn('Slow connection detected. Consider enabling optimizations.');
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <ResponsiveHeader 
        currentTime={new Date()}
        currentSession={null}
        dailyStats={{
          tradesCount: trades.length,
          totalPnL: 0,
          isHouseMoneyActive: false,
          isDayDisabled: !canAddTrade
        }}
        isMobile={isMobile}
        isConnected={true}
        pendingChanges={0}
        lastSyncTime={new Date()}
        onExportReport={(format) => logger.debug('Export:', format)}
        onResetDay={() => logger.debug('Reset day')}
        onForceSync={() => logger.debug('Force sync')}
        onOpenSettings={() => logger.debug('Open settings')}
      />

      {/* Performance Metrics (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Fetch Time: {metrics.fetchTime.toFixed(2)}ms</div>
            <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
            <div>Memory: {metrics.memoryUsage.toFixed(2)}MB</div>
            <div>Cache Hit Rate: {metrics.cacheHitRate.toFixed(1)}%</div>
            <div>Realtime Events: {metrics.realtimeEvents}</div>
            <div>Errors: {metrics.errorCount}</div>
          </CardContent>
        </Card>
      )}

      {/* Daily Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Trades</p>
                <p className="text-2xl font-bold">{todayTrades.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Losses</p>
                <p className="text-2xl font-bold text-red-500">{dailyLosses}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Trades</p>
                <p className="text-2xl font-bold">{openTrades.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Trend Model</h4>
              <div className="flex justify-between">
                <span>Trades: {modelPerformance.trend.count}</span>
                <span>PnL: ${modelPerformance.trend.pnl.toFixed(2)}</span>
                <span>Win Rate: {modelPerformance.trend.winRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Mean Reversion</h4>
              <div className="flex justify-between">
                <span>Trades: {modelPerformance.meanReversion.count}</span>
                <span>PnL: ${modelPerformance.meanReversion.pnl.toFixed(2)}</span>
                <span>Win Rate: {modelPerformance.meanReversion.winRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === 'dashboard' ? 'default' : 'outline'}
          onClick={() => setSelectedView('dashboard')}
          size="sm"
        >
          Dashboard
        </Button>
        <Button
          variant={selectedView === 'calendar' ? 'default' : 'outline'}
          onClick={() => setSelectedView('calendar')}
          size="sm"
        >
          <Calendar className="w-4 h-4 mr-2 text-foreground" />
          Calendar
        </Button>
        <Button
          variant={selectedView === 'heatmap' ? 'default' : 'outline'}
          onClick={() => setSelectedView('heatmap')}
          size="sm"
        >
          Heatmap
        </Button>
      </div>

      {/* Selected View */}
      {selectedView === 'dashboard' && (
        <div className="space-y-4">
          {openTrades.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Open Trades</h3>
              <div className="grid gap-4">
                {openTrades.map((trade) => (
                  <ImprovedTradeCard
                    key={trade.id}
                    trade={trade}
                    isOpen={trade.status === 'open'}
                    onEdit={handleEditTrade}
                    onDelete={() => deleteTrade(trade.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {closedTrades.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Closed Trades</h3>
              <div className="grid gap-4">
                {closedTrades.slice(0, 10).map((trade) => (
                  <ImprovedTradeCard
                    key={trade.id}
                    trade={trade}
                    isOpen={false}
                    onEdit={handleEditTrade}
                    onDelete={() => deleteTrade(trade.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedView === 'calendar' && (
        <TradingCalendar 
          trades={trades} 
          onAddTrade={(date) => {
            setAddTradeWithDate(date);
            setShowAddTrade(true);
          }}
        />
      )}

      {selectedView === 'heatmap' && (
        <TradeHeatmap trades={closedTrades} />
      )}

      {/* Add Trade Bottom Sheet */}
      <AddTradeBottomSheet
        isOpen={showAddTrade}
        onClose={() => {
          setShowAddTrade(false);
          setAddTradeWithDate(null);
        }}
        refreshTrades={refreshTrades}
        presetDate={addTradeWithDate}
      />

      {/* Edit Trade Modal */}
      <EditTradeModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        trade={editingTrade}
      />
    </div>
  );
}
