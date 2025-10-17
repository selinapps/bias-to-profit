import { ChartContainer } from './ChartContainer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type ConfidenceData = Database['public']['Functions']['get_confidence_performance']['Returns'][0];

interface ConfidenceBarChartProps {
  data: ConfidenceData[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  confidence: number;
  win_rate: number;
  avg_r: number;
  trade_count: number;
}

// Color palette from PHASE_2C_PLAN.md - Purple gradient
const confidenceColors = {
  win_rate: 'hsl(210, 100%, 50%)',  // Blue
  avg_r: 'hsl(25, 95%, 53%)',        // Orange
};

export function ConfidenceBarChart({ data, loading = false, error = null }: ConfidenceBarChartProps) {
  const chartData: ChartDataPoint[] = (data || [])
    .filter(item => item.confidence_level != null)
    .map(item => ({
      confidence: Number(item.confidence_level),
      win_rate: Number(item.win_rate || 0),
      avg_r: Number(item.avg_r_multiple || 0),
      trade_count: Number(item.trade_count || 0),
    }))
    .sort((a, b) => a.confidence - b.confidence); // Sort 1-5

  const isEmpty = chartData.length === 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border shadow-md rounded-md p-3 text-sm">
          <p className="font-semibold">Confidence Level {data.confidence}</p>
          <p className="text-blue-500">Win Rate: {data.win_rate.toFixed(1)}%</p>
          <p className="text-orange-500">Avg R: {data.avg_r.toFixed(2)}R</p>
          <p className="text-muted-foreground">Trades: {data.trade_count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Confidence vs Performance"
      description="Does higher confidence correlate with better results? Check if you're calibrated."
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage="Set confidence levels (1-5) when entering trades to see this analysis."
    >
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="confidence"
            label={{ value: 'Confidence Level', position: 'bottom', offset: 30 }}
            className="text-xs"
            tickFormatter={(value) => `Level ${value}`}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
            className="text-xs"
            domain={[0, 100]}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            label={{ value: 'Avg R-Multiple', angle: 90, position: 'insideRight' }}
            className="text-xs"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            formatter={(value) => {
              if (value === 'win_rate') return 'Win Rate (%)';
              if (value === 'avg_r') return 'Avg R-Multiple';
              return value;
            }}
          />
          <Bar 
            yAxisId="left"
            dataKey="win_rate" 
            fill={confidenceColors.win_rate}
            radius={[4, 4, 0, 0]}
            name="win_rate"
          />
          <Bar 
            yAxisId="right"
            dataKey="avg_r" 
            fill={confidenceColors.avg_r}
            radius={[4, 4, 0, 0]}
            name="avg_r"
          />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p><strong>Well-calibrated:</strong> Higher confidence → Higher win rate & R-Multiple. 
        <strong> Overconfident:</strong> High confidence but poor results. 
        <strong> Underconfident:</strong> Low confidence but good results.</p>
      </div>
    </ChartContainer>
  );
}

