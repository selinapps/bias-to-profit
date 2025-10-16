import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface OfflineTrade {
  id: string;
  data: any;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  synced: boolean;
}

interface OfflineStorage {
  isOffline: boolean;
  pendingChanges: OfflineTrade[];
  saveOffline: (data: any, action: 'create' | 'update' | 'delete') => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  clearOfflineData: () => void;
  getOfflineData: (key: string) => any;
  setOfflineData: (key: string, data: any) => void;
}

const OFFLINE_STORAGE_KEY = 'bias-to-profit-offline';
const PENDING_CHANGES_KEY = 'bias-to-profit-pending';

export function useOfflineStorage(): OfflineStorage {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<OfflineTrade[]>([]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending changes on mount
  useEffect(() => {
    const loadPendingChanges = () => {
      try {
        const stored = localStorage.getItem(PENDING_CHANGES_KEY);
        if (stored) {
          const changes = JSON.parse(stored);
          setPendingChanges(changes);
        }
      } catch (error) {
        logger.error('Failed to load pending changes:', error);
      }
    };

    loadPendingChanges();
  }, []);

  // Save pending changes to localStorage
  const savePendingChanges = useCallback((changes: OfflineTrade[]) => {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
      setPendingChanges(changes);
    } catch (error) {
      logger.error('Failed to save pending changes:', error);
    }
  }, []);

  // Save data offline
  const saveOffline = useCallback(async (data: any, action: 'create' | 'update' | 'delete') => {
    if (!user) return;

    const offlineTrade: OfflineTrade = {
      id: data.id || `offline-${Date.now()}`,
      data,
      timestamp: Date.now(),
      action,
      synced: false,
    };

    const updatedChanges = [...pendingChanges, offlineTrade];
    savePendingChanges(updatedChanges);

    // Also save to general offline storage
    setOfflineData(`trade-${offlineTrade.id}`, data);

    toast({
      title: "Saved Offline",
      description: "Changes will sync when online",
      duration: 2000,
    });
  }, [user, pendingChanges, savePendingChanges, toast]);

  // Sync pending changes when online
  const syncPendingChanges = useCallback(async () => {
    if (!user || !navigator.onLine || pendingChanges.length === 0) return;

    const unsyncedChanges = pendingChanges.filter(change => !change.synced);
    const syncedChanges: OfflineTrade[] = [];
    const failedChanges: OfflineTrade[] = [];

    for (const change of unsyncedChanges) {
      try {
        switch (change.action) {
          case 'create':
            await supabase.from('trades').insert({
              ...change.data,
              user_id: user.id,
            });
            break;
          case 'update':
            await supabase.from('trades').update(change.data).eq('id', change.id);
            break;
          case 'delete':
            await supabase.from('trades').delete().eq('id', change.id);
            break;
        }
        
        syncedChanges.push({ ...change, synced: true });
      } catch (error) {
        logger.error(`Failed to sync change ${change.id}:`, error);
        failedChanges.push(change);
      }
    }

    // Update pending changes
    const updatedChanges = [
      ...pendingChanges.filter(change => change.synced),
      ...syncedChanges,
      ...failedChanges,
    ];
    
    savePendingChanges(updatedChanges);

    if (syncedChanges.length > 0) {
      toast({
        title: "Sync Complete",
        description: `${syncedChanges.length} changes synchronized`,
        duration: 2000,
      });
    }

    if (failedChanges.length > 0) {
      toast({
        title: "Sync Partial",
        description: `${failedChanges.length} changes failed to sync`,
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [user, pendingChanges, savePendingChanges, toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (navigator.onLine && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [navigator.onLine, syncPendingChanges]);

  // Clear offline data
  const clearOfflineData = useCallback(() => {
    localStorage.removeItem(PENDING_CHANGES_KEY);
    setPendingChanges([]);
    
    // Clear all offline trade data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('trade-')) {
        localStorage.removeItem(key);
      }
    });

    toast({
      title: "Offline Data Cleared",
      description: "All cached data removed",
      duration: 2000,
    });
  }, [toast]);

  // Generic offline data storage
  const getOfflineData = useCallback((key: string) => {
    try {
      const data = localStorage.getItem(`${OFFLINE_STORAGE_KEY}-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get offline data:', error);
      return null;
    }
  }, []);

  const setOfflineData = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`${OFFLINE_STORAGE_KEY}-${key}`, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to set offline data:', error);
    }
  }, []);

  return {
    isOffline,
    pendingChanges,
    saveOffline,
    syncPendingChanges,
    clearOfflineData,
    getOfflineData,
    setOfflineData,
  };
}
