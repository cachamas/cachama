import { useRef, useCallback } from 'react';
import { detectBrowser, getMovementConfig } from '../lib/browserDetection';

export interface OptimizedMobileControlsState {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  jump: boolean;
  shoot: boolean;
  isMobile: boolean;
  activeJoysticks: {
    move: boolean;
    look: boolean;
  };
}

/**
 * Hook that provides optimized mobile controls with consistent behavior
 */
export function useOptimizedMobileControls() {
  // Get device info and configuration
  const deviceInfoRef = useRef(detectBrowser());
  const configRef = useRef(getMovementConfig(deviceInfoRef.current));

  // Store the current control state
  const controlsRef = useRef<OptimizedMobileControlsState>({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    shoot: false,
    isMobile: deviceInfoRef.current.isMobile,
    activeJoysticks: {
      move: false,
      look: false
    }
  });

  // Movement handlers with input smoothing
  const handleMove = useCallback((vector: { x: number; y: number }) => {
    const smoothingFactor = deviceInfoRef.current.isMobile ? 
      configRef.current.inputSmoothing : 0.1;

    controlsRef.current.moveX = vector.x;
    controlsRef.current.moveY = vector.y;
    controlsRef.current.activeJoysticks.move = Math.abs(vector.x) > 0.01 || Math.abs(vector.y) > 0.01;
  }, []);

  const handleLook = useCallback((vector: { x: number; y: number }) => {
    controlsRef.current.lookX = vector.x;
    controlsRef.current.lookY = vector.y;
    controlsRef.current.activeJoysticks.look = Math.abs(vector.x) > 0.01 || Math.abs(vector.y) > 0.01;
  }, []);

  const handleJump = useCallback(() => {
    controlsRef.current.jump = true;
    setTimeout(() => {
      controlsRef.current.jump = false;
    }, 100);
  }, []);

  const handleShoot = useCallback(() => {
    controlsRef.current.shoot = true;
    setTimeout(() => {
      controlsRef.current.shoot = false;
    }, 100);
  }, []);

  return {
    controls: controlsRef.current,
    handlers: {
      handleMove,
      handleLook,
      handleJump,
      handleShoot
    },
    deviceInfo: deviceInfoRef.current,
    config: configRef.current
  };
} 