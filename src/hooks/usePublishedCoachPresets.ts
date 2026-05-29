import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PublishedCoachPreset = {
  id: string;
  key: string;
  name: string;
};

const GENERIC_PRESET: PublishedCoachPreset = {
  id: 'generic',
  key: 'generic',
  name: 'Generic',
};

type CoachPresetQuery = {
  select: (columns: string) => {
    eq: (column: string, value: boolean) => {
      order: (column: string) => Promise<{ data: PublishedCoachPreset[] | null; error: Error | null }>;
    };
  };
};

type SupabaseWithDynamicTables = {
  from: (table: 'coach_presets') => CoachPresetQuery;
};

export function usePublishedCoachPresets() {
  return useQuery({
    queryKey: ['coach-presets', 'published'],
    queryFn: async (): Promise<PublishedCoachPreset[]> => {
      const { data, error } = await (supabase as unknown as SupabaseWithDynamicTables)
        .from('coach_presets')
        .select('id, key, name')
        .eq('is_published', true)
        .order('name');

      if (error) {
        throw error;
      }

      const presets = (data ?? []) as PublishedCoachPreset[];
      const hasGeneric = presets.some((preset) => preset.key === GENERIC_PRESET.key);

      return hasGeneric ? presets : [GENERIC_PRESET, ...presets];
    },
    staleTime: 60_000,
  });
}
