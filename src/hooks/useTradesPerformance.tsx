import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  fetchTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  realtimeEvents: number;
  errorCount: number;
}

interface UseTradesPerformanceReturn {
  metrics: PerformanceMetrics;
  isSlowConnection: boolean;
  shouldUseOptimizations: boolean;
  logPerformance: (operation: string, duration: number) => void;
  logError: (error: string) => void;
  resetMetrics: () => void;
}

export function useTradesPerformance(): UseTradesPerformanceReturn {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fetchTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    realtimeEvents: 0,
    errorCount: 0
  });

  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [shouldUseOptimizations, setShouldUseOptimizations] = useState(false);
  
  const performanceHistory = useRef<number[]>([]);
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);
  const realtimeEventCount = useRef(0);
  const errorCount = useRef(0);

  // Monitor connection speed
  useEffect(() => {
    const checkConnectionSpeed = async () => {
      if (!navigator.onLine) {
        setIsSlowConnection(true);
        setShouldUseOptimizations(true);
        return;
      }

      try {
        const start = performance.now();
        const response = await fetch('/api/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const end = performance.now();
        
        const latency = end - start;
        const isSlow = latency > 1000 || !response.ok;
        
        setIsSlowConnection(isSlow);
        setShouldUseOptimizations(isSlow || navigator.hardwareConcurrency < 4);
      } catch (error) {
        setIsSlowConnection(true);
        setShouldUseOptimizations(true);
      }
    };

    checkConnectionSpeed();
    
    // Check periodically
    const interval = setInterval(checkConnectionSpeed, 30000);
    return () => clearInterval(interval);
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage: usage
        }));

        // Enable optimizations if memory usage is high
        if (usage > 100) {
          setShouldUseOptimizations(true);
        }
      }
    };

    monitorMemory();
    const interval = setInterval(monitorMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  // Log performance metrics
  const logPerformance = useCallback((operation: string, duration: number) => {
    performanceHistory.current.push(duration);
    
    // Keep only last 100 measurements
    if (performanceHistory.current.length > 100) {
      performanceHistory.current.shift();
    }

    // Calculate average performance
    const avgPerformance = performanceHistory.current.reduce((a, b) => a + b, 0) / performanceHistory.current.length;
    
    setMetrics(prev => ({
      ...prev,
      fetchTime: operation === 'fetch' ? duration : prev.fetchTime,
      renderTime: operation === 'render' ? duration : prev.renderTime
    }));

    // Enable optimizations if performance is consistently poor
    if (avgPerformance > 1000) {
      setShouldUseOptimizations(true);
    }
  }, []);

  // Log errors
  const logError = useCallback((error: string) => {
    errorCount.current += 1;
    setMetrics(prev => ({
      ...prev,
      errorCount: errorCount.current
    }));

    logger.error('Trades Performance Error:', error);
  }, []);

  // Update cache hit rate
  const updateCacheHitRate = useCallback((hit: boolean) => {
    if (hit) {
      cacheHits.current += 1;
    } else {
      cacheMisses.current += 1;
    }

    const total = cacheHits.current + cacheMisses.current;
    const hitRate = total > 0 ? (cacheHits.current / total) * 100 : 0;

    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hitRate
    }));
  }, []);

  // Track real-time events
  const trackRealtimeEvent = useCallback(() => {
    realtimeEventCount.current += 1;
    setMetrics(prev => ({
      ...prev,
      realtimeEvents: realtimeEventCount.current
    }));
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      fetchTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      realtimeEvents: 0,
      errorCount: 0
    });
    
    performanceHistory.current = [];
    cacheHits.current = 0;
    cacheMisses.current = 0;
    realtimeEventCount.current = 0;
    errorCount.current = 0;
  }, []);

  // Performance recommendations
  useEffect(() => {
    const { fetchTime, renderTime, memoryUsage, cacheHitRate, errorCount } = metrics;
    
    let recommendations: string[] = [];
    
    if (fetchTime > 2000) {
      recommendations.push('Consider enabling database query caching');
    }
    
    if (renderTime > 100) {
      recommendations.push('Consider using React.memo for expensive components');
    }
    
    if (memoryUsage > 150) {
      recommendations.push('Consider implementing data pagination');
    }
    
    if (cacheHitRate < 50) {
      recommendations.push('Consider improving cache strategy');
    }
    
    if (errorCount > 10) {
      recommendations.push('Consider implementing error boundaries');
    }

    if (recommendations.length > 0) {
      logger.warn('Performance Recommendations:', recommendations);
    }
  }, [metrics]);

  return {
    metrics,
    isSlowConnection,
    shouldUseOptimizations,
    logPerformance,
    logError,
    resetMetrics
  };
}
