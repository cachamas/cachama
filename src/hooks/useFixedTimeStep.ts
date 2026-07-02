import { useRef, useEffect } from 'react';

interface TimeState {
  fixedDelta: number;
  accumulator: number;
  lastTime: number;
  frameTime: number;
  alpha: number;
  step: () => boolean;
  updateAccumulator: (currentTime: number) => void;
  resetAccumulator: () => void;
}

/**
 * Hook that implements fixed time step for physics calculations
 * ensuring consistent movement regardless of frame rate
 */
export function useFixedTimeStep(fixedDelta = 1/60): TimeState {
  // Store time state in a ref to avoid triggering re-renders
  const timeState = useRef<TimeState>({
    fixedDelta,
    accumulator: 0,
    lastTime: 0,
    frameTime: 0,
    alpha: 0,
    step: () => false,
    updateAccumulator: () => {},
    resetAccumulator: () => {}
  });

  // Initialize on first render
  useEffect(() => {
    // Update the step function
    timeState.current.step = () => {
      // Check if enough time has accumulated for a fixed step
      if (timeState.current.accumulator >= timeState.current.fixedDelta) {
        timeState.current.accumulator -= timeState.current.fixedDelta;
        timeState.current.alpha = timeState.current.accumulator / timeState.current.fixedDelta;
        return true;
      }
      return false;
    };

    // Update accumulator with the new frame time
    timeState.current.updateAccumulator = (currentTime: number) => {
      if (timeState.current.lastTime === 0) {
        timeState.current.lastTime = currentTime;
        return;
      }

      // Calculate actual frame time
      timeState.current.frameTime = (currentTime - timeState.current.lastTime) / 1000;
      
      // Cap the maximum frame time to prevent "spiral of death" on slow devices
      const maxFrameTime = 0.1; // 100ms maximum
      timeState.current.frameTime = Math.min(timeState.current.frameTime, maxFrameTime);
      
      // Update accumulator and last time
      timeState.current.accumulator += timeState.current.frameTime;
      timeState.current.lastTime = currentTime;
    };

    // Reset the accumulator when needed (e.g., on tab focus)
    timeState.current.resetAccumulator = () => {
      timeState.current.accumulator = 0;
      timeState.current.lastTime = 0;
    };
  }, [fixedDelta]);

  return timeState.current;
} 