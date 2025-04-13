import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export default function Ramp() {
  // Correct coordinates for the return point in Toris.glb, lowered by 4 units
  const startPoint = new THREE.Vector3(-193, -243, 64);    // Return point position lowered
  const endPoint = new THREE.Vector3(-218, -249, 90);      // Target destination lowered
  
  // Set number of steps
  const totalSteps = 80;
  
  // Convert 30 degrees to radians
  const rotationAngle = THREE.MathUtils.degToRad(35);
  
  return (
    <>
      {Array.from({ length: totalSteps }).map((_, i) => {
        // Calculate interpolation factor
        const t = i / (totalSteps - 0.3);
        
        // Interpolate position between start and end points
        const x = startPoint.x + (endPoint.x - startPoint.x) * t;
        const y = startPoint.y + (endPoint.y - startPoint.y) * t;
        const z = startPoint.z + (endPoint.z - startPoint.z) * t;
        
        // Calculate height for each column - slightly varying heights for visual interest
        const columnHeight = 8.9 + Math.sin(i * 9.2) * 0.004; // Reduced height variation for more consistent steps
        
        return (
          <RigidBody
            key={i}
            type="fixed"
            position={[x, y + columnHeight/2, z]}
            rotation={[0, rotationAngle, 0]} // Added 30-degree rotation around Y axis
          >
            <mesh>
              <boxGeometry args={[9, columnHeight, 4]} />
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
      })}
    </>
  );
} 