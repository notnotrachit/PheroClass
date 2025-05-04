import { useState, useEffect, useRef, useCallback } from "react";

interface UseSwipeNavigationProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for a swipe to be registered
  preventDefaultTouchmoveEvent?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  endX: number;
  endY: number;
  endTime: number;
}

/**
 * A hook to handle swipe navigation gestures
 */
const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventDefaultTouchmoveEvent = true,
}: UseSwipeNavigationProps) => {
  const touchRef = useRef<TouchData | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: new Date().getTime(),
      endX: 0,
      endY: 0,
      endTime: 0,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        // Only prevent default if the swipe is more horizontal than vertical
        if (touchRef.current) {
          const touch = e.touches[0];
          const deltaX = Math.abs(touch.clientX - touchRef.current.startX);
          const deltaY = Math.abs(touch.clientY - touchRef.current.startY);
          
          if (deltaX > deltaY) {
            e.preventDefault();
          }
        }
      }
    },
    [preventDefaultTouchmoveEvent]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchRef.current) return;
      
      const touch = e.changedTouches[0];
      touchRef.current.endX = touch.clientX;
      touchRef.current.endY = touch.clientY;
      touchRef.current.endTime = new Date().getTime();
      
      const deltaX = touchRef.current.endX - touchRef.current.startX;
      const deltaY = touchRef.current.endY - touchRef.current.startY;
      const deltaTime = touchRef.current.endTime - touchRef.current.startTime;
      
      // Check if the swipe is more horizontal than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Only register swipes that exceed the threshold and are fast enough (< 300ms)
        if (Math.abs(deltaX) > threshold && deltaTime < 300) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      }
      
      touchRef.current = null;
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  useEffect(() => {
    const currentContainer = containerRef;
    
    if (currentContainer) {
      currentContainer.addEventListener("touchstart", handleTouchStart);
      currentContainer.addEventListener("touchmove", handleTouchMove, { passive: !preventDefaultTouchmoveEvent });
      currentContainer.addEventListener("touchend", handleTouchEnd);
    }
    
    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener("touchstart", handleTouchStart);
        currentContainer.removeEventListener("touchmove", handleTouchMove);
        currentContainer.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchmoveEvent]);
  
  return { ref: setContainerRef };
};

export default useSwipeNavigation;