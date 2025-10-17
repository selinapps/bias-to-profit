import { ChartContainer } from './ChartContainer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type ContinuationData = Database['public']['Functions']['get_continuation_by_setup']['Returns'][0];

interface ContinuationBarChartProps {
  data: ContinuationData[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  setup_name: string;
  continuation_rate: number;
  count: number;
  avg_extra_r: number;
}

// Color function: Red < 50% < Green
const getContinuationColor = (rate: number): string => {
  if (rate >= 70) return 'hsl(142, 76%, 36%)'; // Green
  if (rate >= 50) return 'hsl(45, 93%, 47%)'; // Yellow
  return 'hsl(0, 84%, 60%)'; // Red
};

export function ContinuationBarChart({ data, loading = false, error = null }: ContinuationBarChartProps) {
  const chartData: ChartDataPoint[] = (data || [])
    .filter(item => item.setup_name && item.target_hit_trades && Number(item.target_hit_trades) > 0)
    .map(item => ({
      setup_name: item.setup_name || 'Unknown',
      continuation_rate: Number(item.continuation_rate || 0),
      count: Number(item.target_hit_trades || 0),
      avg_extra_r: Number(item.avg_extra_r || 0),
    }))
    .sort((a, b) => b.continuation_rate - a.continuation_rate); // Sort by rate descending

  const isEmpty = chartData.length === 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border shadow-md rounded-md p-3 text-sm">
          <p className="font-semibold">{data.setup_name}</p>
          <p className="text-muted-foreground">Continuation Rate: {data.continuation_rate.toFixed(1)}%</p>
          <p className="text-muted-foreground">Avg Extra R: {data.avg_extra_r.toFixed(2)}R</p>
          <p className="text-muted-foreground">Observations: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Continuation After Target Hit"
      description="How often price continues moving in your favor after hitting your target (indicates potential to hold longer)"
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage="Add post-trade observations (type: After Target) to see continuation analysis."
    >
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, bottom: 20, left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            label={{ value: 'Continuation Rate (%)', position: 'bottom', offset: 0 }}
            className="text-xs"
          />
          <YAxis 
            type="category" 
            dataKey="setup_name" 
            className="text-xs"
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="continuation_rate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getContinuationColor(entry.continuation_rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p><strong>Insight:</strong> High continuation rates (70%+) suggest you could hold longer. 
        Low rates (&lt; 50%) mean your exits are well-timed.</p>
      </div>
    </ChartContainer>
  );
}

