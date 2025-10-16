import React from 'react';
import { TradingAnalytics } from '@/components/TradingAnalytics';
import { TradingCalendar } from '@/components/TradingCalendar';
import { TradeHeatmap } from '@/components/TradeHeatmap';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

export default function AnalyticsPage() {
  const { closedTrades } = useTradesOptimized();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Analytics</h1>
        <p className="text-on-surface-variant">Deep insights into your trading performance</p>
      </div>

      {/* Real trading analytics with actual data */}
      <TradingAnalytics />
      
      {/* Trading calendar with heat visualization */}
      <TradingCalendar trades={closedTrades} />
      
      {/* Trade heatmap by hour and day */}
      <TradeHeatmap trades={closedTrades} />
    </div>
  );
}
