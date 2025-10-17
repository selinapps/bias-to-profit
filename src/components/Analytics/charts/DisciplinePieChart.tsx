import { ChartContainer } from './ChartContainer';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type DisciplineData = Database['public']['Functions']['get_discipline_performance']['Returns'][0];

interface DisciplinePieChartProps {
  data: DisciplineData[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  name: string;
  value: number;
  win_rate: number;
  avg_r: number;
  color: string;
}

// Color palette from PHASE_2C_PLAN.md - Semantic colors
const disciplineColors: Record<string, string> = {
  'followed_plan': 'hsl(142, 76%, 36%)',      // Green
  'FOMO': 'hsl(0, 84%, 60%)',                 // Red
  'fomo': 'hsl(0, 84%, 60%)',                 // Red
  'revenge': 'hsl(0, 100%, 40%)',             // Dark red
  'Revenge': 'hsl(0, 100%, 40%)',             // Dark red
  'impatient': 'hsl(45, 93%, 47%)',           // Yellow
  'Impatient': 'hsl(45, 93%, 47%)',           // Yellow
  'partial_exit': 'hsl(189, 94%, 43%)',       // Cyan
  'missed_setup': 'hsl(280, 50%, 50%)',       // Purple
  'default': 'hsl(220, 13%, 60%)',            // Gray
};

const getDisciplineColor = (tag: string | null): string => {
  if (!tag) return disciplineColors['default'];
  
  // Normalize tag (handle case variations)
  const normalized = tag.toLowerCase().replace(/\s+/g, '_');
  
  // Check exact matches first
  if (disciplineColors[tag]) return disciplineColors[tag];
  if (disciplineColors[normalized]) return disciplineColors[normalized];
  
  // Check partial matches
  if (normalized.includes('follow') || normalized.includes('plan')) return disciplineColors['followed_plan'];
  if (normalized.includes('fomo')) return disciplineColors['fomo'];
  if (normalized.includes('revenge')) return disciplineColors['revenge'];
  if (normalized.includes('impatient')) return disciplineColors['impatient'];
  
  return disciplineColors['default'];
};

const formatDisciplineLabel = (tag: string | null): string => {
  if (!tag) return 'Untagged';
  
  // Format for display
  return tag
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function DisciplinePieChart({ data, loading = false, error = null }: DisciplinePieChartProps) {
  const chartData: ChartDataPoint[] = (data || [])
    .filter(item => item.discipline_tag && item.trade_count && Number(item.trade_count) > 0)
    .map(item => ({
      name: formatDisciplineLabel(item.discipline_tag),
      value: Number(item.trade_count || 0),
      win_rate: Number(item.win_rate || 0),
      avg_r: Number(item.avg_r_multiple || 0),
      color: getDisciplineColor(item.discipline_tag),
    }))
    .sort((a, b) => b.value - a.value); // Sort by trade count descending

  const isEmpty = chartData.length === 0;

  // Calculate total for percentage
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border shadow-md rounded-md p-3 text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className="text-muted-foreground">Trades: {data.value} ({percentage}%)</p>
          <p className="text-muted-foreground">Win Rate: {data.payload.win_rate.toFixed(1)}%</p>
          <p className="text-muted-foreground">Avg R: {data.payload.avg_r.toFixed(2)}R</p>
        </div>
      );
    }
    return null;
  };

  // Custom label
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Hide labels < 5%
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartContainer
      title="Discipline Tag Distribution"
      description="How often do you follow your plan vs trade emotionally? Behavioral breakdown."
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage="Tag trades with discipline categories (Followed Plan, FOMO, Revenge, etc.) to see this breakdown."
    >
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm">
                {value} ({entry.payload.value} trades)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p><strong>Goal:</strong> Maximize "Followed Plan" (green). 
        High red segments (FOMO, Revenge) indicate emotional trading that usually underperforms.</p>
      </div>
    </ChartContainer>
  );
}

