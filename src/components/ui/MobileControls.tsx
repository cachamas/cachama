import React, { useEffect, useRef, useCallback, useState } from 'react';
import nipplejs, { JoystickManager, JoystickOutputData } from 'nipplejs';
import { useInteractionStore } from '@/stores/interactionStore';
import { useLoadingStore } from '@/stores/loadingStore';
import { useMapStore } from '@/stores/mapStore';

// Add debug logging utility
const DEBUG = true;
const debugLog = (component: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[${component}] ${message}`, data || '');
  }
};

// Improved mobile detection
const isMobileDevice = (): boolean => {
  debugLog('MobileControls', 'Checking if mobile device...');
  
  // First check if we're in a browser environment
  if (typeof window === 'undefined') {
    debugLog('MobileControls', 'Not in browser environment');
    return false;
  }

  // Check for touch support first
  const hasTouch = 'ontouchstart' in window || 
                  navigator.maxTouchPoints > 0 ||
                  (navigator as any).msMaxTouchPoints > 0;

  // Then check user agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
  
  // Check for tablet specifically
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(userAgent);

  const result = hasTouch && (isMobile || isTablet);
  debugLog('MobileControls', `Device detection result: ${result}`, {
    hasTouch,
    isMobile,
    isTablet,
    userAgent
  });
  
  return result;
};

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number; } | null) => void;
  onLook: (vector: { x: number; y: number; } | null) => void;
  onJump: () => void;
  onShoot: () => void;
  onReload: () => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ 
  onMove, 
  onLook,
  onJump,
  onShoot,
  onReload
}) => {
  // State for UI visibility and initialization
  const [isUIVisible, setIsUIVisible] = useState(true); // Always visible by default
  const [isInitialized, setIsInitialized] = useState(false);
  const { isPhysicsReady, isMapFullyReady } = useLoadingStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isGCTGalleryOpen, setIsGCTGalleryOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // The toris effect should be global for all mobile UI elements
  const { currentMap } = useMapStore();
  const isTorisMap = currentMap === 'toris';
  
  // Add resilience tracking
  const [joystickError, setJoystickError] = useState<string | null>(null);
  const lastJoystickActivity = useRef<number>(Date.now());
  const initializationAttempts = useRef<number>(0);
  
  // Force mobile mode for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__hasMobileControls__ = true;
    }
  }, []);

  // One-time mobile setup
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    
    if (mobile || window.__hasMobileControls__) {
      document.body.setAttribute('data-is-mobile', 'true');
      document.documentElement.style.touchAction = 'none';
      document.body.style.overscrollBehavior = 'none';
    }
  }, []);

  // Refs for DOM elements and state
  const moveJoystickRef = useRef<HTMLDivElement>(null);
  const lookAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const moveManagerRef = useRef<JoystickManager | null>(null);
  
  // Refs for touch tracking
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const lastTouchRef = useRef<{x: number, y: number} | null>(null);
  const isLookingRef = useRef(false);
  const hasMoveRef = useRef(false);

  // Constants for touch interaction
  const TAP_THRESHOLD = 300;
  const MOVE_THRESHOLD = 10;

  // Get interaction store functions
  const hoveredObject = useInteractionStore(state => state.hoveredObject);
  
  // Add iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Cleanup function for joystick
  const cleanupJoystick = useCallback(() => {
    if (moveManagerRef.current) {
      try {
        moveManagerRef.current.off('move', () => {});
        moveManagerRef.current.off('end', () => {});
        moveManagerRef.current.destroy();
      } catch (error) {
        debugLog('MobileControls', 'Error destroying joystick:', error);
      }
      moveManagerRef.current = null;
    }
  }, []);
  
  // Handle map changes and cleanup
  useEffect(() => {
    const cleanup = () => {
      // Reset touch tracking refs
      touchStartRef.current = null;
      lastTouchRef.current = null;
      isLookingRef.current = false;
      hasMoveRef.current = false;
      
      // Reset move vector
      onMove({ x: 0, y: 0 });
      onLook({ x: 0, y: 0 });
    };

    // Track map changes for logging
    const handleMapChange = (e: CustomEvent) => {
      const mapName = e.detail?.map || (window as any).currentMap || '';
      
      // Reset controls
      cleanup();
      
      debugLog('MobileControls', `Map changed to: ${mapName}, isToris: ${mapName === 'toris'}`);
    };

    // Listen for map changes
    window.addEventListener('map-change', cleanup);
    window.addEventListener('map-changed', handleMapChange as EventListener);
    
    return () => {
      window.removeEventListener('map-change', cleanup);
      window.removeEventListener('map-changed', handleMapChange as EventListener);
      cleanup();
    };
  }, [onMove, onLook]);

  // Initialize joystick once and keep it forever
  const initializeJoystick = useCallback(() => {
    // Clean up existing joystick first
    cleanupJoystick();
    
    // Safety check for DOM references
    if (!moveJoystickRef.current) {
      console.error('Cannot initialize joystick - no DOM element available');
      return false;
    }

    try {
      debugLog('MobileControls', 'Initializing joystick, attempt: ' + (initializationAttempts.current + 1));
      initializationAttempts.current++;
      
      // Create joystick with optimized settings
      moveManagerRef.current = nipplejs.create({
        zone: moveJoystickRef.current,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(255, 255, 255, 0.7)',
        size: 120,
        dynamicPage: true,
        lockX: false,
        lockY: false,
        maxNumberOfNipples: 1,
        threshold: 0.12,
        fadeTime: 50
      });

      if (moveManagerRef.current) {
        setJoystickError(null);
        
        // Set up event listeners with error handling
        try {
          moveManagerRef.current.on('move', (_, data: JoystickOutputData) => {
            // Update activity timestamp
            lastJoystickActivity.current = Date.now();
            
            const vector = data.vector;
            const force = Math.min(1, data.force);
            
            // Get current map for movement scaling
            const currentMap = (window as any).currentMap || 'default';
            const movementScale = currentMap === 'toris' ? 0.85 : 
                                currentMap === 'gct' ? 0.9 : 1.0;
            
            // Apply movement data
            onMove({ 
              x: vector.x * force * movementScale, 
              y: vector.y * force * movementScale 
            });
          });
          
          moveManagerRef.current.on('end', () => {
            // Update activity timestamp
            lastJoystickActivity.current = Date.now();
            
            // Reset movement
            onMove({ x: 0, y: 0 });
          });

          setIsInitialized(true);
          return true;
        } catch (eventError) {
          console.error('Error setting up joystick events:', eventError);
          setJoystickError('event_setup_failed');
          return false;
        }
      }
    } catch (error) {
      console.error('Error initializing joystick:', error);
      setJoystickError('initialization_failed');
      return false;
    }
    
    return false;
  }, [onMove, cleanupJoystick]);

  // Initialize joystick with resilience
  useEffect(() => {
    if ((isMobile || window.__hasMobileControls__) && !isTorisMap) {
      // Only initialize if NOT in Toris map
      const success = initializeJoystick();
      
      // Set up periodic check for joystick responsiveness
      const healthCheckInterval = setInterval(() => {
        // Skip health checks if in Toris map
        if (isTorisMap) {
          return;
        }
        
        const now = Date.now();
        const elapsedTime = now - lastJoystickActivity.current;
        
        // Detect current map - heavy maps need more frequent checks
        const currentMap = (window as any).currentMap || '';
        const isHeavyMap = ['gct', 'overworld', 'central'].includes(currentMap);
        const timeThreshold = isHeavyMap ? 3000 : 5000;
        
        // If joystick hasn't reported activity in a while and we've interacted with the game,
        // attempt to reinitialize it
        if (elapsedTime > timeThreshold && initializationAttempts.current > 0) {
          debugLog('MobileControls', `Joystick inactive for ${elapsedTime}ms, reinitializing...`);
          
          // Reset movement first
          onMove({ x: 0, y: 0 });
          
          // Attempt to reinitialize
          initializeJoystick();
        }
      }, 1000); // Check every second
      
      // Only clean up when component is truly unmounted
      return () => {
        clearInterval(healthCheckInterval);
        cleanupJoystick();
      };
    } else if (isTorisMap) {
      // If in Toris map, ensure controls are disabled
      cleanupJoystick();
      onMove({ x: 0, y: 0 });
      onLook({ x: 0, y: 0 });
    }
    
    // No cleanup needed if not mobile
    return undefined;
  }, [isMobile, initializeJoystick, onMove, onLook, cleanupJoystick, isTorisMap]);

  // Handle reset controls event
  useEffect(() => {
    const handleResetControls = () => {
      if (isTorisMap) {
        // In Toris map, just ensure controls are disabled
        cleanupJoystick();
        onMove({ x: 0, y: 0 });
        onLook({ x: 0, y: 0 });
        return;
      }
      
      // Rest of existing reset code
      debugLog('MobileControls', 'Reset controls event received');
      
      // Reset movement
      onMove({ x: 0, y: 0 });
      onLook({ x: 0, y: 0 });
      
      // Reset refs
      touchStartRef.current = null;
      lastTouchRef.current = null;
      isLookingRef.current = false;
      hasMoveRef.current = false;
      
      // Reinitialize joystick with fresh state
      if (isMobile || window.__hasMobileControls__) {
        initializeJoystick();
      }
      
      // Make UI visible again if it was hidden
      setIsUIVisible(true);
    };
    
    window.addEventListener('reset-controls', handleResetControls);
    
    return () => {
      window.removeEventListener('reset-controls', handleResetControls);
    };
  }, [initializeJoystick, onMove, onLook, cleanupJoystick, isTorisMap]);

  // Handle interaction visibility only
  useEffect(() => {
    const handleInteractionOpen = () => {
      // Check if this is in the GCT map
      const currentMap = (window as any).currentMap || '';
      const isGCTMap = currentMap === 'gct';
      
      // If in GCT map and object info is open, it's the gallery
      if (isGCTMap && document.querySelector('[data-selected-object]')) {
        console.log('GCT Gallery opened, hiding mobile controls');
        setIsGCTGalleryOpen(true);
      }
      
      setIsUIVisible(false);
    };
    
    const handleInteractionClose = () => {
      console.log('Mobile controls: Interactable closed, restoring UI visibility');
      setIsUIVisible(true);
      setIsGCTGalleryOpen(false);
      
      // Special handling for BTR map
      const wasBTRMap = document.body.hasAttribute('data-map-open') || window.__btrMapOpen;
      if (wasBTRMap) {
        console.log('Mobile controls: BTR map was open, ensuring controls are restored');
        
        // Force visibility in the DOM
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
          containerRef.current.style.pointerEvents = 'auto';
          containerRef.current.classList.remove('hidden');
        }
        
        // Reset joystick if needed
        if (joystickError || !moveManagerRef.current) {
          initializeJoystick();
        }
      }
    };

    window.addEventListener('interactable-opened', handleInteractionOpen);
    window.addEventListener('interactable-closed', handleInteractionClose);

    return () => {
      window.removeEventListener('interactable-opened', handleInteractionOpen);
      window.removeEventListener('interactable-closed', handleInteractionClose);
    };
  }, [initializeJoystick, joystickError]);

  // Check for GCT gallery open state
  useEffect(() => {
    const checkGalleryState = () => {
      const currentMap = (window as any).currentMap || '';
      const isGCTMap = currentMap === 'gct';
      const isGalleryMap = currentMap === 'gallery';
      const isAnyGalleryOpen = document.querySelector('[data-selected-object]') !== null;
      
      if (isGCTMap && isAnyGalleryOpen) {
        setIsGCTGalleryOpen(true);
        setIsUIVisible(false);
      } else if (isGalleryMap && isAnyGalleryOpen) {
        setIsGalleryOpen(true);
        setIsUIVisible(false);
      }
    };
    
    // Explicit handlers for GCT gallery events
    const handleGCTGalleryOpened = () => {
      console.log('Mobile controls: GCT Gallery opened event received');
      setIsGCTGalleryOpen(true);
      setIsUIVisible(false);
    };
    
    const handleGCTGalleryClosed = () => {
      console.log('Mobile controls: GCT Gallery closed event received');
      // Use setTimeout to ensure we only restore controls after gallery is fully closed
      setTimeout(() => {
        setIsGCTGalleryOpen(false);
        setIsUIVisible(true);
      }, 300);
    };
    
    // Explicit handlers for Gallery events
    const handleGalleryOpened = () => {
      console.log('Mobile controls: Gallery opened event received');
      setIsGalleryOpen(true);
      setIsUIVisible(false);
    };
    
    const handleGalleryClosed = () => {
      console.log('Mobile controls: Gallery closed event received');
      // Use setTimeout to ensure we only restore controls after gallery is fully closed
      setTimeout(() => {
        setIsGalleryOpen(false);
        setIsUIVisible(true);
      }, 300);
    };
    
    // Run check on mount
    checkGalleryState();
    
    // Add event listeners for gallery states
    window.addEventListener('gct-gallery-opened', handleGCTGalleryOpened);
    window.addEventListener('gct-gallery-closed', handleGCTGalleryClosed);
    window.addEventListener('gallery-opened', handleGalleryOpened);
    window.addEventListener('gallery-closed', handleGalleryClosed);
    
    // Add event listener for object info changes
    window.addEventListener('object-info-opened', checkGalleryState);
    window.addEventListener('object-info-closed', checkGalleryState);
    
    // Set up interval to periodically check (as a fallback)
    const interval = setInterval(checkGalleryState, 1000);
    
    return () => {
      window.removeEventListener('gct-gallery-opened', handleGCTGalleryOpened);
      window.removeEventListener('gct-gallery-closed', handleGCTGalleryClosed);
      window.removeEventListener('gallery-opened', handleGalleryOpened);
      window.removeEventListener('gallery-closed', handleGalleryClosed);
      window.removeEventListener('object-info-opened', checkGalleryState);
      window.removeEventListener('object-info-closed', checkGalleryState);
      clearInterval(interval);
    };
  }, []);

  // Handle touch events for looking and interaction
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // If in Toris map, don't process touch events
    if (isTorisMap) {
      return;
    }
    
    // Only prevent default on non-iOS devices
    if (!isIOS) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Process all active touches to find one in the look area
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (!touch || !lookAreaRef.current) continue;
      
      // Ensure touch is in look area
      const rect = lookAreaRef.current.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        // Found a valid touch in the look area
        touchStartRef.current = { 
          x: touch.clientX, 
          y: touch.clientY,
          time: Date.now()
        };
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        isLookingRef.current = true;
        hasMoveRef.current = false;
        break;
      }
    }
  }, [hoveredObject, isTorisMap, isIOS]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If in Toris map or not looking, don't process movement
    if (isTorisMap || !isLookingRef.current || !touchStartRef.current || !lastTouchRef.current) {
      return;
    }
    
    // Only prevent default on non-iOS devices
    if (!isIOS) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Process look movement if we're tracking a touch
    if (lastTouchRef.current) {
      // Find the touch we're tracking
      let currentTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = lookAreaRef.current?.getBoundingClientRect();
        if (rect && touch.clientX >= rect.left && touch.clientX <= rect.right) {
          currentTouch = touch;
          break;
        }
      }
      
      if (currentTouch) {
        // Calculate total movement distance
        const deltaX = currentTouch.clientX - touchStartRef.current.x;
        const deltaY = currentTouch.clientY - touchStartRef.current.y;
        const totalMove = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If movement exceeds threshold, mark as camera movement
        if (totalMove > MOVE_THRESHOLD) {
          hasMoveRef.current = true;
        }

        // Calculate delta from last position for camera movement
        const moveDeltaX = currentTouch.clientX - lastTouchRef.current.x;
        const moveDeltaY = currentTouch.clientY - lastTouchRef.current.y;
        
        // Get current map for sensitivity adjustment - not needed for Toris as touch is disabled
        const currentMap = (window as any).currentMap || 'default';
        const isHeavyMap = ['gct'].includes(currentMap);
        
        // Use simpler sensitivity calculation for heavy maps
        const screenWidthFactor = isHeavyMap ? 1.0 : window.innerWidth / 1000;
        const baseSensitivity = isHeavyMap ? 0.1 : 0.15;
        const lookSensitivity = baseSensitivity / Math.max(0.5, screenWidthFactor);
        
        // Apply additional smoothing for heavy maps
        const smoothingFactor = isHeavyMap ? 0.8 : 1.0;
        
        // Apply camera look with sensitivity scaling
        const effectiveX = moveDeltaX * lookSensitivity * smoothingFactor;
        const effectiveY = moveDeltaY * lookSensitivity * smoothingFactor;
        
        // Provide look vector to the callback
        onLook({ x: effectiveX, y: effectiveY });
        
        // Update last touch position
        lastTouchRef.current = {
          x: currentTouch.clientX,
          y: currentTouch.clientY
        };
      }
    }
  }, [onLook, isTorisMap, isIOS]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If in Toris map, don't process touch end events
    if (isTorisMap) {
      return;
    }
    
    // Only prevent default on non-iOS devices
    if (!isIOS) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check if this was a quick tap
    if (touchStartRef.current && !hasMoveRef.current && isLookingRef.current) {
      const touchDuration = Date.now() - touchStartRef.current.time;
      if (touchDuration < TAP_THRESHOLD) {
        if (hoveredObject) {
          // If there's a highlighted object, interact with it
          window.dispatchEvent(new CustomEvent('interact-with-object'));
        } else {
          // Trigger the throw animation - can spawn should be handled by animation completion
          window.dispatchEvent(new CustomEvent('mobile-shoot'));
          // Provide haptic feedback for the throw
          if (navigator.vibrate) {
            navigator.vibrate([10, 40, 10]);
          }
        }
      }
    }

    // Only reset look state if no touches remain in the look area
    let touchesInLookArea = false;
    const rect = lookAreaRef.current?.getBoundingClientRect();
    
    if (rect) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          touchesInLookArea = true;
          // Update tracking to this touch
          touchStartRef.current = { 
            x: touch.clientX, 
            y: touch.clientY,
            time: Date.now()
          };
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          hasMoveRef.current = false;
          break;
        }
      }
    }
    
    if (!touchesInLookArea) {
      // Reset all touch state
      isLookingRef.current = false;
      touchStartRef.current = null;
      lastTouchRef.current = null;
      hasMoveRef.current = false;
      
      // Stop looking
      onLook({ x: 0, y: 0 });
    }
  }, [hoveredObject, onLook, isTorisMap, isIOS]);

  // Add CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .mobile-controls-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9000;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        transition: opacity 0.2s ease-in-out;
      }
      
      .mobile-controls-container.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      .joystick-container {
        position: absolute !important;
        width: 150px !important;
        height: 150px !important;
        background: rgba(0, 0, 0, 0.15) !important;
        border-radius: 50% !important;
        border: 2px solid rgba(255, 255, 255, 0.15) !important;
        bottom: max(30px, 10vh) !important;
        left: max(20px, 5vw) !important;
        transform: translate(0, 0) !important;
        touch-action: none !important;
        transition: opacity 0.2s ease-in-out !important;
      }
      
      .look-area {
        position: absolute !important;
        width: 60% !important;
        height: 100% !important;
        right: 0 !important;
        top: 0 !important;
        background-color: transparent;
        transition: none;
        pointer-events: auto;
        touch-action: none;
        z-index: 1;
      }
      
      /* Style nipple.js elements */
      .back {
        background: rgba(50, 50, 50, 0.2) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
      }
      
      .front {
        background: rgba(255, 255, 255, 0.7) !important;
      }
      
      /* Device-specific adjustments */
      @media (max-width: 360px) {
        .joystick-container {
          width: 120px !important;
          height: 120px !important;
          bottom: 20px !important;
          left: 15px !important;
        }
      }
      
      @media (min-width: 768px) {
        .joystick-container {
          bottom: 60px !important;
          left: 60px !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Prevent default touch actions - iOS specific handling
  useEffect(() => {
    // Only add these event listeners if we're on iOS
    if (!isIOS) return;
    
    const preventDefault = (e: TouchEvent) => {
      if (e.target instanceof HTMLElement && 
          e.target.closest('.mobile-controls-container')) {
        // For iOS, we don't prevent default to allow native behavior
        // but we still want to handle the event
      }
    };
    
    document.addEventListener('touchstart', preventDefault, { passive: true });
    document.addEventListener('touchmove', preventDefault, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('touchmove', preventDefault);
    };
  }, [isIOS]);

  // Add debug event dispatch
  const dispatchDebugUpdate = useCallback((data: any) => {
    window.dispatchEvent(new CustomEvent('mobile-controls-update', {
      detail: {
        moveX: data.moveX || 0,
        moveY: data.moveY || 0,
        lookX: data.lookX || 0,
        lookY: data.lookY || 0,
        activeMoveJoystick: data.activeMoveJoystick || false,
        activeLookJoystick: data.activeLookJoystick || false,
        joystickError: joystickError,
        timestamp: Date.now()
      }
    }));
  }, [joystickError]);

  // Update move handler to include debug
  const handleMove = useCallback((vector: { x: number; y: number } | null) => {
    if (!vector) {
      onMove({ x: 0, y: 0 });
      dispatchDebugUpdate({ moveX: 0, moveY: 0, activeMoveJoystick: false });
      return;
    }

    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude < MOVE_THRESHOLD) {
      onMove({ x: 0, y: 0 });
      dispatchDebugUpdate({ moveX: 0, moveY: 0, activeMoveJoystick: false });
      return;
    }

    const normalizedX = vector.x / magnitude;
    const normalizedY = -vector.y / magnitude;
    const adjustedMagnitude = Math.min(1, (magnitude - MOVE_THRESHOLD) / (1 - MOVE_THRESHOLD));

    const moveData = {
      x: normalizedX * adjustedMagnitude,
      y: normalizedY * adjustedMagnitude
    };

    onMove(moveData);
    dispatchDebugUpdate({ 
      moveX: moveData.x, 
      moveY: moveData.y, 
      activeMoveJoystick: true 
    });
  }, [onMove, dispatchDebugUpdate]);

  // Update look handler to include debug
  const handleLook = useCallback((vector: { x: number; y: number } | null) => {
    if (!vector) {
      onLook({ x: 0, y: 0 });
      dispatchDebugUpdate({ lookX: 0, lookY: 0, activeLookJoystick: false });
      return;
    }

    const lookData = {
      x: vector.x * MOVE_THRESHOLD,
      y: vector.y * MOVE_THRESHOLD
    };

    onLook(lookData);
    dispatchDebugUpdate({ 
      lookX: lookData.x, 
      lookY: lookData.y, 
      activeLookJoystick: true 
    });
  }, [onLook, dispatchDebugUpdate]);

  // Only render UI if we're not in Toris map
  if (isTorisMap) {
    return null; // Don't render any controls in Toris map
  }

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 pointer-events-auto touch-none select-none z-20 ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}
      style={{ 
        opacity: (isGCTGalleryOpen || !isUIVisible) ? 0 : 1,
        pointerEvents: (isGCTGalleryOpen || !isUIVisible) ? 'none' : 'auto'
      }}
    >
      {/* Movement joystick */}
      <div ref={moveJoystickRef} className="joystick-container" />
      
      {/* Look area (COD style) */}
      <div 
        ref={lookAreaRef} 
        className="look-area"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
};

export default MobileControls; 