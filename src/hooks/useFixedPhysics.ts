import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { detectBrowser, getMovementConfig } from '../lib/browserDetection';
import { useFixedTimeStep } from './useFixedTimeStep';

interface PhysicsState {
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  grounded: boolean;
}

export interface FixedPhysicsProps {
  onPositionChange?: (position: { x: number; y: number; z: number }) => void;
  onVelocityChange?: (velocity: { x: number; y: number; z: number }) => void;
  onGroundedChange?: (grounded: boolean) => void;
}

/**
 * Hook that provides fixed physics updates with device-specific optimizations
 */
export function useFixedPhysics() {
  // Get device info and configuration
  const deviceInfo = useRef(detectBrowser());
  const config = useRef(getMovementConfig(deviceInfo.current));

  // Store the current physics state
  const physicsState = useRef({
    lastTime: 0,
    accumulator: 0
  });

  useEffect(() => {
    let rafId: number;
    const fixedTimeStep = config.current.fixedTimeStep;

    const updatePhysics = (time: number) => {
      if (physicsState.current.lastTime === 0) {
        physicsState.current.lastTime = time;
      }

      const deltaTime = (time - physicsState.current.lastTime) / 1000;
      physicsState.current.lastTime = time;

      // Accumulate time and update in fixed steps
      physicsState.current.accumulator += deltaTime;

      while (physicsState.current.accumulator >= fixedTimeStep) {
        // Update physics here
        physicsState.current.accumulator -= fixedTimeStep;
      }

      rafId = requestAnimationFrame(updatePhysics);
    };

    rafId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return {
    deviceInfo: deviceInfo.current,
    config: config.current
  };
} 