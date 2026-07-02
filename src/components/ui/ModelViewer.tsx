import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Set up DRACO decoder path
useGLTF.setDecoderPath('/draco/');

// Create a shared scene for all models
const sharedScene = new THREE.Scene();

// Preload common models
const preloadModels = () => {
  const models = ['/models/TOYOBOBO.glb', '/models/HOMOSEXUAL.glb'];
  models.forEach(model => useGLTF.preload(model));
};

// Call preload on module initialization
preloadModels();

interface ModelProps {
  modelPath: string;
  onLoaded: () => void;
}

function Model({ modelPath, onLoaded }: ModelProps) {
  const { scene } = useGLTF(modelPath, true);
  const modelRef = useRef<THREE.Group>();
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Optimize model on load - only do this once per model
  useEffect(() => {
    if (scene) {
      // Clear previous model
      while(sharedScene.children.length > 0) { 
        sharedScene.remove(sharedScene.children[0]); 
      }

      // Clone the loaded scene
      const clonedScene = scene.clone();
      
      // Optimize the cloned scene
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
          }
          
          // Optimize material settings
          if (child.material) {
            const material = child.material as THREE.MeshStandardMaterial;
            if (material.map) {
              material.map.encoding = THREE.sRGBEncoding;
              material.map.minFilter = THREE.LinearFilter;
              material.map.magFilter = THREE.LinearFilter;
              material.map.generateMipmaps = false;
            }
            material.roughness = 1;
            material.metalness = 0;
            material.envMapIntensity = 0;
          }
        }
      });

      // Add to shared scene
      sharedScene.add(clonedScene);
      onLoaded();
    }
  }, [scene, onLoaded]);

  // Auto-rotate the model
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5;
    }
  });

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
        const percentage = Math.min((viewportWidth - minWidth) / (maxWidth - minWidth), 1);
        xOffset = -maxOffset * percentage;
      }

      modelRef.current.position.x = -center.x + xOffset;
      modelRef.current.position.y = -center.y + (size.y * 0.28);
      modelRef.current.position.z = -center.z;
      modelRef.current.rotation.x = -Math.PI / 12;
      
      modelRef.current.updateMatrix();
      modelRef.current.updateMatrixWorld();
    }
  }, [viewportWidth]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    resetPosition();
  }, [modelPath, resetPosition, viewportWidth]);

  return <primitive ref={modelRef} object={sharedScene} />;
}

// Memoize lighting setup
const Lighting = () => {
  const lights = useMemo(() => (
    <>
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <directionalLight position={[-5, 5, -5]} intensity={1.5} />
      <directionalLight position={[0, -5, -5]} intensity={1} />
      <ambientLight intensity={1} />
      <hemisphereLight color={0xffffff} groundColor={0x444444} intensity={1} />
    </>
  ), []);

  return lights;
};

function CameraController() {
  const { camera, scene } = useThree();
  const cameraRef = useRef(camera);
  
  const updateCamera = useCallback(() => {
    if (!(cameraRef.current instanceof THREE.PerspectiveCamera)) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const fov = cameraRef.current.fov * (Math.PI / 180);
    const maxDimension = Math.max(size.x, size.y, size.z);
    const distance = (maxDimension * 1.5) / (2 * Math.tan(fov / 2));

    cameraRef.current.position.set(0, size.y * 0.05, distance);
    cameraRef.current.lookAt(new THREE.Vector3(0, size.y * 0.05, 0));
    cameraRef.current.updateProjectionMatrix();
  }, [scene]);

  useEffect(() => {
    updateCamera();
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

  // Extract model name from path
  const modelName = useMemo(() => {
    const pathParts = modelPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace('.glb', '');
  }, [modelPath]);

  return (
    <div className="w-full h-[80vh] bg-transparent relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative flex items-center justify-center w-full h-full">
            <img
              src={`/images/gct/${modelName}.webp`}
              alt={`${modelName} preview`}
              className="max-w-[55vw] max-h-[55vh] object-contain drop-shadow-lg"
              style={{ filter: 'brightness(0.95)' }}
            />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] text-4xl font-['ByteBounce'] text-white animate-pulse pointer-events-none select-none text-center drop-shadow-lg">
              LOADING...
            </span>
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
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true
        }}
      >
        <Lighting />
        <Model modelPath={modelPath} onLoaded={handleModelLoaded} />
        <CameraController />
      </Canvas>
    </div>
  );
} 