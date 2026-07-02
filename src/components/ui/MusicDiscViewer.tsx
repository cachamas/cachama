import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { isMobileDevice } from '../../lib/utils';

interface RotatingVinylProps {
  vinylId: string;
}

function RotatingVinyl({ vinylId }: RotatingVinylProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);
  const isMobile = isMobileDevice();

  // Set initial rotation
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.PI;
    }
  }, []);

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    
    // Load front texture
    textureLoader.load(`/images/vinyl/${vinylId}front.webp`, (texture) => {
      texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.needsUpdate = true;
      setFrontTexture(texture);
    });
    
    // Load back texture
    textureLoader.load(`/images/vinyl/${vinylId}back.webp`, (texture) => {
      texture.flipY = false;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.y = -1;
      texture.needsUpdate = true;
      setBackTexture(texture);
    });
  }, [vinylId]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = -Math.PI / 2;
      meshRef.current.rotation.y = 0.18;
      meshRef.current.rotation.z += delta * 0.30;
    }
  });

  // Prepare materials for each face
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.7 });
  const materials = [
    edgeMaterial, // right
    edgeMaterial, // left
    new THREE.MeshStandardMaterial({ map: frontTexture, side: THREE.FrontSide, transparent: true }), // top (front)
    new THREE.MeshStandardMaterial({ map: backTexture, side: THREE.FrontSide, transparent: true }), // bottom (back)
    edgeMaterial, // front
    edgeMaterial  // back
  ];

  // Mobile: 15% smaller, 20% higher
  const meshScale: [number, number, number] = isMobile ? [0.95, 0.95, 0.95] : [1, 1, 1];
  const meshPosition: [number, number, number] = isMobile ? [0, 0.2, 0] : [0, 0, 0];

  return (
    <mesh ref={meshRef} scale={meshScale} position={meshPosition}>
      <boxGeometry args={[1.15, 0.05, 1]} />
      {materials.map((mat, i) => (
        <primitive attach={`material-${i}`} object={mat} key={i} />
      ))}
    </mesh>
  );
}

function Lighting() {
  return (
    <>
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <directionalLight position={[0, -5, -5]} intensity={0.3} />
      <ambientLight intensity={0.5} />
      <hemisphereLight color={0xffffff} groundColor={0x444444} intensity={0.3} />
    </>
  );
}

function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  return null;
}

interface MusicDiscViewerProps {
  vinylId: string;
}

export default function MusicDiscViewer({ vinylId }: MusicDiscViewerProps) {
  return (
    <div className="w-full h-[50vh]">
      <Canvas
        camera={{ 
          fov: 40,
          near: 0.1,
          far: 1000,
          position: [0, 0, 3]
        }}
        style={{ background: 'transparent' }}
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true
        }}
      >
        <Lighting />
        <RotatingVinyl vinylId={vinylId} />
        <CameraController />
      </Canvas>
    </div>
  );
} 