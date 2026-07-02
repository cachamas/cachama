import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../lib/gameStore';
import { useGLTF } from '@react-three/drei';

interface ProjectileProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  damage?: number;
  onHit?: () => void;
}

interface RigidBodyUserData {
  type?: string;
  id?: string;
  health?: number;
}

const PROJECTILE_SPEED = 30;
const PROJECTILE_LIFETIME = 2; // seconds
const DEFAULT_DAMAGE = 20;
const CONCUSSION_DURATION = 800; // Keep duration
const CONCUSSION_INTENSITY = 6.0; // Increased from 4.0 to 6.0
const WOBBLE_SPEED = { x: 0.15, y: 0.12 }; // Faster wobble
const BASE_WOBBLE = 0.3; // Increased base wobble
const CAN_SCALE = 3.24; // 20% bigger cans (2.7 * 1.2)

export function EnemyProjectile({ 
  position, 
  direction, 
  speed = PROJECTILE_SPEED,
  damage = DEFAULT_DAMAGE,
  onHit 
}: ProjectileProps) {
  const rigidBodyRef = useRef<any>(null);
  const canRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const takeDamage = useGameStore(state => state.takeDamage);
  const { scene: canModel } = useGLTF('/models/can.glb');
  
  // Set initial velocity and rotation
  useEffect(() => {
    if (rigidBodyRef.current) {
      const velocity = direction.multiplyScalar(speed);
      rigidBodyRef.current.setLinvel({ 
        x: velocity.x, 
        y: velocity.y, 
        z: velocity.z 
      });
      
      // Add random spin
      rigidBodyRef.current.setAngvel({
        x: Math.random() * 15 - 7.5,
        y: Math.random() * 15 - 7.5,
        z: Math.random() * 15 - 7.5
      });
    }
  }, [direction, speed]);

  useFrame(() => {
    // Check lifetime
    if (Date.now() - startTime.current > PROJECTILE_LIFETIME * 1000) {
      onHit?.();
    }
  });

  // Function to apply concussion effect
  const applyConcussionEffect = () => {
    const startTime = Date.now();
    let animationFrame: number;

    console.log('🎯 Applying concussion effect...');
    
    // Dispatch player-hit event immediately
    window.dispatchEvent(new CustomEvent('player-hit', {
      detail: { duration: CONCUSSION_DURATION }
    }));
    console.log('🎯 Dispatched player-hit event');

    const updateConcussion = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / CONCUSSION_DURATION;

      if (progress < 1) {
        // More dramatic wobble effect
        const intensity = CONCUSSION_INTENSITY * (1 - Math.pow(progress, 0.2)); // Even slower falloff
        const baseWobble = BASE_WOBBLE * (1 - Math.pow(progress, 0.3));
        
        // Combine multiple frequencies for more chaotic motion
        const wobbleX = (
          baseWobble + 
          Math.sin(elapsed * WOBBLE_SPEED.x) * 0.7 +
          Math.sin(elapsed * WOBBLE_SPEED.x * 2.1) * 0.3
        ) * intensity;
        
        const wobbleY = (
          baseWobble + 
          Math.cos(elapsed * WOBBLE_SPEED.y) * 0.7 +
          Math.cos(elapsed * WOBBLE_SPEED.y * 1.8) * 0.3
        ) * intensity;
        
        window.dispatchEvent(new CustomEvent('concussion-update', {
          detail: {
            rotationX: wobbleX,
            rotationY: wobbleY
          }
        }));

        animationFrame = requestAnimationFrame(updateConcussion);
      } else {
        // Reset effect
        window.dispatchEvent(new CustomEvent('concussion-update', {
          detail: {
            rotationX: 0,
            rotationY: 0
          }
        }));
        console.log('🎯 Concussion effect complete');
      }
    };

    // Start the effect immediately
    updateConcussion();
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[position.x, position.y, position.z]}
      type="dynamic"
      colliders={false}
      mass={1}
      friction={0.7}
      restitution={0.3}
      linearDamping={0.2}
      angularDamping={0.2}
      onCollisionEnter={(e) => {
        const userData = e.other.rigidBody?.userData as RigidBodyUserData;
        if (userData?.type === 'player') {
          console.log('🎯 Hit player! Applying damage and concussion effect');
          
          // Apply damage first
          takeDamage(damage);
          
          // Always apply concussion effect
          const cleanup = applyConcussionEffect();
          
          // Remove projectile
          onHit?.();
          
          // Ensure effect is cleaned up
          setTimeout(() => {
            cleanup();
          }, CONCUSSION_DURATION);
        }
      }}
    >
      <CuboidCollider args={[0.7, 1.1, 0.7]} sensor={false} />
      <group ref={canRef} scale={CAN_SCALE}>
        <primitive object={canModel.clone()} />
      </group>
    </RigidBody>
  );
} 