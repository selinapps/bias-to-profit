import { useState, useEffect, useCallback, useMemo } from 'react';

interface PerformanceMetrics {
  isLowEndDevice: boolean;
  isSlowConnection: boolean;
  memoryUsage: number;
  shouldUseLazyLoading: boolean;
  shouldReduceAnimations: boolean;
  shouldOptimizeImages: boolean;
  recommendedBatchSize: number;
}

interface MobilePerformance {
  metrics: PerformanceMetrics;
  optimizeForDevice: () => void;
  shouldLazyLoad: (componentName: string) => boolean;
  getOptimalBatchSize: (dataType: 'trades' | 'charts' | 'tables') => number;
  isPerformanceMode: boolean;
  enablePerformanceMode: () => void;
  disablePerformanceMode: () => void;
}

export function useMobilePerformance(): MobilePerformance {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);

  // Detect device capabilities
  useEffect(() => {
    const detectDeviceCapabilities = () => {
      // Check hardware concurrency (CPU cores)
      const cores = navigator.hardwareConcurrency || 2;
      
      // Check device memory (if available)
      const deviceMemory = (navigator as any).deviceMemory || 4;
      
      // Check connection speed
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || '4g';
      
      // Check screen resolution and pixel ratio
      const screenArea = window.screen.width * window.screen.height;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Determine if it's a low-end device
      const isLowEnd = cores <= 2 || deviceMemory <= 2 || screenArea < 1000000;
      setIsLowEndDevice(isLowEnd);
      
      // Determine if connection is slow
      const isSlow = effectiveType === '2g' || effectiveType === 'slow-2g' || 
                    (connection?.downlink && connection.downlink < 1);
      setIsSlowConnection(isSlow);
      
      // Estimate memory usage
      const estimatedMemory = (performance as any).memory?.usedJSHeapSize || 0;
      setMemoryUsage(estimatedMemory);
    };

    detectDeviceCapabilities();
    
    // Re-check on resize
    window.addEventListener('resize', detectDeviceCapabilities);
    return () => window.removeEventListener('resize', detectDeviceCapabilities);
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage(memory.usedJSHeapSize / (1024 * 1024)); // Convert to MB
      }
    };

    const interval = setInterval(monitorMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo((): PerformanceMetrics => ({
    isLowEndDevice,
    isSlowConnection,
    memoryUsage,
    shouldUseLazyLoading: isLowEndDevice || isSlowConnection || memoryUsage > 100,
    shouldReduceAnimations: isLowEndDevice || memoryUsage > 150,
    shouldOptimizeImages: isSlowConnection || isLowEndDevice,
    recommendedBatchSize: isLowEndDevice ? 10 : isSlowConnection ? 20 : 50,
  }), [isLowEndDevice, isSlowConnection, memoryUsage]);

  const optimizeForDevice = useCallback(() => {
    // Apply optimizations based on device capabilities
    if (metrics.shouldReduceAnimations) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
    }
    
    if (metrics.shouldOptimizeImages) {
      // Reduce image quality for slow connections
      document.documentElement.style.setProperty('--image-quality', '0.7');
    }
  }, [metrics]);

  const shouldLazyLoad = useCallback((componentName: string) => {
    const lazyLoadComponents = ['charts', 'heatmaps', 'analytics', 'reports'];
    return metrics.shouldUseLazyLoading && lazyLoadComponents.includes(componentName);
  }, [metrics.shouldUseLazyLoading]);

  const getOptimalBatchSize = useCallback((dataType: 'trades' | 'charts' | 'tables') => {
    const baseSize = metrics.recommendedBatchSize;
    
    switch (dataType) {
      case 'trades':
        return Math.min(baseSize, 25);
      case 'charts':
        return Math.min(baseSize, 10);
      case 'tables':
        return Math.min(baseSize, 15);
      default:
        return baseSize;
    }
  }, [metrics.recommendedBatchSize]);

  const enablePerformanceMode = useCallback(() => {
    setIsPerformanceMode(true);
    optimizeForDevice();
  }, [optimizeForDevice]);

  const disablePerformanceMode = useCallback(() => {
    setIsPerformanceMode(false);
    // Reset optimizations
    document.documentElement.style.removeProperty('--animation-duration');
    document.documentElement.style.removeProperty('--image-quality');
  }, []);

  return {
    metrics,
    optimizeForDevice,
    shouldLazyLoad,
    getOptimalBatchSize,
    isPerformanceMode,
    enablePerformanceMode,
    disablePerformanceMode,
  };
}
