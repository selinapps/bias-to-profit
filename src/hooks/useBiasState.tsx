import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import type { BiasQuizResult, BiasStateSnapshot } from '@/types/bias';

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

export function useBiasState() {
  const { user } = useAuth();
  const [biasState, setBiasState] = useState<BiasStateResponse>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dayKey = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const fetchCurrent = useCallback(async () => {
    if (!user) {
      setBiasState(null);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('v_current_bias')
      .select('*')
      .eq('day_key', dayKey)
      .maybeSingle();

    if (error) {
      console.error('Error loading bias state', error);
      setBiasState(null);
    } else {
      setBiasState(data ? mapRowToSnapshot(data) : null);
    }

    setLoading(false);
  }, [user, dayKey]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const saveBiasState = useCallback(
    async (result: BiasQuizResult) => {
      if (!user) throw new Error('User not authenticated');

      setSaving(true);

      try {
        const { error: deactivateError } = await supabase
          .from('bias_state')
          .update({ active: false })
          .eq('day_key', dayKey)
          .eq('active', true);

        if (deactivateError) {
          throw deactivateError;
        }

        const insertPayload: Database['public']['Tables']['bias_state']['Insert'] = {
          day_key: dayKey,
          bias: result.bias,
          market_state: result.market_state ?? null,
          confidence: result.confidence ?? null,
          tags: result.tags,
          selected_by: user.id,
          active: true,
        };

        const { data, error } = await supabase
          .from('bias_state')
          .insert(insertPayload)
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        setBiasState(mapRowToSnapshot(data));
      } finally {
        setSaving(false);
      }
    },
    [user, dayKey]
  );

  return {
    biasState,
    dayKey,
    loading,
    saving,
    refresh: fetchCurrent,
    saveBiasState,
  } as const;
}
