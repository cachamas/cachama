import { RigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

export default function Staircase() {
  return (
    <>
      {/* Black staircase - specific start and end points */}
      {Array.from({ length: 59 }).map((_, i) => {
        // Calculate interpolation factor
        const t = i / 11; // 11 is length-1 for smooth interpolation
        return (
          <RigidBody
            key={i}
            type="fixed"
            position={[
              -66.5 + (13 * t), // Interpolate X from -68 to -55
              37.5 - (4 * t),   // Interpolate Y from 38 to 34
              -0 + (t),       // Interpolate Z from -2 to -1
            ]}
          >
            <Box args={[3, 0.9, 18]}>  {/* Wider black stairs */}
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
            </Box>
          </RigidBody>
        );
      })}

      {/* Red staircase - much wider and slightly lower */}
      {Array.from({ length: 12 }).map((_, i) => (
        <RigidBody
          key={`red-${i}`}
          type="fixed"
          position={[
            -60 + (i * 1.33),
            -2.2 + (i * 0.33), // Lowered by 0.2 units
            -2
          ]}
        >
          <Box args={[4, 0.2, 26]}>  {/* Much wider and deeper red stairs */}
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
          </Box>
        </RigidBody>
      ))}
    </>
  );
} 