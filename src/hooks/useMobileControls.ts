import { useState, useEffect, useCallback, useRef } from 'react';

export interface MobileControlsState {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  isMobile: boolean;
  activeMoveJoystick: boolean;
  activeLookJoystick: boolean;
}

const DEFAULT_STATE: MobileControlsState = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  isMobile: false,
  activeMoveJoystick: false,
  activeLookJoystick: false
};

// Constants for control smoothing
const MOVEMENT_SMOOTHING = 0.10; // Reduced for more responsive movement
const LOOK_SMOOTHING = 0.12; // Reduced for more responsive camera
const MOVEMENT_DEADZONE = 0.05; // Reduced for better small movement detection
const LOOK_SENSITIVITY = 0.075; // Adjusted for better control

// Add map-specific sensitivity adjustments
const MAP_SENSITIVITY = {
    toris: {
        movement: 0.8,
        look: 0.85
    },
    gct: {
        movement: 0.85,
        look: 0.9
    },
    default: {
        movement: 1.0,
        look: 1.0
    }
};

// Smoothing function with map-specific adjustments and performance awareness
const smoothValue = (current: number, target: number, smoothing: number, mapName: string = 'default'): number => {
    // Get map sensitivity or default if not found
    const mapSettings = MAP_SENSITIVITY[mapName as keyof typeof MAP_SENSITIVITY] || MAP_SENSITIVITY.default;
    const sensitivity = mapSettings.movement;
    
    // Use less smoothing for heavy maps to reduce computations
    const isHeavyMap = mapName === 'gct' || mapName === 'toris';
    const effectiveSmoothing = isHeavyMap ? smoothing * 0.75 : smoothing;
    
    // Apply smoothing with sensitivity
    return current + ((target * sensitivity) - current) * effectiveSmoothing;
};

// Constants for control resilience
const CONTROL_RECOVERY = {
  CHECK_INTERVAL: 1000, // Check every second
  INACTIVE_THRESHOLD: 3000, // Consider inactive after 3 seconds
  RECOVERY_ATTEMPTS: 3, // Max recovery attempts
  HEAVY_MAPS: ['gct', 'toris', 'overworld', 'central']
};

export function useMobileControls() {
  const [controls, setControls] = useState<MobileControlsState>(DEFAULT_STATE);
  
  // Refs for smooth interpolation
  const currentMove = useRef({ x: 0, y: 0 });
  const currentLook = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number>();
  
  // Refs for control resilience
  const lastActivityTime = useRef<number>(Date.now());
  const recoveryAttempts = useRef<number>(0);
  const controlsActive = useRef<boolean>(true);

  // Animation loop with performance optimizations
  interface UpdateLoopFunction {
    (): void;
    lastUpdate: number;
  }

  const updateLoop = useCallback(() => {
    // Only update if we haven't updated in the last 16ms (target 60fps)
    // This prevents multiple updates per frame when device is struggling
    const now = performance.now();
    const lastUpdate = updateLoop.lastUpdate || 0;
    
    if (now - lastUpdate >= 16) {
      updateLoop.lastUpdate = now;
      
      setControls(prev => {
        // Get current map name from window or default
        const mapName = (window as any).currentMap || 'default';
        
        // Smooth movement values with map sensitivity
        const newMoveX = smoothValue(prev.moveX, currentMove.current.x, MOVEMENT_SMOOTHING, mapName);
        const newMoveY = smoothValue(prev.moveY, currentMove.current.y, MOVEMENT_SMOOTHING, mapName);
        
        // Get map-specific look sensitivity
        const mapSettings = MAP_SENSITIVITY[mapName as keyof typeof MAP_SENSITIVITY] || MAP_SENSITIVITY.default;
        const lookSensitivity = mapSettings.look;
        
        // Apply look sensitivity directly (less smoothing for better responsiveness)
        const newLookX = currentLook.current.x * lookSensitivity;
        const newLookY = currentLook.current.y * lookSensitivity;

        // Only update if there's significant change (reduces state updates)
        const hasSignificantMovement = 
            Math.abs(newMoveX - prev.moveX) > 0.001 || 
            Math.abs(newMoveY - prev.moveY) > 0.001 ||
            Math.abs(newLookX - prev.lookX) > 0.001 ||
            Math.abs(newLookY - prev.lookY) > 0.001;

        // Update last activity time when there's movement
        if (prev.activeMoveJoystick || prev.activeLookJoystick) {
          lastActivityTime.current = Date.now();
          controlsActive.current = true;
        }

        if (!hasSignificantMovement) return prev;

        return {
          ...prev,
          moveX: newMoveX,
          moveY: newMoveY,
          lookX: newLookX,
          lookY: newLookY,
        };
      });
    }

    // Use setTimeout instead of requestAnimationFrame for more reliable timing
    // under heavy load conditions
    animationFrame.current = window.setTimeout(() => {
      requestAnimationFrame(updateLoop);
    }, 16); // Target 60fps
  }, []) as UpdateLoopFunction;
  
  updateLoop.lastUpdate = 0;

  // Setup animation loop with better cleanup
  useEffect(() => {
    // Start the update loop
    animationFrame.current = window.setTimeout(() => {
      requestAnimationFrame(updateLoop);
    }, 16);
    
    // Make sure to clean up properly
    return () => {
      if (animationFrame.current) {
        window.clearTimeout(animationFrame.current);
      }
    };
  }, [updateLoop]);

  // Detect mobile device on mount
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      // Prevent gestures that might interfere with controls
      document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
      document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    }
    
    setControls(prev => ({
      ...prev,
      isMobile: isMobileDevice
    }));
  }, []);
  
  // Setup control recovery monitor
  useEffect(() => {
    if (!controls.isMobile) return;
    
    // Monitor for control inactivity and recover if needed
    const recoveryInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityTime.current;
      const mapName = (window as any).currentMap || '';
      const isHeavyMap = CONTROL_RECOVERY.HEAVY_MAPS.includes(mapName);
      
      // Only attempt recovery if controls were active but now aren't responding
      if (controlsActive.current && inactiveTime > CONTROL_RECOVERY.INACTIVE_THRESHOLD) {
        console.log(`Mobile controls inactive for ${inactiveTime}ms, attempting recovery`);
        
        // Attempt recovery by resetting controls
        window.dispatchEvent(new CustomEvent('reset-controls'));
        recoveryAttempts.current++;
        controlsActive.current = false;
        
        // Reset inputs explicitly
        currentMove.current = { x: 0, y: 0 };
        currentLook.current = { x: 0, y: 0 };
        setControls(prev => ({
          ...prev,
          moveX: 0,
          moveY: 0,
          lookX: 0,
          lookY: 0,
          activeMoveJoystick: false,
          activeLookJoystick: false
        }));
      }
    }, CONTROL_RECOVERY.CHECK_INTERVAL);
    
    return () => {
      clearInterval(recoveryInterval);
    };
  }, [controls.isMobile]);
  
  // Add map change listener for control reset
  useEffect(() => {
    const handleMapChange = () => {
      // Reset movement state
      currentMove.current = { x: 0, y: 0 };
      currentLook.current = { x: 0, y: 0 };
      
      // Reset control state
      setControls(prev => ({
        ...prev,
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0,
        activeMoveJoystick: false,
        activeLookJoystick: false
      }));
      
      // Reset tracking vars
      recoveryAttempts.current = 0;
      lastActivityTime.current = Date.now();
      controlsActive.current = true;
    };
    
    window.addEventListener('map-change', handleMapChange);
    window.addEventListener('reset-controls', handleMapChange);
    
    return () => {
      window.removeEventListener('map-change', handleMapChange);
      window.removeEventListener('reset-controls', handleMapChange);
    };
  }, []);

  // Handler for movement input
  const handleMove = useCallback((vector: { x: number; y: number } | null) => {
    lastActivityTime.current = Date.now();
    controlsActive.current = true;
    
    if (!vector) {
      currentMove.current = { x: 0, y: 0 };
      setControls(prev => ({ ...prev, activeMoveJoystick: false }));
      return;
    }

    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude < MOVEMENT_DEADZONE) {
      currentMove.current = { x: 0, y: 0 };
      setControls(prev => ({ ...prev, activeMoveJoystick: false }));
      return;
    }

    // Normalize and apply deadzone
    const normalizedX = vector.x / magnitude;
    const normalizedY = -vector.y / magnitude; // Invert Y for expected movement
    const adjustedMagnitude = Math.min(1, (magnitude - MOVEMENT_DEADZONE) / (1 - MOVEMENT_DEADZONE));

    currentMove.current = {
      x: normalizedX * adjustedMagnitude,
      y: normalizedY * adjustedMagnitude
    };

    setControls(prev => ({ ...prev, activeMoveJoystick: true }));
  }, []);

  // Handler for look input
  const handleLook = useCallback((vector: { x: number; y: number } | null) => {
    lastActivityTime.current = Date.now();
    controlsActive.current = true;
    
    if (!vector) {
      currentLook.current = { x: 0, y: 0 };
      setControls(prev => ({ ...prev, activeLookJoystick: false }));
      return;
    }

    currentLook.current = {
      x: vector.x * LOOK_SENSITIVITY,
      y: vector.y * LOOK_SENSITIVITY
    };

    const hasLookMovement = Math.abs(vector.x) > 0.001 || Math.abs(vector.y) > 0.001;
    setControls(prev => ({
      ...prev,
      activeLookJoystick: hasLookMovement
    }));
  }, []);
  
  return {
    controls,
    handlers: {
      handleMove,
      handleLook
    }
  };
}

// Utility function to reset mobile controls from anywhere
export function resetMobileControls() {
  window.dispatchEvent(new CustomEvent('reset-controls'));
} 