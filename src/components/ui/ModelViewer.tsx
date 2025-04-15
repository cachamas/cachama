import { useRef, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  modelPath: string;
  onLoaded: () => void;
}

function Model({ modelPath, onLoaded }: ModelProps) {
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef<THREE.Group>();
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Auto-rotate the model
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5;
    }
  });

  // Call onLoaded when the model is loaded
  useEffect(() => {
    if (scene) {
      onLoaded();
    }
  }, [scene, onLoaded]);

  const resetPosition = useCallback(() => {
    if (modelRef.current) {
      // Reset rotation and position first
      modelRef.current.rotation.set(0, 0, 0);
      modelRef.current.position.set(0, 0, 0);
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Calculate gradual x-offset based on viewport width
      const minWidth = 1000;
      const maxWidth = 1600;
      const maxOffset = 0;
      
      let xOffset = 0;
      if (viewportWidth > minWidth) {
        // Calculate percentage between minWidth and maxWidth
        const percentage = Math.min((viewportWidth - minWidth) / (maxWidth - minWidth), 1);
        xOffset = -maxOffset * percentage;
      }

      // Set position with viewport-based adjustment
      modelRef.current.position.x = -center.x + xOffset;
      modelRef.current.position.y = -center.y + (size.y * 0.28);
      modelRef.current.position.z = -center.z;

      // Set consistent rotation
      modelRef.current.rotation.x = -Math.PI / 12;
      
      // Update matrices
      modelRef.current.updateMatrix();
      modelRef.current.updateMatrixWorld();
    }
  }, [viewportWidth]);

  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset position whenever the model changes or viewport width changes
  useEffect(() => {
    resetPosition();
  }, [modelPath, resetPosition, viewportWidth]);

  return <primitive ref={modelRef} object={scene} />;
}

function Lighting() {
  return (
    <>
      {/* Key light */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={2} 
      />
      {/* Fill light */}
      <directionalLight 
        position={[-5, 5, -5]} 
        intensity={1.5}
      />
      {/* Rim light */}
      <directionalLight 
        position={[0, -5, -5]} 
        intensity={1}
      />
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={1} />
      {/* Hemisphere light for better PBR rendering */}
      <hemisphereLight 
        color={0xffffff}
        groundColor={0x444444}
        intensity={1}
      />
    </>
  );
}

function CameraController() {
  const { camera, scene } = useThree();
  
  const updateCamera = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      console.warn('Camera is not a PerspectiveCamera');
      return;
    }

    // Create a bounding box for the entire scene
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate distance needed to fit the model
    const fov = camera.fov * (Math.PI / 180);
    const maxDimension = Math.max(size.x, size.y, size.z);
    const distance = (maxDimension * 1.5) / (2 * Math.tan(fov / 2));

    // Position camera
    camera.position.set(
      0,                // X position (centered)
      size.y * 0.05,    // Changed from 0.1 to 0.05 to move up
      distance         // Z position (back enough to see full model)
    );

    // Look at the center of the model
    camera.lookAt(new THREE.Vector3(0, size.y * 0.05, 0)); // Changed from 0.1 to 0.05 to move up
    camera.updateProjectionMatrix();
  }, [camera, scene]);

  // Update camera when scene changes
  useEffect(() => {
    updateCamera();
  }, [updateCamera]);

  // Update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateCamera);
    return () => window.removeEventListener('resize', updateCamera);
  }, [updateCamera]);

  return null;
}

interface ModelViewerProps {
  modelPath: string;
}

export default function ModelViewer({ modelPath }: ModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleModelLoaded = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className="w-full h-[80vh] bg-transparent relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-4xl font-['ByteBounce'] text-white animate-pulse">
            LOADING...
          </div>
        </div>
      )}
      <Canvas
        camera={{ 
          fov: 40,
          near: 0.1,
          far: 1000,
          position: [0, 0, 5]
        }}
        style={{ background: 'transparent' }}
      >
        <Lighting />
        <Model modelPath={modelPath} onLoaded={handleModelLoaded} />
        <CameraController />
      </Canvas>
    </div>
  );
} 