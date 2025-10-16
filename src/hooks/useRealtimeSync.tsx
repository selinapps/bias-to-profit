import React, { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface RealtimeSyncOptions {
  onTradeUpdate?: () => void;
  onBiasStateUpdate?: () => void;
  onSettingsUpdate?: () => void;
  onUserSettingsUpdate?: () => void;
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(navigator.onLine && !!user);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleRealtimeEvent = useCallback((event: string, table: string) => {
    logger.debug(`Realtime event: ${event} on ${table}`);
    setLastSyncTime(new Date());
    
    // Trigger appropriate callbacks
    switch (table) {
      case 'trades':
        options.onTradeUpdate?.();
        break;
      case 'bias_state':
        options.onBiasStateUpdate?.();
        break;
      case 'user_settings':
        options.onSettingsUpdate?.();
        break;
    }
  }, [options]);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(navigator.onLine && !!user);
      if (user) {
        toast({
          title: "Back Online",
          description: "Connection restored",
          duration: 2000,
        });
      }
    };

    const handleOffline = () => {
      setIsConnected(false);
      toast({
        title: "Offline",
        description: "Working in offline mode",
        variant: "destructive",
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, user]);

  useEffect(() => {
    // Update connection status based on user and online status
    setIsConnected(navigator.onLine && !!user);
    
    if (!user) {
      return;
    }

    const channels: any[] = [];

    // Trades realtime subscription
    const tradesChannel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeEvent(payload.eventType, 'trades');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Trades realtime subscription active');
        }
      });

    channels.push(tradesChannel);

    // Bias state realtime subscription
    const biasChannel = supabase
      .channel('bias-state-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bias_state',
          filter: `selected_by=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeEvent(payload.eventType, 'bias_state');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Bias state realtime subscription active');
        }
      });

    channels.push(biasChannel);

    // User settings realtime subscription
    const settingsChannel = supabase
      .channel('user-settings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeEvent(payload.eventType, 'user_settings');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('User settings realtime subscription active');
        }
      });

    channels.push(settingsChannel);

    // Connection status monitoring - simplified
    // We'll rely on browser online/offline events and user status
    // instead of complex Supabase connection monitoring

    // Cleanup function
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      // Don't set isConnected to false here - let the user/online status determine it
    };
  }, [user, handleRealtimeEvent, toast]);

  // Manual sync function for offline scenarios
  const forceSync = useCallback(async () => {
    if (!user) return;
    
    try {
      // Trigger all sync callbacks
      options.onTradeUpdate?.();
      options.onBiasStateUpdate?.();
      options.onSettingsUpdate?.();
      options.onUserSettingsUpdate?.();
      
      setLastSyncTime(new Date());
      toast({
        title: "Sync Complete",
        description: "All data synchronized",
        duration: 2000,
      });
    } catch (error) {
      logger.error('Manual sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Could not synchronize data",
        variant: "destructive",
      });
    }
  }, [user, options, toast]);

  return {
    isConnected,
    lastSyncTime,
    forceSync,
  };
}
