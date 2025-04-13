import { useRef, useCallback } from 'react';
import type { RigidBody } from '@dimforge/rapier3d-compat';

type PhysicsRefs = {
  [key: number]: RigidBody;
};

export function usePhysicsRefs() {
  const physicsRefs = useRef<PhysicsRefs>({});

  const registerPhysicsBody = useCallback((handle: number, body: RigidBody) => {
    physicsRefs.current[handle] = body;
  }, []);

  const unregisterPhysicsBody = useCallback((handle: number) => {
    delete physicsRefs.current[handle];
  }, []);

  return {
    physicsRefs,
    registerPhysicsBody,
    unregisterPhysicsBody
  };
} 