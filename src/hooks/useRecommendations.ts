import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type Recommendation = Database['public']['Tables']['recommendations']['Row'];
type RecommendationInsert = Database['public']['Tables']['recommendations']['Insert'];
type RecommendationUpdate = Database['public']['Tables']['recommendations']['Update'];

export function useRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all recommendations for the user
  const fetchRecommendations = useCallback(async () => {
    if (!user) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRecommendations(data || []);
      logger.info('Fetched recommendations', { count: data?.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      logger.error('Error fetching recommendations:', err);
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Generate new recommendations
  const generateRecommendations = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to generate recommendations',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Call the RPC function to generate recommendations
      const { data, error: rpcError } = await supabase.rpc('generate_recommendations', {
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;

      const count = data || 0;
      
      toast({
        title: '✅ Recommendations Generated',
        description: `Generated ${count} new recommendation${count !== 1 ? 's' : ''} based on your trading data.`,
      });

      logger.info('Generated recommendations', { count });

      // Refresh the recommendations list
      await fetchRecommendations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
      logger.error('Error generating recommendations:', err);
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }, [user, toast, fetchRecommendations]);

  // Mark recommendation as implemented
  const markAsImplemented = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ status: 'implemented' })
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: '✅ Marked as Implemented',
        description: 'Great! Track the results to verify improvement.',
      });

      logger.info('Recommendation implemented', { recommendationId });

      // Update local state
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, status: 'implemented' } : rec
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recommendation';
      logger.error('Error marking recommendation as implemented:', err);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Dismiss recommendation
  const dismiss = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ status: 'dismissed' })
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Dismissed',
        description: 'Recommendation removed from active list.',
      });

      logger.info('Recommendation dismissed', { recommendationId });

      // Update local state
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, status: 'dismissed' } : rec
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss recommendation';
      logger.error('Error dismissing recommendation:', err);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Delete recommendation
  const deleteRecommendation = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Deleted',
        description: 'Recommendation permanently removed.',
      });

      logger.info('Recommendation deleted', { recommendationId });

      // Update local state
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete recommendation';
      logger.error('Error deleting recommendation:', err);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Load recommendations on mount and when user changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Categorize recommendations by priority
  const critical = recommendations.filter(r => r.status === 'active' && r.priority === 'critical');
  const high = recommendations.filter(r => r.status === 'active' && r.priority === 'high');
  const medium = recommendations.filter(r => r.status === 'active' && r.priority === 'medium');
  const low = recommendations.filter(r => r.status === 'active' && r.priority === 'low');
  const implemented = recommendations.filter(r => r.status === 'implemented');
  const dismissed = recommendations.filter(r => r.status === 'dismissed');

  return {
    // Data
    recommendations,
    critical,
    high,
    medium,
    low,
    implemented,
    dismissed,
    
    // State
    loading,
    generating,
    error,
    
    // Actions
    generateRecommendations,
    fetchRecommendations,
    markAsImplemented,
    dismiss,
    deleteRecommendation,
  };
}

