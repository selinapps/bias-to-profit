import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChartContainerProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No data available. Add trades to see this chart.',
  children,
  className = '',
}: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && isEmpty && (
          <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-lg">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-sm">
                {emptyMessage}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !isEmpty && children}
      </CardContent>
    </Card>
  );
}

