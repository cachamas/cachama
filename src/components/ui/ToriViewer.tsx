import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { isMobileDevice } from '../../lib/utils';
import { useInteractionStore } from '../../stores/interactionStore';
import { useLoadingStore } from '../../stores/loadingStore';

interface ToriModelProps {
  variant: string;
  onLoadProgress: (progress: number) => void;
}

function ToriModel({ variant, onLoadProgress }: ToriModelProps) {
  const { scene } = useGLTF('/models/tori.glb');
  const modelRef = useRef<THREE.Group>();
  const originalMaterials = useRef<Map<string, THREE.Material>>(new Map());
  const loadedTextures = useRef<Map<string, THREE.Texture>>(new Map());
  const totalTextures = useRef(0);
  const loadedCount = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-rotate the model
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5;
    }
  });

  // Cleanup function
  useEffect(() => {
    return () => {
      // Dispose textures and materials when component unmounts
      loadedTextures.current.forEach(texture => texture.dispose());
      loadedTextures.current.clear();
      originalMaterials.current.clear();
    };
  }, []);

  // Function to get folder number from variant
  const getFolderNumber = (variant: string): string => {
    switch (variant) {
      case 'TNPR0-100': return '1';
      case 'THE FLAYED ONE': return '2';
      case 'GOJO': return '3';
      case 'TOOL': return '4';
      case 'DEATH MONARCH': return '5';
      case 'BAKI': return '6';
      case 'COSMIC GOLEM': return '7';
      case 'SHO NUFF': return '8';
      case 'KILL BILL': return '9';
      case 'AKALI': return '10';
      case 'HELLRAISER I': return '11';
      case 'DMT': return '12';
      case 'ABADDON': return '13';
      case 'THUNDER GOD': return '14';
      case 'OLIVA': return '15';
      case 'Y-M3 v1': return '16';
      case 'HELLRAISER II': return '17';
      case 'SAGE': return '18';
      case 'KITSUNE': return '19';
      case 'TRIBAL1': return '20';
      case 'TRIBAL2': return '21';
      case 'COTTAGE FAIRY': return '22';
      case 'DUALITY': return '23';
      case 'ASURA': return '24';
      case 'PAIN': return '25';
      case 'SECOND KING': return '26';
      case 'THE DISCIPLE': return '27';
      case 'RIDE': return '28';
      case 'RODTANG': return '29';
      case 'KING': return '30';
      case 'DEATH': return '31';
      case 'RED': return '32';
      case 'CRUSADER': return '33';
      case 'ASSASSIN': return '34';
      case 'PICKLE': return '35';
      case 'ICE': return '36';
      case 'XIII ARCANUM': return '37';
      case 'BIRDMAN': return '38';
      case 'ATLANTEAN': return '39';
      case 'MAD DEATH': return '40';
      case 'THE DUKE': return '41';
      case 'KIRITO': return '42';
      case 'GOKU': return '43';
      case 'HISOKA': return '44';
      case 'MOROHA': return '45';
      case 'MUMMY': return '46';
      case 'SAMURAI': return '48';
      default: return '1';
    }
  };

  // Function to load a single texture
  const loadTextureForMesh = async (mesh: THREE.Mesh): Promise<THREE.Texture | null> => {
    const cleanName = mesh.name.slice(0, -3);
    const folderNumber = getFolderNumber(variant);
    console.log('Loading textures for variant:', variant, 'from folder:', folderNumber);
    const texturePath = `/models/tbsets/${folderNumber}/hq/${cleanName}.webp`;
    
    // Check if texture is already loaded
    const existingTexture = loadedTextures.current.get(texturePath);
    if (existingTexture) {
      loadedCount.current++;
      onLoadProgress(loadedCount.current / totalTextures.current);
      return existingTexture;
    }

    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        texturePath,
        (texture) => {
          console.log('Successfully loaded texture:', texturePath);
          loadedTextures.current.set(texturePath, texture);
          
          // Apply texture settings for all variants
          texture.rotation = Math.PI;
          texture.repeat.set(-1, 1);
          texture.center.set(0.5, 0.5);
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          
          loadedCount.current++;
          onLoadProgress(loadedCount.current / totalTextures.current);
          
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error('Failed to load texture:', texturePath, error);
          loadedCount.current++;
          onLoadProgress(loadedCount.current / totalTextures.current);
          resolve(null);
        }
      );
    });
  };

  useEffect(() => {
    if (modelRef.current) {
      // Reset counters
      loadedCount.current = 0;
      totalTextures.current = 0;

      // Count total textures needed
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          totalTextures.current++;
        }
      });

      // Store or restore original materials
      if (originalMaterials.current.size === 0) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            originalMaterials.current.set(child.name, child.material.clone());
          }
        });
      }

      // Center and position the model
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

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

      modelRef.current.position.sub(center);
      modelRef.current.position.x += xOffset;
      modelRef.current.position.y += size.y * 0.6;
      modelRef.current.rotation.x = -Math.PI / 12;

      // Load textures for all variants
      modelRef.current.traverse(async (child) => {
        if (child instanceof THREE.Mesh) {
          try {
            const texture = await loadTextureForMesh(child);
            if (texture) {
              const material = child.material as THREE.MeshStandardMaterial;
              material.emissiveMap = texture;
              material.emissive = new THREE.Color(1, 1, 1);
              material.emissiveIntensity = 0.3;
              material.needsUpdate = true;
            }
          } catch (error) {
            console.error('Error applying texture to mesh:', child.name, error);
          }
        }
      });
    }
  }, [variant, onLoadProgress, viewportWidth]);

  return <primitive ref={modelRef} object={scene} />;
}

function CameraController() {
  const { camera, scene } = useThree();
  
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      console.warn('Camera is not a PerspectiveCamera');
      return;
    }

    // Create a bounding box for the entire scene
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const height = size.y;

    // Calculate distance needed to fit height
    const fov = camera.fov * (Math.PI / 180);
    const distance = (height * 1.2) / (2 * Math.tan(fov / 2)); // 1.2 for 20% padding

    // Position camera to fit the full height
    camera.position.set(
      0,                // X position (left/right)
      height * 0.6,    // Y position (up/down)
      distance * 1.3   // Z position (forward/back)
    );
    // Look at a point higher up than 0
    camera.lookAt(new THREE.Vector3(0, height * 0.5, 0));
    camera.updateProjectionMatrix();

    // Update on window resize
    function handleResize() {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const newDistance = (height * 1.2) / (2 * Math.tan(camera.fov * (Math.PI / 180) / 2));
      camera.position.z = newDistance * 1.5;
      camera.position.y = height * 0.6;
      camera.lookAt(new THREE.Vector3(0, height * 0.5, 0));
      camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, scene]);

  return null;
}

// List of all Tori variants in order - same as in MobileToriSlideshow
const TORI_VARIANTS = [
  'TNPR0-100',
  'THE FLAYED ONE',
  'GOJO',
  'TOOL',
  'DEATH MONARCH',
  'BAKI',
  'COSMIC GOLEM',
  'SHO NUFF',
  'KILL BILL',
  'AKALI',
  'HELLRAISER I',
  'DMT',
  'ABADDON',
  'THUNDER GOD',
  'OLIVA',
  'Y-M3 v1',
  'HELLRAISER II',
  'SAGE',
  'KITSUNE',
  'TRIBAL1',
  'TRIBAL2',
  'COTTAGE FAIRY',
  'DUALITY',
  'ASURA',
  'PAIN',
  'SECOND KING',
  'THE DISCIPLE',
  'RIDE',
  'RODTANG',
  'KING',
  'DEATH',
  'RED',
  'XIII ARCANUM',
  'ASSASSIN',
  'PICKLE',
  'ICE',
  'CRUSADER',
  'BIRDMAN',
  'ATLANTEAN',
  'MAD DEATH',
  'THE DUKE',
  'KIRITO',
  'GOKU',
  'HISOKA',
  'MOROHA',
  'MUMMY',
  'SAMURAI'
];

// Map of Tori variants to their corresponding sphere object names
// Extracted to reduce duplication in the component
const TORI_SPHERE_NAMES: Record<string, string> = {
  'TNPR0-100': 'sphere10171_1',
  'THE FLAYED ONE': 'sphere101812_1',
  'GOJO': 'sphere10876_1',
  'TOOL': 'sphere10245_1',
  'DEATH MONARCH': 'sphere10199_1',
  'BAKI': 'sphere10447_1',
  'COSMIC GOLEM': 'sphere10759_1',
  'SHO NUFF': 'sphere10639_1',
  'KILL BILL': 'sphere10678_1',
  'AKALI': 'sphere10315_1',
  'HELLRAISER I': 'sphere101692_1',
  'DMT': 'sphere10135_1',
  'ABADDON': 'sphere101341_1',
  'THUNDER GOD': 'sphere101873_1',
  'OLIVA': 'sphere10564_1',
  'Y-M3 v1': 'sphere10366_1',
  'HELLRAISER II': 'sphere101653_1',
  'SAGE': 'sphere101770_1',
  'KITSUNE': 'sphere10001_1',
  'TRIBAL1': 'sphere10603_39', // Special case: TRIBAL1 uses index > 38
  'TRIBAL2': 'sphere10904_1',
  'COTTAGE FAIRY': 'sphere10291_1',
  'DUALITY': 'sphere101076_1',
  'ASURA': 'sphere101536_1',
  'PAIN': 'sphere101263_1',
  'SECOND KING': 'sphere101185_1',
  'THE DISCIPLE': 'sphere10472_1',
  'RIDE': 'sphere101156_1',
  'RODTANG': 'sphere101109_1',
  'KING': 'sphere101834_1',
  'DEATH': 'sphere10053_1',
  'RED': 'sphere101451_1',
  'XIII ARCANUM': 'sphere10020_1',
  'ASSASSIN': 'sphere101025_1',
  'PICKLE': 'sphere101614_1',
  'ICE': 'sphere101011_1',
  'CRUSADER': 'sphere101575_1',
  'BIRDMAN': 'sphere10709_1',
  'ATLANTEAN': 'sphere101731_1',
  'MAD DEATH': 'sphere101497_1',
  'THE DUKE': 'sphere10522_1',
  'KIRITO': 'sphere10795_1',
  'GOKU': 'sphere10837_1',
  'HISOKA': 'sphere101419_1',
  'MOROHA': 'sphere101302_1',
  'MUMMY': 'sphere101380_1',
  'SAMURAI': 'sphere101224_1'
};

interface ToriViewerProps {
  variant: string;
}

export default function ToriViewer({ variant }: ToriViewerProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVariant, setCurrentVariant] = useState(variant);
  const [forceRender, setForceRender] = useState(0);

  // Force re-render periodically to ensure controls stay visible
  useEffect(() => {
    if (isMobileDevice()) {
      console.log('📱 Setting up visibility enforcer for ToriViewer mobile controls');
      const timer = setInterval(() => {
        setForceRender(prev => prev + 1);
      }, 2000);
      
      return () => clearInterval(timer);
    }
  }, []);

  const handleLoadProgress = (progress: number) => {
    setLoadingProgress(progress);
    if (progress >= 1) {
      setIsLoading(false);
    }
  };

  // Find the current index in the TORI_VARIANTS array
  const getCurrentIndex = () => {
    return TORI_VARIANTS.findIndex(v => v === currentVariant);
  };

  // Navigate to previous Tori
  const showPrevious = () => {
    const currentIndex = getCurrentIndex();
    const newIndex = currentIndex <= 0 ? TORI_VARIANTS.length - 1 : currentIndex - 1;
    console.log(`Showing previous tori: ${TORI_VARIANTS[newIndex]}`);
    
    // Update the visible variant
    setCurrentVariant(TORI_VARIANTS[newIndex]);
    
    // IMPORTANT FIX: Also update the selected object in the store with proper sphere name
    // This ensures the info display (title, description) updates correctly
    const newVariant = TORI_VARIANTS[newIndex];
    
    // Create a new object with the proper sphere name to update the info display
    const newObj = new THREE.Object3D();
    newObj.name = TORI_SPHERE_NAMES[newVariant] || newVariant;
    
    // Update the selected object in the interaction store
    useInteractionStore.getState().setSelectedObject(newObj);
  };

  // Navigate to next Tori
  const showNext = () => {
    const currentIndex = getCurrentIndex();
    const newIndex = currentIndex >= TORI_VARIANTS.length - 1 ? 0 : currentIndex + 1;
    console.log(`Showing next tori: ${TORI_VARIANTS[newIndex]}`);
    
    // Update the visible variant
    setCurrentVariant(TORI_VARIANTS[newIndex]);
    
    // IMPORTANT FIX: Also update the selected object in the store with proper sphere name
    // This ensures the info display (title, description) updates correctly
    const newVariant = TORI_VARIANTS[newIndex];
    
    // Create a new object with the proper sphere name to update the info display
    const newObj = new THREE.Object3D();
    newObj.name = TORI_SPHERE_NAMES[newVariant] || newVariant;
    
    // Update the selected object in the interaction store
    useInteractionStore.getState().setSelectedObject(newObj);
  };

  // Return to central
  const returnToCentral = () => {
    console.log('Returning to central from ToriViewer');
    
    // Remove any auto-open flags
    document.body.removeAttribute('data-toris-auto-open');
    
    // Set loading state in the loading store
    const loadingStore = useLoadingStore?.getState();
    if (loadingStore) {
      // Show loading screen
      loadingStore.setLoading(true);
      loadingStore.setCurrentVideo('central.mp4');
    }
    
    // Mark that controls should be visible after teleport
    document.body.setAttribute('data-controls-visible', 'true');
    
    // Dispatch the teleport event - this will trigger the actual scene change
    window.dispatchEvent(new CustomEvent('teleport-to-central', { 
      detail: { from: 'toris', to: 'central' } 
    }));
    
    // Provide haptic feedback if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Force mobile controls re-initialization with delays
    // First reset immediately
    window.dispatchEvent(new CustomEvent('reset-controls'));
    
    // Second reset after loading screen appears
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('reset-controls'));
    }, 1000);
    
    // Third reset after map change likely completed
    setTimeout(() => {
      // Re-enable mobile controls explicitly
      document.body.setAttribute('data-controls-visible', 'true');
      window.dispatchEvent(new CustomEvent('reset-controls'));
      
      // Dispatch the interactable-closed event which should restore UI visibility
      window.dispatchEvent(new CustomEvent('interactable-closed'));
    }, 3000);
  };

  // Check if we're on mobile
  const isMobile = isMobileDevice();

  return (
    <div className="w-full h-[80vh] bg-transparent relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-white text-2xl font-['ByteBounce'] mb-2">LOADING TORI...</div>
            <div className="text-white text-xl font-['ByteBounce']">
              {Math.round(loadingProgress * 100)}%
            </div>
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
        <ToriModel variant={currentVariant} onLoadProgress={handleLoadProgress} />
        <CameraController />
      </Canvas>
      
      {/* Mobile Controls - only visible on mobile devices */}
      {isMobile && (
        <>
          {/* Controls - positioned at the bottom of the screen */}
          <div 
            className="fixed left-0 right-0 flex justify-center items-center z-[9999] pointer-events-auto" 
            style={{
              zIndex: 9999, 
              position: 'fixed',
              bottom: '5%', // Position controls at the very bottom of the screen with small margin
            }}
            key={`controls-${forceRender}`} /* Key to force re-render */
          >
            <div className="flex items-center gap-16"> {/* Large gap between buttons */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={showPrevious}
                  className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                  aria-label="Previous Statue"
                  style={{minWidth: '4rem', minHeight: '4rem'}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <button 
                  onClick={returnToCentral}
                  className="w-20 h-20 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                  aria-label="Return to Central"
                  style={{minWidth: '5rem', minHeight: '5rem'}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"></path>
                    <path d="M19 12l-7 7-7-7"></path>
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <button 
                  onClick={showNext}
                  className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                  aria-label="Next Statue"
                  style={{minWidth: '4rem', minHeight: '4rem'}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 