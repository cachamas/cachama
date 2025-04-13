import { useRef, useCallback } from 'react';

interface InputState {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
}

interface SmoothedInput {
  current: InputState;
  update: (x: number, y: number) => void;
  reset: () => void;
}

/**
 * Hook that provides input smoothing for consistent control feel
 * across different devices and browsers
 */
export function useInputSmoothing(
  smoothingFactor = 0.4, 
  threshold = 0.01,
  deadzone = 0.05
): SmoothedInput {
  // Use a ref to avoid re-renders when updating input values
  const inputState = useRef<InputState>({
    x: 0,
    y: 0,
    rawX: 0,
    rawY: 0
  });

  // Update the input with smoothing
  const update = useCallback((newX: number, newY: number) => {
    // Store raw values
    inputState.current.rawX = newX;
    inputState.current.rawY = newY;
    
    // CRITICAL FIX: More aggressive deadzone handling to prevent tiny movements
    // causing unwanted input leaking between joysticks
    const magnitude = Math.sqrt(newX * newX + newY * newY);
    
    if (magnitude < deadzone) {
      // If input is below deadzone, explicitly set to zero
      // This prevents lingering small values from affecting other controls
      newX = 0;
      newY = 0;
      
      // If values are very close to zero, explicitly reset them to zero
      // to prevent value persistence issues
      if (Math.abs(inputState.current.x) < 0.01) inputState.current.x = 0;
      if (Math.abs(inputState.current.y) < 0.01) inputState.current.y = 0;
      
      // If we're in the deadzone and current values are near zero, exit early
      if (Math.abs(inputState.current.x) < 0.01 && Math.abs(inputState.current.y) < 0.01) {
        return;
      }
    } else {
      // Scale values after deadzone
      const scale = (magnitude - deadzone) / (1 - deadzone);
      newX = (newX / magnitude) * scale;
      newY = (newY / magnitude) * scale;
    }
    
    // Only update if the change is above threshold or values are zero (for explicit resets)
    const isChangingToZero = newX === 0 && newY === 0 && (inputState.current.x !== 0 || inputState.current.y !== 0);
    if (!isChangingToZero && 
        Math.abs(inputState.current.x - newX) < threshold && 
        Math.abs(inputState.current.y - newY) < threshold) {
      return;
    }
    
    // Apply smoothing for gradual changes, but use direct values when zeroing
    if (newX === 0 && newY === 0) {
      // Apply faster reduction when zeroing out
      inputState.current.x *= (1 - smoothingFactor * 2);
      inputState.current.y *= (1 - smoothingFactor * 2);
      
      // Cut off small values to ensure we reach zero
      if (Math.abs(inputState.current.x) < 0.05) inputState.current.x = 0;
      if (Math.abs(inputState.current.y) < 0.05) inputState.current.y = 0;
    } else {
      // Normal smoothing for regular movement
      inputState.current.x = inputState.current.x * (1 - smoothingFactor) + newX * smoothingFactor;
      inputState.current.y = inputState.current.y * (1 - smoothingFactor) + newY * smoothingFactor;
    }
    
    // Handle extremely small values that can lead to floating point issues
    if (Math.abs(inputState.current.x) < 0.001) inputState.current.x = 0;
    if (Math.abs(inputState.current.y) < 0.001) inputState.current.y = 0;
  }, [smoothingFactor, threshold, deadzone]);

  // Reset the input state
  const reset = useCallback(() => {
    inputState.current = {
      x: 0,
      y: 0,
      rawX: 0,
      rawY: 0
    };
  }, []);

  return {
    current: inputState.current,
    update,
    reset
  };
} 