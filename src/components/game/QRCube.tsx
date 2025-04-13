import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMapStore } from './World';

interface QRCubeProps {
  position: [number, number, number];
}

export default function QRCube({ position }: QRCubeProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const rigidBodyRef = useRef<any>(null);
  const { currentMap } = useMapStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/images/qr.webp', (loadedTexture) => {
      loadedTexture.flipY = false;
      if (materialRef.current) {
        materialRef.current.map = loadedTexture;
        materialRef.current.emissive.setRGB(0.6, 0.6, 0.6);
        materialRef.current.emissiveMap = loadedTexture;
        materialRef.current.needsUpdate = true;
      }
    });
    
    // Mark as initialized after a short delay to ensure physics is properly applied
    const timer = setTimeout(() => setIsInitialized(true), 500); // Increased delay for better physics stability
    return () => clearTimeout(timer);
  }, []);

  // Apply initial impulse to make cubes move
  useEffect(() => {
    if (isInitialized && rigidBodyRef.current) {
      // Apply a more significant random impulse to make cubes move in central map
      if (currentMap === 'central') {
        const randomX = (Math.random() - 0.5) * 4; // Increased impulse strength
        const randomZ = (Math.random() - 0.5) * 4;
        rigidBodyRef.current.applyImpulse({
          x: randomX,
          y: 3, // Stronger upward impulse
          z: randomZ
        }, true);
        
        // Add some torque for rotation
        rigidBodyRef.current.applyTorqueImpulse({
          x: (Math.random() - 0.5) * 1,
          y: (Math.random() - 0.5) * 1,
          z: (Math.random() - 0.5) * 1
        }, true);
      }
    }
  }, [isInitialized, currentMap]);

  // Make sure cubes are actually affected by physics
  useFrame(() => {
    if (rigidBodyRef.current && currentMap === 'central' && isInitialized) {
      // If cube somehow gets stuck, add a small impulse (check more frequently)
      if (Math.random() < 0.02) { // Increased chance of unsticking check
        const vel = rigidBodyRef.current.linvel();
        const isStuck = Math.abs(vel.x) < 0.1 && Math.abs(vel.y) < 0.1 && Math.abs(vel.z) < 0.1;
        
        if (isStuck) {
          const randomX = (Math.random() - 0.5) * 5;
          const randomZ = (Math.random() - 0.5) * 5;
          rigidBodyRef.current.applyImpulse({
            x: randomX,
            y: 4,
            z: randomZ
          }, true);
        }
      }
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef}
      type="dynamic" 
      colliders="cuboid" 
      position={position}
      restitution={0.8} // Increased bounciness
      friction={0.2}
      linearDamping={0.05} // Reduced damping to allow more movement
      angularDamping={0.05}
    >
      <mesh name="qr_cube">
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          ref={materialRef}
          color={0xffffff}
        />
      </mesh>
    </RigidBody>
  );
} 