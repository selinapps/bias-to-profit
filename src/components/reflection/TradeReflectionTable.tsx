import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  Save, 
  X, 
  Eye,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TradeReflection {
  id: string;
  user_id: string;
  trade_id: string;
  emotional_rating: number;
  emotional_tags: string[];
  execution_quality: number;
  checklist_completion_percentage: number;
  why_took_trade: string;
  execution_flaws: string;
  improvement_ideas: string;
  what_went_well: string;
  bias_match: boolean;
  session_appropriate: boolean;
  screenshot_analysis: string;
  chart_pattern_recognition: string;
  key_takeaways: string[];
  mistakes_to_avoid: string[];
  created_at: string;
  updated_at: string;
}

interface Trade {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  exit_price?: number;
  r_multiple?: number;
  pnl?: number;
  entry_time: string;
  trading_session?: string;
  model: string;
  screenshot_url?: string;
  notes?: string;
  mistake_tags?: string[];
  good_actions?: string[];
  emotions?: any;
}

interface TradeReflectionTableProps {
  tradeReflections: TradeReflection[];
  selectedDate: Date;
  onRefresh: () => void;
}

export function TradeReflectionTable({ tradeReflections, selectedDate, onRefresh }: TradeReflectionTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingReflection, setEditingReflection] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for editing reflection
  const [editForm, setEditForm] = useState<Partial<TradeReflection>>({});

  // Load trades for the selected date
  useEffect(() => {
    const loadTrades = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Check authentication first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('User not authenticated, skipping database load');
          setTrades([]);
          return;
        }

        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .gte('entry_time', `${dateStr}T00:00:00`)
          .lt('entry_time', `${dateStr}T23:59:59`)
          .order('entry_time', { ascending: false });

        if (error) throw error;
        setTrades(data || []);
      } catch (error) {
        console.error('Error loading trades:', error);
        toast({
          title: 'Error',
          description: 'Failed to load trades',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, [selectedDate, user, toast]);

  const toggleRowExpansion = (tradeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(tradeId)) {
      newExpanded.delete(tradeId);
    } else {
      newExpanded.add(tradeId);
    }
    setExpandedRows(newExpanded);
  };

  const startEditing = (tradeId: string) => {
    const reflection = tradeReflections.find(r => r.trade_id === tradeId);
    setEditingReflection(tradeId);
    setEditForm(reflection || {
      trade_id: tradeId,
      user_id: user?.id,
      emotional_rating: 3,
      execution_quality: 3,
      checklist_completion_percentage: 100,
      emotional_tags: [],
      key_takeaways: [],
      mistakes_to_avoid: [],
      bias_match: true,
      session_appropriate: true,
    });
  };

  const cancelEditing = () => {
    setEditingReflection(null);
    setEditForm({});
  };

  const saveReflection = async () => {
    if (!user || !editingReflection) return;
    
    setSaving(true);
    try {
      const reflectionData = {
        ...editForm,
        user_id: user.id,
        trade_id: editingReflection,
        updated_at: new Date().toISOString(),
      };

      // Check if reflection exists
      const existingReflection = tradeReflections.find(r => r.trade_id === editingReflection);
      
      if (existingReflection) {
        const { error } = await supabase
          .from('trade_reflection')
          .update(reflectionData)
          .eq('id', existingReflection.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trade_reflection')
          .insert(reflectionData);
        
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Trade reflection saved successfully',
      });

      setEditingReflection(null);
      setEditForm({});
      onRefresh();
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save trade reflection',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getTradeReflection = (tradeId: string) => {
    return tradeReflections.find(r => r.trade_id === tradeId);
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'long' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getPerformanceColor = (rMultiple?: number) => {
    if (!rMultiple) return 'text-gray-500';
    if (rMultiple > 0) return 'text-green-600';
    return 'text-red-600';
  };

  const getEmotionalScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 4) return 'text-green-600';
    if (score <= 2) return 'text-red-600';
    return 'text-yellow-600';
  };

  const renderStars = (rating?: number, maxRating: number = 5) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse">Loading trades...</div>
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trades Found</h3>
          <p className="text-muted-foreground text-center">
            No trades found for {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Trade-by-Trade Reflection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {trades.map((trade) => {
            const reflection = getTradeReflection(trade.id);
            const isExpanded = expandedRows.has(trade.id);
            const isEditing = editingReflection === trade.id;

            return (
              <div key={trade.id} className="border border-border rounded-lg">
                {/* Trade Row */}
                <div 
                  className="flex items-center p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRowExpansion(trade.id)}
                >
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{format(new Date(trade.entry_time), 'HH:mm')}</span>
                      {getDirectionIcon(trade.direction)}
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">{trade.asset}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{trade.direction}</span>
                    </div>
                    
                    <div>
                      <span className={`text-sm font-medium ${getPerformanceColor(trade.r_multiple)}`}>
                        {trade.r_multiple ? `${trade.r_multiple.toFixed(2)}R` : 'N/A'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm">{trade.model}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {reflection?.bias_match !== undefined && (
                          reflection.bias_match ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )
                        )}
                        {reflection?.emotional_rating && renderStars(reflection.emotional_rating)}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) {
                            saveReflection();
                          } else {
                            startEditing(trade.id);
                          }
                        }}
                        disabled={saving}
                      >
                        {isEditing ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Edit3 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/25">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Emotional Rating</label>
                            <Select
                              value={editForm.emotional_rating?.toString()}
                              onValueChange={(value) => setEditForm({ ...editForm, emotional_rating: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 - Very Poor</SelectItem>
                                <SelectItem value="2">2 - Poor</SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">Execution Quality</label>
                            <Select
                              value={editForm.execution_quality?.toString()}
                              onValueChange={(value) => setEditForm({ ...editForm, execution_quality: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select quality" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 - Very Poor</SelectItem>
                                <SelectItem value="2">2 - Poor</SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Why I took this trade</label>
                          <Textarea
                            value={editForm.why_took_trade || ''}
                            onChange={(e) => setEditForm({ ...editForm, why_took_trade: e.target.value })}
                            placeholder="Describe your reasoning for taking this trade..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Execution flaws (if any)</label>
                          <Textarea
                            value={editForm.execution_flaws || ''}
                            onChange={(e) => setEditForm({ ...editForm, execution_flaws: e.target.value })}
                            placeholder="What could have been done better in execution..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Improvement ideas</label>
                          <Textarea
                            value={editForm.improvement_ideas || ''}
                            onChange={(e) => setEditForm({ ...editForm, improvement_ideas: e.target.value })}
                            placeholder="Ideas for improvement next time..."
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={saveReflection} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reflection ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Emotional Rating:</span>
                                <div className="mt-1">{renderStars(reflection.emotional_rating)}</div>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Execution Quality:</span>
                                <div className="mt-1">{renderStars(reflection.execution_quality)}</div>
                              </div>
                            </div>

                            {reflection.why_took_trade && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Why I took this trade:</span>
                                <p className="text-sm mt-1">{reflection.why_took_trade}</p>
                              </div>
                            )}

                            {reflection.execution_flaws && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Execution flaws:</span>
                                <p className="text-sm mt-1">{reflection.execution_flaws}</p>
                              </div>
                            )}

                            {reflection.improvement_ideas && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Improvement ideas:</span>
                                <p className="text-sm mt-1">{reflection.improvement_ideas}</p>
                              </div>
                            )}

                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-muted-foreground">Bias Match:</span>
                                {reflection.bias_match ? (
                                  <Badge variant="secondary" className="text-green-600">Yes</Badge>
                                ) : (
                                  <Badge variant="destructive">No</Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-muted-foreground">Session Appropriate:</span>
                                {reflection.session_appropriate ? (
                                  <Badge variant="secondary" className="text-green-600">Yes</Badge>
                                ) : (
                                  <Badge variant="destructive">No</Badge>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground mb-2">No reflection added yet</p>
                            <Button variant="outline" size="sm" onClick={() => startEditing(trade.id)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Add Reflection
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
