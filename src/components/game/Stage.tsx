import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export default function Stage() {
  // Center point calculated from the given coordinates
  const centerX = -221; // Average of furthest X points (-241 and -201)
  const centerZ = 90;   // Average of furthest Z points (118 and 62)
  
  return (
    <RigidBody
      type="fixed"
      position={[centerX, -240.5, centerZ]} // Lowered by 1 unit
    >
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[37.5, 37.5, 1, 64]} /> {/* Increased radius by 25% (from 30 to 37.5) */}
        <meshStandardMaterial 
          color={0xff0000}
          roughness={0.3}
          metalness={0.2}
          emissive={0xff0000}
          emissiveIntensity={0.2}
        />
      </mesh>
    </RigidBody>
  );
} 