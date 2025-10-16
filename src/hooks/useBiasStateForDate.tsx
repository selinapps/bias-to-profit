import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { BiasQuizResult, BiasStateSnapshot } from '@/types/bias';
import type { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

type BiasStateResponse = BiasStateSnapshot | null;

const LOCAL_BIAS_STORAGE_KEY = 'bias-to-profit:bias-state-cache';
type LocalBiasStore = Record<string, Record<string, BiasStateSnapshot>>;

const mapTags = (value: unknown): string[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }
  return null;
};

const mapRowToSnapshot = (row: any): BiasStateSnapshot => ({
  id: row.id ? String(row.id) : undefined,
  day_key: row.day_key || undefined,
  bias: row.bias || 'NONE',
  market_state: row.market_state || null,
  confidence: row.confidence || null,
  tags: mapTags(row.tags ?? null),
  selected_at: row.selected_at || row.created_at,
});

const isMissingFunctionError = (error: PostgrestError | null): boolean => {
  if (!error) return false;
  const normalizedCode = error.code?.trim().toUpperCase();
  if (normalizedCode === 'PGRST202' || normalizedCode === '42704' || normalizedCode === '42883') {
    return true;
  }
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    message.includes('could not find the function') ||
    message.includes('function does not exist') ||
    message.includes('rpc')
  );
};

const isMissingRelationError = (error: PostgrestError | null): boolean => {
  if (!error) return false;
  const normalizedCode = error.code?.trim().toUpperCase();
  if (
    normalizedCode === 'PGRST205' ||
    normalizedCode === 'PGRST204' ||
    normalizedCode === 'PGRST101' ||
    normalizedCode === 'PGRST201' ||
    normalizedCode === '42P01'
  ) {
    return true;
  }
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('could not find the view') ||
    message.includes('relation does not exist') ||
    message.includes('column does not exist') ||
    (message.includes('could not find the') && message.includes('column'))
  );
};

const ENABLE_BIAS_RPC = (import.meta.env.VITE_ENABLE_BIAS_RPC ?? '').toString().toLowerCase() === 'true';

/**
 * Hook for managing bias state for a specific date
 * This is used when logging trades for historical dates
 */
export function useBiasStateForDate(targetDate: Date) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const dayKey = useMemo(() => format(targetDate, 'yyyy-MM-dd'), [targetDate]);

  const loadBiasForDate = useCallback(async (): Promise<BiasStateResponse> => {
    if (!user) return null;

    setLoading(true);
    try {
      // Try RPC first if available
      if (ENABLE_BIAS_RPC) {
        const { data, error } = await supabase.rpc('get_current_bias', {
          target_day: dayKey,
        });

        if (!error && data) {
          return mapRowToSnapshot(data);
        }

        if (error && !isMissingFunctionError(error)) {
          logger.error('Error loading bias state for date', error);
          throw error;
        }
      }

      // Fallback to direct table query
      const { data, error } = await supabase
        .from('bias_state')
        .select('*')
        .eq('active', true)
        .eq('day_key', dayKey)
        .order('selected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) {
          logger.warn('Bias state table missing, returning null');
          return null;
        }
        throw error;
      }

      return data ? mapRowToSnapshot(data) : null;
    } finally {
      setLoading(false);
    }
  }, [user, dayKey]);

  const saveBiasForDate = useCallback(async (result: BiasQuizResult): Promise<BiasStateSnapshot> => {
    if (!user) throw new Error('User not authenticated');

    setSaving(true);
    try {
      // Try RPC first if available
      if (ENABLE_BIAS_RPC) {
        const { data, error } = await supabase.rpc('set_bias_state', {
          target_day: dayKey,
          target_bias: result.bias,
          target_market_state: result.market_state ?? null,
          target_confidence: result.confidence ?? null,
          target_tags: result.tags.length ? result.tags : null,
        });

        if (!error && data) {
          return mapRowToSnapshot(data);
        }

        if (error && !isMissingFunctionError(error)) {
          logger.error('RPC Error saving bias for date:', error);
          // Fall through to direct table mutation
        }
      }

      // Fallback to direct table mutation
      // First deactivate existing bias states for the day
      const { error: deactivateError } = await supabase
        .from('bias_state')
        .update({ active: false })
        .eq('day_key', dayKey)
        .eq('active', true);

      if (deactivateError && !isMissingRelationError(deactivateError)) {
        throw deactivateError;
      }

      // Insert new bias state
      const { data, error: insertError } = await supabase
        .from('bias_state')
        .insert({
          day_key: dayKey,
          bias: result.bias,
          market_state: result.market_state ?? null,
          confidence: result.confidence ?? null,
          tags: result.tags.length ? result.tags : null,
          active: true,
          selected_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        if (isMissingRelationError(insertError)) {
          logger.warn('Bias state table missing, cannot save bias');
          throw new Error('Bias state storage is not available. Please run the latest Supabase migrations.');
        }
        throw insertError;
      }

      return mapRowToSnapshot(data);
    } finally {
      setSaving(false);
    }
  }, [user, dayKey]);

  const clearBiasForDate = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bias_state')
        .update({ active: false })
        .eq('day_key', dayKey)
        .eq('active', true);

      if (error && !isMissingRelationError(error)) {
        throw error;
      }
    } catch (error) {
      logger.error('Error clearing bias for date:', error);
      throw error;
    }
  }, [user, dayKey]);

  return {
    dayKey,
    loading,
    saving,
    loadBiasForDate,
    saveBiasForDate,
    clearBiasForDate,
  };
}
