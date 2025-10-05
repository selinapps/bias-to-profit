import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MobileOptimizations {
  isMobile: boolean;
  isOnline: boolean;
  isLowBandwidth: boolean;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  devicePixelRatio: number;
  viewportHeight: number;
  viewportWidth: number;
  enableHapticFeedback: () => void;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  isOfflineMode: boolean;
}

export function useMobileOptimizations(): MobileOptimizations {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [touchSupport, setTouchSupport] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio || 1);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
      setTouchSupport(isTouchDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isOfflineMode) {
        toast({
          title: "Back Online",
          description: "Connection restored",
          duration: 2000,
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Some features may be limited",
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
  }, [isOfflineMode, toast]);

  // Monitor connection quality
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnectionQuality = () => {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setIsLowBandwidth(true);
        } else {
          setIsLowBandwidth(false);
        }
      };

      updateConnectionQuality();
      connection.addEventListener('change', updateConnectionQuality);

      return () => {
        connection.removeEventListener('change', updateConnectionQuality);
      };
    }
  }, []);

  // Monitor orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
    };

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Monitor viewport changes
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Haptic feedback for mobile devices
  const enableHapticFeedback = useCallback(() => {
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
  }, [isMobile]);

  // Offline mode management
  const enableOfflineMode = useCallback(() => {
    setIsOfflineMode(true);
    toast({
      title: "Offline Mode Enabled",
      description: "Data will be cached locally",
      duration: 2000,
    });
  }, [toast]);

  const disableOfflineMode = useCallback(() => {
    setIsOfflineMode(false);
    toast({
      title: "Online Mode",
      description: "Real-time sync enabled",
      duration: 2000,
    });
  }, [toast]);

  return {
    isMobile,
    isOnline,
    isLowBandwidth,
    orientation,
    touchSupport,
    devicePixelRatio,
    viewportHeight,
    viewportWidth,
    enableHapticFeedback,
    enableOfflineMode,
    disableOfflineMode,
    isOfflineMode,
  };
}
