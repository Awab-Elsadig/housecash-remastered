import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for implementing swipe-to-refresh functionality
 * @param {Function} onRefresh - Function to call when refresh is triggered
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Distance in pixels to trigger refresh (default: 80)
 * @param {number} options.resistance - Resistance factor for pull (default: 2.5)
 * @param {boolean} options.enabled - Whether swipe refresh is enabled (default: true)
 * @returns {Object} - { isRefreshing, pullDistance, pullProgress, refreshTrigger }
 */
const useSwipeRefresh = (onRefresh, options = {}) => {
  const {
    threshold = 80,
    resistance = 2.5,
    enabled = true
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const elementRef = useRef(null);
  const isAtTop = useRef(false);

  // Calculate pull progress (0-1)
  const pullProgress = Math.min(pullDistance / threshold, 1);

  // Check if we're at the top of the scrollable element
  const checkIfAtTop = useCallback(() => {
    if (!elementRef.current) return false;
    return elementRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!enabled || isRefreshing) return;
    
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    isAtTop.current = checkIfAtTop();
  }, [enabled, isRefreshing, checkIfAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!enabled || isRefreshing || !isAtTop.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0) {
      // Pulling down
      e.preventDefault();
      setIsPulling(true);
      
      // Apply resistance to make it harder to pull as distance increases
      const resistanceFactor = Math.max(0, 1 - (deltaY / (threshold * resistance)));
      const adjustedDistance = deltaY * resistanceFactor;
      
      setPullDistance(adjustedDistance);
    } else if (isPulling) {
      // Reset if pulling up
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [enabled, isRefreshing, isAtTop.current, threshold, resistance, isPulling]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || !isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Reset pull distance
      setPullDistance(0);
    }
  }, [enabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Manual refresh trigger
  const refreshTrigger = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    pullProgress,
    refreshTrigger,
    elementRef,
    isPulling
  };
};

export default useSwipeRefresh;
