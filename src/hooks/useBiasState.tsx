import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import type { BiasQuizResult, BiasStateSnapshot } from '@/types/bias';
import type { PostgrestError } from '@supabase/supabase-js';

type BiasViewRow = Database['public']['Views']['v_current_bias']['Row'];
type BiasTableRow = Database['public']['Tables']['bias_state']['Row'];

type BiasStateResponse = BiasStateSnapshot | null;

const mapTags = (value: unknown): string[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }
  return null;
};

const mapRowToSnapshot = (row: BiasViewRow | BiasTableRow): BiasStateSnapshot => ({
  id: 'id' in row ? row.id : undefined,
  day_key: 'day_key' in row ? row.day_key : undefined,
  bias: row.bias,
  market_state: row.market_state,
  confidence: row.confidence,
  tags: mapTags(row.tags ?? null),
  selected_at: row.selected_at,
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
    message.includes('relation does not exist')
  );
};

const biasStateMissingSchemaMessage =
  'Bias state storage is not available. Please run the latest Supabase migrations to enable bias tracking.';

type SchemaStatus = 'unknown' | 'available' | 'missing';

type BiasSchemaState = {
  rpc: SchemaStatus;
  view: SchemaStatus;
  table: SchemaStatus;
};

export function useBiasState() {
  const { user } = useAuth();
  const [biasState, setBiasState] = useState<BiasStateResponse>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<BiasSchemaState>({
    rpc: 'unknown',
    view: 'unknown',
    table: 'unknown',
  });
  const [schemaMessage, setSchemaMessage] = useState<string | null>(null);
  const markSchemaStatus = useCallback(
    (key: keyof BiasSchemaState, status: SchemaStatus) => {
      setSchemaStatus(prev => {
        if (prev[key] === status) {
          return prev;
        }

        return { ...prev, [key]: status };
      });
    },
    []
  );
  const dayKey = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const fetchFromTable = useCallback(async (): Promise<BiasStateResponse> => {
    if (schemaStatus.table === 'missing') {
      return null;
    }

    const { data, error } = await supabase
      .from('bias_state')
      .select('*')
      .eq('day_key', dayKey)
      .eq('active', true)
      .order('selected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        console.error(biasStateMissingSchemaMessage, error);
        markSchemaStatus('table', 'missing');
        setSchemaMessage(biasStateMissingSchemaMessage);
        return null;
      }

      throw error;
    }

    markSchemaStatus('table', 'available');

    return data ? mapRowToSnapshot(data) : null;
  }, [dayKey, schemaStatus.table, markSchemaStatus]);

  const fetchFromView = useCallback(async (): Promise<BiasStateResponse> => {
    if (schemaStatus.view === 'missing') {
      return fetchFromTable();
    }

    const { data, error } = await supabase
      .from('v_current_bias')
      .select('*')
      .eq('day_key', dayKey)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        console.warn(
          'v_current_bias view missing. Falling back to direct table query. Run the latest Supabase migrations to enable optimized bias queries.'
        );

        markSchemaStatus('view', 'missing');
        if (!schemaMessage) {
          setSchemaMessage(
            'Bias view is missing. Please run the latest Supabase migrations to enable optimized bias queries.'
          );
        }

        return fetchFromTable();
      }

      throw error;
    }

    markSchemaStatus('view', 'available');

    return data ? mapRowToSnapshot(data) : null;
  }, [dayKey, fetchFromTable, schemaStatus.view, schemaMessage, markSchemaStatus]);

  const fetchCurrent = useCallback(async () => {
    if (!user) {
      setBiasState(null);
      return;
    }

    setLoading(true);
    let shouldAttemptRpc = schemaStatus.rpc !== 'missing';

    if (shouldAttemptRpc) {
      const { data, error } = await supabase.rpc('get_current_bias', {
        target_day: dayKey,
      });

      if (error) {
        if (isMissingFunctionError(error)) {
          console.warn(
            'get_current_bias function missing. Falling back to view query. Run the latest Supabase migrations to enable RPC support.'
          );

          markSchemaStatus('rpc', 'missing');
          if (!schemaMessage) {
            setSchemaMessage(
              'Bias RPC functions are unavailable. Please run the latest Supabase migrations to enable bias tracking.'
            );
          }

          shouldAttemptRpc = false;
        } else {
          console.error('Error loading bias state', error);
          setBiasState(null);
          setLoading(false);
          return;
        }
      } else {
        markSchemaStatus('rpc', 'available');
        setBiasState(data ? mapRowToSnapshot(data) : null);
        setLoading(false);
        return;
      }
    }

    try {
      const fallbackSnapshot = await fetchFromView();
      setBiasState(fallbackSnapshot);
    } catch (fallbackError) {
      const postgrestError =
        fallbackError && typeof fallbackError === 'object' && 'code' in fallbackError
          ? (fallbackError as PostgrestError)
          : null;

      if (isMissingRelationError(postgrestError)) {
        markSchemaStatus('view', 'missing');
        markSchemaStatus('table', 'missing');
        setSchemaMessage(biasStateMissingSchemaMessage);
      }

      console.error('Error loading bias state fallback', fallbackError);
      setBiasState(null);
    } finally {
      setLoading(false);
    }
  }, [user, dayKey, fetchFromView, schemaStatus.rpc, schemaMessage, markSchemaStatus]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const fallbackSaveBiasState = useCallback(
    async (result: BiasQuizResult) => {
      const { error: deactivateError } = await supabase
        .from('bias_state')
        .update({ active: false })
        .eq('day_key', dayKey)
        .eq('active', true);

      if (deactivateError) {
        if (isMissingRelationError(deactivateError)) {
          throw new Error(biasStateMissingSchemaMessage);
        }

        throw deactivateError;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('bias_state')
        .insert({
          day_key: dayKey,
          bias: result.bias,
          market_state: result.market_state ?? null,
          confidence: result.confidence ?? null,
          tags: result.tags.length ? result.tags : null,
          active: true,
          selected_by: user?.id ?? null,
        })
        .select('*')
        .single();

      if (insertError) {
        if (isMissingRelationError(insertError)) {
          throw new Error(biasStateMissingSchemaMessage);
        }

        throw insertError;
      }

      setBiasState(inserted ? mapRowToSnapshot(inserted) : null);
    },
    [dayKey, user?.id]
  );

  const saveBiasState = useCallback(
    async (result: BiasQuizResult) => {
      if (!user) throw new Error('User not authenticated');

      setSaving(true);

      try {
        const { data, error } = await supabase.rpc('set_bias_state', {
          target_day: dayKey,
          target_bias: result.bias,
          target_market_state: result.market_state ?? null,
          target_confidence: result.confidence ?? null,
          target_tags: result.tags.length ? result.tags : null,
        });

        if (error) {
          if (isMissingFunctionError(error)) {
            console.warn(
              'set_bias_state function missing. Falling back to direct table mutation. Run the latest Supabase migrations to enable RPC support.'
            );

            markSchemaStatus('rpc', 'missing');
            if (!schemaMessage) {
              setSchemaMessage(
                'Bias RPC functions are unavailable. Please run the latest Supabase migrations to enable bias tracking.'
              );
            }

            try {
              await fallbackSaveBiasState(result);
            } catch (fallbackError) {
              const postgrestError =
                fallbackError && typeof fallbackError === 'object' && 'code' in fallbackError
                  ? (fallbackError as PostgrestError)
                  : null;

              if (isMissingRelationError(postgrestError)) {
                throw new Error(biasStateMissingSchemaMessage);
              }

              throw fallbackError;
            }
            return;
          }

          throw error;
        }

        setBiasState(data ? mapRowToSnapshot(data) : null);
      } finally {
        setSaving(false);
      }
    },
    [user, dayKey, fallbackSaveBiasState, markSchemaStatus, schemaMessage]
  );

  return {
    biasState,
    dayKey,
    loading,
    saving,
    refresh: fetchCurrent,
    saveBiasState,
    schemaMessage,
  } as const;
}
