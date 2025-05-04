import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

interface SwipeTransitionProps {
  activeTab: string;
  tabOrder: string[];
  onChangeTab: (tab: string) => void;
  threshold?: number;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  swiping: boolean;
  direction: 'left' | 'right' | null;
}

interface TouchableRef {
  [key: string]: HTMLElement | null;
}

const useSwipeTransition = ({
  activeTab,
  tabOrder,
  onChangeTab,
  threshold = 50,
}: SwipeTransitionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchableRefs = useRef<TouchableRef>({});
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    swiping: false,
    direction: null,
  });
  const [transition, setTransition] = useState(false);
  
  // Check for View Transitions API support
  const supportsViewTransition = typeof document !== 'undefined' && 
    'startViewTransition' in document && 
    typeof (document as any).startViewTransition === 'function';

  // Register content elements for tracking
  const registerContentRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      touchableRefs.current[id] = el;
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setSwipeState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      swiping: true,
      direction: null,
    });
  }, []);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!swipeState.swiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;

    // If vertical scrolling is more prominent than horizontal, don't interfere
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      setSwipeState(prev => ({ ...prev, swiping: false }));
      return;
    }

    // Prevent default to stop page scrolling when swiping horizontally
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }

    // Apply real-time transform to active content
    const currentTabIndex = tabOrder.indexOf(activeTab);
    const activeElement = touchableRefs.current[activeTab];
    
    if (activeElement) {
      // Calculate how much to transform (with resistance at edges)
      let transformX = deltaX;
      
      // Add resistance at edges
      if ((currentTabIndex === 0 && deltaX > 0) || 
          (currentTabIndex === tabOrder.length - 1 && deltaX < 0)) {
        transformX = deltaX / 3; // Reduced movement at edges
      }
      
      // Apply transform to current tab
      activeElement.style.transform = `translateX(${transformX}px)`;
      activeElement.style.opacity = `${1 - Math.min(Math.abs(deltaX) / 300, 0.3)}`;
      
      // Prepare adjacent tab if needed
      const direction = deltaX < 0 ? 'left' : 'right';
      const adjacentTabIndex = deltaX < 0 ? currentTabIndex + 1 : currentTabIndex - 1;
      
      if (adjacentTabIndex >= 0 && adjacentTabIndex < tabOrder.length) {
        const adjacentTab = tabOrder[adjacentTabIndex];
        const adjacentElement = touchableRefs.current[adjacentTab];
        
        if (adjacentElement) {
          // Position the adjacent tab
          const startPosition = direction === 'left' ? 100 : -100;
          const movement = Math.abs(deltaX);
          
          adjacentElement.style.transform = `translateX(${startPosition - (movement * (startPosition / threshold))}%)`;
          adjacentElement.style.opacity = `${Math.min(Math.abs(deltaX) / threshold, 1)}`;
          adjacentElement.style.display = 'block';
          adjacentElement.style.zIndex = '1';
        }
      }
    }

    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction: deltaX < 0 ? 'left' : 'right',
    }));
  }, [activeTab, swipeState, tabOrder, threshold]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!swipeState.swiping) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    
    // Determine if swipe was significant enough to change tabs
    const currentTabIndex = tabOrder.indexOf(activeTab);
    let newTabIndex = currentTabIndex;
    
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX < 0 && currentTabIndex < tabOrder.length - 1) {
        // Swipe left - go to next tab
        newTabIndex = currentTabIndex + 1;
      } else if (deltaX > 0 && currentTabIndex > 0) {
        // Swipe right - go to previous tab
        newTabIndex = currentTabIndex - 1;
      }
    }
    
    const shouldChangeTab = newTabIndex !== currentTabIndex;
    
    if (shouldChangeTab) {
      // Use View Transitions API if available - this provides the smooth animation
      if (supportsViewTransition) {
        // Skip resetting transforms to avoid the "snap back" effect
        // The view transition API will handle the smooth animation
        
        // Start view transition and change tab immediately
        (document as any).startViewTransition(() => {
          // Change the tab
          onChangeTab(tabOrder[newTabIndex]);
          return Promise.resolve();
        });
      } else {
        // Animate the transition explicitly for browsers that don't support View Transitions API
        setTransition(true);
        
        // Use the current direction of swipe for the animation
        const targetTab = tabOrder[newTabIndex];
        const currentElement = touchableRefs.current[activeTab];
        const targetElement = touchableRefs.current[targetTab];
        
        if (currentElement && targetElement) {
          // Finish the swipe animation
          const direction = deltaX < 0 ? -1 : 1;
          
          // Set final positions before transition
          currentElement.style.transform = `translateX(${direction * -100}%)`;
          currentElement.style.opacity = '0';
          
          targetElement.style.transform = 'translateX(0)';
          targetElement.style.opacity = '1';
          targetElement.style.display = 'block';
          
          // Change tab after animation completes
          setTimeout(() => {
            onChangeTab(targetTab);
            
            // Reset styles after the transition
            setTimeout(() => {
              Object.values(touchableRefs.current).forEach(el => {
                if (el) {
                  el.style.transform = '';
                  el.style.opacity = '';
                  el.style.display = '';
                }
              });
              
              setTransition(false);
            }, 50);
          }, 250);
        } else {
          // Fallback if elements not found
          onChangeTab(targetTab);
        }
      }
    } else {
      // If not changing tabs, animate back to original position
      setTransition(true);
      
      Object.values(touchableRefs.current).forEach(el => {
        if (el) {
          el.style.transform = '';
          el.style.opacity = '';
        }
      });
      
      // Reset transition after animation completes
      setTimeout(() => {
        Object.values(touchableRefs.current).forEach(el => {
          if (el) {
            el.style.display = '';
          }
        });
        setTransition(false);
      }, 300);
    }
    
    // Reset swipe state
    setSwipeState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      swiping: false,
      direction: null,
    });
  }, [activeTab, onChangeTab, swipeState, tabOrder, threshold, supportsViewTransition]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // When tab changes outside of swipe, make sure animations are handled properly
  useEffect(() => {
    // Reset all transformations
    Object.values(touchableRefs.current).forEach((el) => {
      if (el) {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.zIndex = '';
        el.style.display = '';
      }
    });
  }, [activeTab]);

  return {
    containerRef,
    registerContentRef,
    transition,
  };
};

export default useSwipeTransition;