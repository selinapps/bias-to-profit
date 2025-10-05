import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface PushNotificationService {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (options: PushNotificationOptions) => void;
  showTradeAlert: (trade: any, type: 'entry' | 'exit' | 'stop') => void;
  showBiasAlert: (bias: string, confidence: string) => void;
  showSessionAlert: (session: string) => void;
}

export function usePushNotifications(): PushNotificationService {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsEnabled(result === 'granted');
      
      if (result === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive alerts for trades and market updates",
        });
      } else {
        toast({
          title: "Notifications Blocked",
          description: "You can enable them in your browser settings",
          variant: "destructive",
        });
      }
      
      return result === 'granted';
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
      return false;
    }
  }, [isSupported, toast]);

  const showNotification = useCallback((options: PushNotificationOptions) => {
    if (!isEnabled || !isSupported) return;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      logger.error('Failed to show notification:', error);
    }
  }, [isEnabled, isSupported]);

  const showTradeAlert = useCallback((trade: any, type: 'entry' | 'exit' | 'stop') => {
    if (!isEnabled) return;

    const alerts = {
      entry: {
        title: '🚀 Trade Opened',
        body: `${trade.side} ${trade.asset} at ${trade.entry}`,
        tag: `trade-${trade.id}`,
        requireInteraction: true,
      },
      exit: {
        title: '✅ Trade Closed',
        body: `${trade.side} ${trade.asset} - PnL: ${trade.pnl ? `$${trade.pnl}` : 'N/A'}`,
        tag: `trade-${trade.id}`,
        requireInteraction: true,
      },
      stop: {
        title: '⚠️ Stop Loss Hit',
        body: `${trade.side} ${trade.asset} stopped at ${trade.exitPrice}`,
        tag: `trade-${trade.id}`,
        requireInteraction: true,
      },
    };

    const alert = alerts[type];
    showNotification(alert);
  }, [isEnabled, showNotification]);

  const showBiasAlert = useCallback((bias: string, confidence: string) => {
    if (!isEnabled) return;

    showNotification({
      title: '🎯 Bias Updated',
      body: `${bias} - Confidence: ${confidence}`,
      tag: 'bias-update',
      requireInteraction: false,
    });
  }, [isEnabled, showNotification]);

  const showSessionAlert = useCallback((session: string) => {
    if (!isEnabled) return;

    showNotification({
      title: '🌍 Session Active',
      body: `${session} session is now active`,
      tag: 'session-alert',
      requireInteraction: false,
    });
  }, [isEnabled, showNotification]);

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    showNotification,
    showTradeAlert,
    showBiasAlert,
    showSessionAlert,
  };
}
