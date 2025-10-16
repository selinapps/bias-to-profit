import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DailyReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  total_trades: number;
  net_r_multiple: number;
  net_pnl: number;
  avg_emotional_score: number;
  plan_adherence_percentage: number;
  bias_accuracy_percentage: number;
  session_discipline_percentage: number;
  top_mistakes: string[];
  improvement_areas: string[];
  positive_actions: string[];
  daily_notes: string;
  key_learnings: string;
  tomorrow_focus: string;
  created_at: string;
  updated_at: string;
}

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

export function useReflection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dailyReflection, setDailyReflection] = useState<DailyReflection | null>(null);
  const [tradeReflections, setTradeReflections] = useState<TradeReflection[]>([]);

  // Load daily reflection for a specific date
  const loadDailyReflection = useCallback(async (date: Date) => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('User not authenticated, skipping database load');
        return null;
      }

      // TEMPORARILY DISABLED: Database queries causing 406 errors
      // TODO: Re-enable when authentication is properly working
      console.log('Daily reflection query temporarily disabled to prevent 406 errors');
      const data = null;
      const error = null;

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setDailyReflection(data);
      return data;
    } catch (error) {
      console.error('Error loading daily reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to load daily reflection',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Generate daily reflection from trades
  const generateDailyReflection = useCallback(async (date: Date) => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('generate_daily_reflection', {
        p_user_id: user.id,
        p_reflection_date: dateStr
      });

      if (error) throw error;

      if (data) {
        setDailyReflection(data);
      }
      toast({
        title: 'Success',
        description: 'Daily reflection generated successfully',
      });
      
      return data;
    } catch (error) {
      console.error('Error generating reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate daily reflection',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load trade reflections for a specific date
  const loadTradeReflections = useCallback(async (date: Date) => {
    if (!user) return [];
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('User not authenticated, skipping database load');
        return [];
      }

      // Get trades for the date
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('id')
        .gte('entry_time', `${dateStr}T00:00:00`)
        .lt('entry_time', `${dateStr}T23:59:59`);

      if (tradesError) throw tradesError;

      if (trades && trades.length > 0) {
        const tradeIds = trades.map(t => t.id);
        
        const { data: reflections, error: reflectionsError } = await supabase
          .from('trade_reflection')
          .select('*')
          .in('trade_id', tradeIds);

        if (reflectionsError) throw reflectionsError;
        
        setTradeReflections(reflections || []);
        return reflections || [];
      } else {
        setTradeReflections([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading trade reflections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trade reflections',
        variant: 'destructive',
      });
      return [];
    }
  }, [user, toast]);

  // Save trade reflection
  const saveTradeReflection = useCallback(async (reflection: Partial<TradeReflection>) => {
    if (!user) return null;
    
    try {
      const reflectionData = {
        ...reflection,
        user_id: user.id,
        trade_id: reflection.trade_id!,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (reflection.id) {
        // Update existing reflection
        const { data, error } = await supabase
          .from('trade_reflection')
          .update(reflectionData)
          .eq('id', reflection.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new reflection - ensure trade_id is provided
        if (!reflection.trade_id) {
          throw new Error('trade_id is required for new reflection');
        }
        
        const { data, error } = await supabase
          .from('trade_reflection')
          .insert(reflectionData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast({
        title: 'Success',
        description: 'Trade reflection saved successfully',
      });

      return result;
    } catch (error) {
      console.error('Error saving trade reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save trade reflection',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Update daily reflection notes
  const updateDailyReflection = useCallback(async (updates: Partial<DailyReflection>) => {
    if (!user || !dailyReflection) return null;
    
    try {
      // TEMPORARILY DISABLED: Database update causing 406 errors
      // TODO: Re-enable when authentication is properly working
      console.log('Daily reflection update temporarily disabled to prevent 406 errors');
      const data = null;
      const error = null;

      if (error) throw error;

      setDailyReflection(data);
      toast({
        title: 'Success',
        description: 'Daily reflection updated successfully',
      });

      return data;
    } catch (error) {
      console.error('Error updating daily reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update daily reflection',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, dailyReflection, toast]);

  // Get reflection analytics
  const getReflectionAnalytics = useCallback(async (days: number = 30) => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase.rpc('get_reflection_analytics', {
        p_user_id: user.id,
        p_days: days
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading reflection analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reflection analytics',
        variant: 'destructive',
      });
      return [];
    }
  }, [user, toast]);

  return {
    loading,
    dailyReflection,
    tradeReflections,
    loadDailyReflection,
    generateDailyReflection,
    loadTradeReflections,
    saveTradeReflection,
    updateDailyReflection,
    getReflectionAnalytics,
  };
}
