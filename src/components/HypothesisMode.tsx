import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Flask,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Target
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTrades } from '@/hooks/useTrades';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { format, subDays, isWithinInterval } from 'date-fns';

type Hypothesis = Database['public']['Tables']['hypotheses']['Row'];
type HypothesisInsert = Database['public']['Tables']['hypotheses']['Insert'];

export function HypothesisMode() {
  const { user } = useAuth();
  const { trades } = useTrades();
  const { toast } = useToast();
  
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHypothesis, setSelectedHypothesis] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  useEffect(() => {
    fetchHypotheses();
  }, [user]);

  const fetchHypotheses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hypotheses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hypotheses:', error);
    } else {
      setHypotheses(data || []);
    }
    setLoading(false);
  };

  const createHypothesis = async () => {
    if (!user || !title.trim()) return;

    const hypothesisData: HypothesisInsert = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      status: 'active'
    };

    const { error } = await supabase
      .from('hypotheses')
      .insert(hypothesisData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create hypothesis",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Hypothesis Created",
        description: "Your hypothesis has been created successfully",
        variant: "default"
      });
      setTitle('');
      setDescription('');
      setShowCreateForm(false);
      fetchHypotheses();
    }
  };

  const updateHypothesisStatus = async (id: string, status: 'active' | 'paused' | 'completed') => {
    const { error } = await supabase
      .from('hypotheses')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update hypothesis status",
        variant: "destructive"
      });
    } else {
      fetchHypotheses();
    }
  };

  const adoptHypothesis = async (hypothesisId: string) => {
    // Move experimental trades to regular trades
    const { error } = await supabase
      .from('trades')
      .update({ is_experimental: false })
      .eq('hypothesis_id', hypothesisId)
      .eq('is_experimental', true);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to adopt hypothesis",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Hypothesis Adopted",
        description: "Experimental trades have been moved to your main playbook",
        variant: "default"
      });
      updateHypothesisStatus(hypothesisId, 'completed');
    }
  };

  // Filter trades by date range
  const filteredTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.entry_time);
    return isWithinInterval(tradeDate, dateRange);
  });

  // Get hypothesis comparison
  const getHypothesisComparison = (hypothesisId: string) => {
    const experimentalTrades = filteredTrades.filter(
      trade => trade.hypothesis_id === hypothesisId && trade.is_experimental && trade.status === 'closed'
    );
    const classicTrades = filteredTrades.filter(
      trade => !trade.is_experimental && trade.status === 'closed'
    );

    const calculateStats = (tradeList: typeof trades) => {
      if (tradeList.length === 0) return { winRate: 0, avgR: 0, totalTrades: 0, totalPnL: 0 };
      
      const wins = tradeList.filter(t => (t.pnl || 0) > 0).length;
      const totalR = tradeList.reduce((sum, t) => sum + (t.r_multiple || 0), 0);
      const totalPnL = tradeList.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      return {
        winRate: (wins / tradeList.length) * 100,
        avgR: totalR / tradeList.length,
        totalTrades: tradeList.length,
        totalPnL
      };
    };

    return {
      experimental: calculateStats(experimentalTrades),
      classic: calculateStats(classicTrades)
    };
  };

  if (loading) {
    return <div className="text-center py-8 text-trading-muted">Loading hypotheses...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flask className="h-5 w-5 text-trading-accent" />
            Hypothesis Testing
          </CardTitle>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Hypothesis
          </Button>
        </CardHeader>
        
        {showCreateForm && (
          <CardContent className="border-t border-trading-border pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="hypothesis-title">Hypothesis Title</Label>
                <Input
                  id="hypothesis-title"
                  placeholder="e.g., London Killzone Mean Reversion Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hypothesis-description">Description</Label>
                <Textarea
                  id="hypothesis-description"
                  placeholder="Describe your hypothesis and what you plan to test..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createHypothesis} disabled={!title.trim()}>
                  Create Hypothesis
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Active Hypotheses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hypotheses.map(hypothesis => {
          const comparison = getHypothesisComparison(hypothesis.id);
          const StatusIcon = hypothesis.status === 'active' ? PlayCircle : 
                           hypothesis.status === 'paused' ? PauseCircle : CheckCircle;
          
          return (
            <Card key={hypothesis.id} className="bg-trading-card border-trading-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{hypothesis.title}</CardTitle>
                    {hypothesis.description && (
                      <p className="text-sm text-trading-muted mt-1">{hypothesis.description}</p>
                    )}
                  </div>
                  <Badge variant={
                    hypothesis.status === 'active' ? 'default' : 
                    hypothesis.status === 'paused' ? 'secondary' : 'outline'
                  }>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {hypothesis.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Comparison Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg border border-trading-border">
                    <div className="text-xs text-trading-muted mb-1">EXPERIMENTAL</div>
                    <div className="text-lg font-bold text-trading-accent">
                      {comparison.experimental.totalTrades}
                    </div>
                    <div className="text-xs text-trading-muted">trades</div>
                    {comparison.experimental.totalTrades > 0 && (
                      <div className="mt-1">
                        <div className="text-sm font-medium">
                          {comparison.experimental.winRate.toFixed(0)}% WR
                        </div>
                        <div className="text-xs text-trading-muted">
                          {comparison.experimental.avgR.toFixed(2)}R avg
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center p-3 bg-background rounded-lg border border-trading-border">
                    <div className="text-xs text-trading-muted mb-1">CLASSIC</div>
                    <div className="text-lg font-bold text-foreground">
                      {comparison.classic.totalTrades}
                    </div>
                    <div className="text-xs text-trading-muted">trades</div>
                    {comparison.classic.totalTrades > 0 && (
                      <div className="mt-1">
                        <div className="text-sm font-medium">
                          {comparison.classic.winRate.toFixed(0)}% WR
                        </div>
                        <div className="text-xs text-trading-muted">
                          {comparison.classic.avgR.toFixed(2)}R avg
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Comparison */}
                {comparison.experimental.totalTrades > 0 && comparison.classic.totalTrades > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Win Rate Difference:</span>
                      <span className={
                        comparison.experimental.winRate > comparison.classic.winRate 
                          ? 'text-success' : 'text-destructive'
                      }>
                        {(comparison.experimental.winRate - comparison.classic.winRate).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg R Difference:</span>
                      <span className={
                        comparison.experimental.avgR > comparison.classic.avgR 
                          ? 'text-success' : 'text-destructive'
                      }>
                        {(comparison.experimental.avgR - comparison.classic.avgR).toFixed(2)}R
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {hypothesis.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateHypothesisStatus(hypothesis.id, 'paused')}
                    >
                      <PauseCircle className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  )}
                  
                  {hypothesis.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateHypothesisStatus(hypothesis.id, 'active')}
                    >
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                  
                  {comparison.experimental.totalTrades > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => adoptHypothesis(hypothesis.id)}
                      disabled={hypothesis.status === 'completed'}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Adopt to Playbook
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hypotheses.length === 0 && (
        <Card className="bg-trading-card border-trading-border">
          <CardContent className="text-center py-12">
            <Flask className="h-12 w-12 text-trading-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Hypotheses Yet</h3>
            <p className="text-trading-muted mb-4">
              Create your first hypothesis to start forward testing new strategies
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Hypothesis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}