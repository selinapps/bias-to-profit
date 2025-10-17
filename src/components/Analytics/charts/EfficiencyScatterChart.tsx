import { ChartContainer } from './ChartContainer';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type TradeAnalytics = Database['public']['Views']['v_trades_analytics']['Row'];

interface EfficiencyScatterChartProps {
  data: TradeAnalytics[];
  loading?: boolean;
  error?: string | null;
}

interface ScatterDataPoint {
  mae_r: number;
  mfe_r: number;
  setup_name: string;
  asset: string;
  efficiency: number;
  r_multiple: number;
  id: string;
}

// Color palette from PHASE_2C_PLAN.md
const setupColors: Record<string, string> = {
  'Breakout': 'hsl(210, 100%, 50%)',
  'Pullback': 'hsl(142, 76%, 36%)',
  'Reversal': 'hsl(0, 84%, 60%)',
  'Range': 'hsl(45, 93%, 47%)',
  'Continuation': 'hsl(280, 50%, 50%)',
  'Unknown': 'hsl(0, 0%, 50%)',
};

const getSetupColor = (setup: string | null): string => {
  if (!setup) return setupColors['Unknown'];
  return setupColors[setup] || 'hsl(189, 94%, 43%)'; // Default cyan
};

export function EfficiencyScatterChart({ data, loading = false, error = null }: EfficiencyScatterChartProps) {
  // Filter for closed trades with MAE and MFE data
  const chartData: ScatterDataPoint[] = data
    .filter(trade => 
      trade.status === 'closed' && 
      trade.mae_r != null && 
      trade.mfe_r != null &&
      trade.mfe_r > 0 // MFE must be positive
    )
    .map(trade => ({
      mae_r: Math.abs(Number(trade.mae_r)), // Convert to positive for chart
      mfe_r: Number(trade.mfe_r),
      setup_name: trade.setup_name || 'Unknown',
      asset: trade.asset || 'Unknown',
      efficiency: Number(trade.efficiency || 0),
      r_multiple: Number(trade.r_multiple || 0),
      id: trade.id,
    }));

  const isEmpty = chartData.length === 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border shadow-md rounded-md p-3 text-sm">
          <p className="font-semibold">{data.asset} - {data.setup_name}</p>
          <p className="text-muted-foreground">MAE: {data.mae_r.toFixed(2)}R</p>
          <p className="text-muted-foreground">MFE: {data.mfe_r.toFixed(2)}R</p>
          <p className="text-muted-foreground">Efficiency: {(data.efficiency * 100).toFixed(0)}%</p>
          <p className="text-muted-foreground">R-Multiple: {data.r_multiple.toFixed(2)}R</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="MAE vs MFE Analysis"
      description="Trade efficiency visualization: How much of the favorable move you captured relative to adverse excursion"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage="Close trades with MAE and MFE values to see this scatter plot."
    >
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            type="number" 
            dataKey="mae_r" 
            name="MAE (R)" 
            label={{ value: 'Max Adverse Excursion (R)', position: 'bottom', offset: 40 }}
            className="text-xs"
          />
          <YAxis 
            type="number" 
            dataKey="mfe_r" 
            name="MFE (R)" 
            label={{ value: 'Max Favorable Excursion (R)', angle: -90, position: 'left', offset: 40 }}
            className="text-xs"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
          <Scatter name="Trades" data={chartData}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getSetupColor(entry.setup_name)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p><strong>Reading the chart:</strong> Points higher on the Y-axis had greater profit potential. 
        Points with lower MAE (left side) experienced less drawdown. Ideal trades are in the top-left quadrant.</p>
      </div>
    </ChartContainer>
  );
}

