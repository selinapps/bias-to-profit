import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import { 
  SessionPattern, 
  SessionPatternInput, 
  SessionBehavior,
  ScenarioInference,
  inferScenario 
} from '@/types/sessionPatterns';

interface UseSessionPatternsReturn {
  currentPattern: SessionPattern | null;
  loading: boolean;
  error: string | null;
  savePattern: (pattern: SessionPatternInput) => Promise<void>;
  updatePattern: (updates: Partial<SessionPatternInput>) => Promise<void>;
  scenario: ScenarioInference | null;
  refreshPattern: () => Promise<void>;
}

export function useSessionPatterns(): UseSessionPatternsReturn {
  const { user } = useAuth();
  const [currentPattern, setCurrentPattern] = useState<SessionPattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Fetch current day's pattern
  const fetchCurrentPattern = useCallback(async () => {
    if (!user) {
      setCurrentPattern(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_session_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', getTodayString())
        .maybeSingle();

      if (fetchError) {
        logger.error('Error fetching session pattern:', fetchError);
        setError('Failed to load session pattern');
        return;
      }

      setCurrentPattern(data);
    } catch (err) {
      logger.error('Error in fetchCurrentPattern:', err);
      setError('Failed to load session pattern');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save or update pattern
  const savePattern = useCallback(async (pattern: SessionPatternInput) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setError(null);

    try {
      const { data, error: upsertError } = await supabase
        .from('daily_session_patterns')
        .upsert({
          user_id: user.id,
          date: getTodayString(),
          asia_behavior: pattern.asia_behavior,
          london_behavior: pattern.london_behavior,
          ny_behavior: pattern.ny_behavior,
          notes: pattern.notes || null,
        }, {
          onConflict: 'date,user_id'
        })
        .select()
        .single();

      if (upsertError) {
        logger.error('Error saving session pattern:', upsertError);
        setError('Failed to save session pattern');
        return;
      }

      setCurrentPattern(data);
    } catch (err) {
      logger.error('Error in savePattern:', err);
      setError('Failed to save session pattern');
    }
  }, [user]);

  // Update existing pattern
  const updatePattern = useCallback(async (updates: Partial<SessionPatternInput>) => {
    if (!currentPattern) {
      await savePattern({
        asia_behavior: 'unknown',
        london_behavior: 'unknown',
        ny_behavior: 'unknown',
        ...updates
      });
      return;
    }

    const updatedPattern = {
      asia_behavior: updates.asia_behavior ?? currentPattern.asia_behavior,
      london_behavior: updates.london_behavior ?? currentPattern.london_behavior,
      ny_behavior: updates.ny_behavior ?? currentPattern.ny_behavior,
      notes: updates.notes ?? currentPattern.notes
    };

    await savePattern(updatedPattern);
  }, [currentPattern, savePattern]);

  // Refresh pattern data
  const refreshPattern = useCallback(async () => {
    await fetchCurrentPattern();
  }, [fetchCurrentPattern]);

  // Compute scenario inference
  const scenario: ScenarioInference | null = currentPattern ? 
    inferScenario(
      currentPattern.asia_behavior,
      currentPattern.london_behavior,
      currentPattern.ny_behavior
    ) : null;

  // Initial load
  useEffect(() => {
    fetchCurrentPattern();
  }, [fetchCurrentPattern]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('session-patterns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_session_patterns',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCurrentPattern();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCurrentPattern]);

  return {
    currentPattern,
    loading,
    error,
    savePattern,
    updatePattern,
    scenario,
    refreshPattern
  };
}
