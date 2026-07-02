declare global {
  interface Window {
    __hasShownGalleryInstruction?: boolean;
    __hasShownGCTInstruction?: boolean;
    __hasShownToriInstruction?: boolean;
  }
}

import { useGLTF, useAnimations } from '@react-three/drei';
import { DRACOLoader } from 'three-stdlib';
import { RigidBody, CuboidCollider, useRapier } from '@react-three/rapier';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { performanceManager } from '../../lib/performanceManager';
import { EnemyManager } from './EnemyManager';
import { ShootingEffects } from '../effects/ShootingEffects';
import { ProjectileSystem } from '../effects/ProjectileSystem';
import { ProjectileManager } from '../effects/ProjectileManager';
import { GuideNPC } from './GuideNPC';
import { InteractionSystem, getObjectInfo } from '../../lib/interactionSystem';
import { openFirstVinyl } from '../ui/ObjectInfo';
import { useInteractionStore } from '../../stores/interactionStore';
import { useGameStore } from '../../lib/gameStore';
import Ramp from './Ramp';
import { useAudioStore } from '@/stores/audioStore';
import { playlist } from '@/lib/playlist';
import Staircase from './Staircase';
import { QRRain } from './QRRain';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { v4 as uuidv4 } from 'uuid';
import { useLoadingStore } from '../../stores/loadingStore';
import { getVideoUrlForMap } from '../../utils/videoUtils';
import { useDeviceAdapter } from '../../hooks/useDeviceAdapter';
import Stage from './Stage';
import SpinningModelOverlay from './SpinningModelOverlay';

// Set up DRACO decoder path
import {
  RETURN_TO_CENTRAL_SPAWN_POINTS,
  INITIAL_SPAWN_POINTS,
  RETURN_TELEPORTER_POSITIONS,
  TELEPORT_TRIGGERS,
  ELEVATOR_POSITION,
  TRIGGER_SIZE,
  GALLERY_RETURN_TRIGGER_SIZE,
  CENTRAL_ENEMY_SPAWNS,
  AMBIENT_LIGHT_COLOR,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_POSITION,
} from '../../lib/physicsConfig';

useGLTF.setDecoderPath('/draco/');

const __IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// iOS Safari: force JavaScript-only Draco decoder (WASM decoder corrupts geometry indexes)
if (__IS_IOS) {
  const origSetDP = DRACOLoader.prototype.setDecoderPath;
  DRACOLoader.prototype.setDecoderPath = function (this: InstanceType<typeof DRACOLoader>, path: string) {
    origSetDP.call(this, path);
    try { this.setDecoderConfig({ type: 'js' }); } catch (_) {}
    return this;
  } as typeof DRACOLoader.prototype.setDecoderPath;
}

// iOS Safari: validate and fix geometry indices that reference out-of-bounds vertices.
// Draco-decoded meshes can produce indices referencing vertices beyond the position buffer
// length, which triggers "The index is not in the allowed range" and crashes the physics engine.
function fixMeshIndices(scene: THREE.Scene | null) {
  if (!scene || !__IS_IOS) return;
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geo = obj.geometry;
    if (!geo) return;
    const idx = geo.getIndex();
    const pos = geo.attributes.position;
    if (!idx || !pos) return;
    const vCount = pos.count;
    const arr = idx.array;
    let fixed = false;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] >= vCount) {
        arr[i] = Math.max(0, vCount - 1);
        fixed = true;
      }
    }
    if (fixed) {
      idx.needsUpdate = true;
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      console.warn(`[iOS] Fixed mesh indices for ${obj.name || 'unnamed'}`);
    }
  });
}

/** Recursively free GPU resources for a scene tree. Safe to call multiple times. */
function disposeSceneResources(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of Object.keys(mat)) {
        const val = (mat as any)[key];
        if (val instanceof THREE.Texture) val.dispose();
      }
      mat.dispose();
    }
  });
}

/** Module-level registry so iOS cleanup can locate loaded scenes. */
const __sceneRegistry: Map<string, THREE.Object3D> = new Map();

// Remove preloading of all maps
// Only preload the can model since it's used for projectiles
useGLTF.preload('/models/can.glb');

// Cache for loaded maps
const loadedMaps = new Map();

// Store for managing map state
interface MapState {
  currentMap: string;
  setCurrentMap: (map: string) => void;
  isTransitioning: boolean;
  setTransitioning: (state: boolean) => void;
  spawnPoints: typeof INITIAL_SPAWN_POINTS;
  setSpawnPoint: (map: keyof typeof INITIAL_SPAWN_POINTS, data: { position: [number, number, number], rotation: [number, number, number] }) => void;
  handleMapTransition: (targetMap: string) => void;
  lastTeleportTime: number;
  setLastTeleportTime: (time: number) => void;
}

// Map store
export const useMapStore = create<MapState>((set) => ({
  currentMap: 'central',
  setCurrentMap: (map) => set({ currentMap: map }),
  isTransitioning: false,
  setTransitioning: (state) => set({ isTransitioning: state }),
  spawnPoints: INITIAL_SPAWN_POINTS,
  setSpawnPoint: (map, data) => set((state) => ({
    spawnPoints: {
      ...state.spawnPoints,
      [map]: {
        position: [...data.position] as [number, number, number],
        rotation: [...data.rotation] as [number, number, number]
      }
    }
  })),
  handleMapTransition: (targetMap) => set((state) => {
    if (!state.isTransitioning) {
      set({ isTransitioning: true });
      setTimeout(() => {
        set({ currentMap: targetMap });
        setTimeout(() => {
          set({ isTransitioning: false });
        }, 500);
      }, 500);
    }
    return state;
  }),
  lastTeleportTime: 0,
  setLastTeleportTime: (time) => set({ lastTeleportTime: time })
}));

interface WorldProps {
  // ... existing props ...
}

export default function World({ ...props }: WorldProps) {
  const { currentMap, setCurrentMap, isTransitioning, setTransitioning, setSpawnPoint, lastTeleportTime, setLastTeleportTime } = useMapStore();
  const { setForceTorisOpen } = useInteractionStore();
  const { handleMapChange, setPhysicsReady } = useLoadingStore();
  const addEnemy = useGameStore((state) => state.addEnemy);
  const removeEnemy = useGameStore((state) => state.removeEnemy);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const { scene: gameScene, camera } = useThree();
  const playerPosition = useRef(new THREE.Vector3());
  const { hoveredObject, selectedObject, showInfo, setShowInfo, setSelectedObject, setHoveredObject } = useInteractionStore();
  const interactionSystem = useRef<InteractionSystem | null>(null);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const { setTrack, play, currentTrack } = useAudioStore();
  const { world } = useRapier();
  const scene = useThree().scene;
  const { isLoading } = useLoadingStore();
  
  // Add this line to enable device adaptations
  useDeviceAdapter();
  
  // Update player position from camera
  useFrame(() => {
    const newPosition = camera.position.clone();
    if (showMusicPlayer && !playerPosition.current.equals(newPosition)) {
      // Player has moved, close music player
      setShowMusicPlayer(false);
      window.dispatchEvent(new CustomEvent('toggle-music-player', { 
        detail: { visible: false } 
      }));
    }
    playerPosition.current.copy(newPosition);
  });
  
  // Load all maps
  const { scene: overworldScene } = currentMap === 'overworld' ? useGLTF('/models/overworld.glb') : { scene: null };
  const { scene: centralScene } = currentMap === 'central' ? useGLTF('/models/central.glb') : { scene: null };
  const { scene: galleryScene } = currentMap === 'gallery' ? useGLTF('/models/gallery.glb') : { scene: null };
  const { scene: torisScene } = currentMap === 'toris' ? useGLTF('/models/toris.glb') : { scene: null };
  const { scene: musicScene, animations: musicAnimations } = currentMap === 'music' ? useGLTF('/models/music.glb') : { scene: null, animations: [] };
  const { scene: gctScene } = currentMap === 'gct' ? useGLTF('/models/gct.glb') : { scene: null };
  const { scene: canModel } = useGLTF('/models/can.glb');

  // iOS: fix geometry indices before any mesh is rendered or passed to Rapier
  if (__IS_IOS) {
    fixMeshIndices(overworldScene);
    fixMeshIndices(centralScene);
    fixMeshIndices(galleryScene);
    fixMeshIndices(torisScene);
    fixMeshIndices(musicScene);
    fixMeshIndices(gctScene);
    fixMeshIndices(canModel);
  }

  // Register loaded scenes so iOS cleanup can dispose them
  useEffect(() => {
    const pairs: [string, THREE.Object3D | null][] = [
      ['overworld', overworldScene],
      ['central', centralScene],
      ['gallery', galleryScene],
      ['toris', torisScene],
      ['music', musicScene],
      ['gct', gctScene],
    ];
    for (const [name, scene] of pairs) {
      if (scene && !__sceneRegistry.has(name)) {
        __sceneRegistry.set(name, scene);
      }
    }
  }, [overworldScene, centralScene, galleryScene, torisScene, musicScene, gctScene]);

  // iOS: evict non-essential maps from GPU memory on every map switch
  useEffect(() => {
    if (!__IS_IOS) return;
    const keep = new Set([currentMap, 'central']);
    for (const [name, scene] of __sceneRegistry) {
      if (keep.has(name)) continue;
      console.log(`🧹 iOS evicting "${name}" from GPU memory`);
      disposeSceneResources(scene);
      __sceneRegistry.delete(name);
      try { useGLTF.clear(`/models/${name}.glb`); } catch {}
    }
  }, [currentMap]);

  // Debug can model on load
  useEffect(() => {
    if (canModel) {
      console.log('🎯 Can model loaded:', {
        model: canModel,
        children: canModel.children,
        childrenDetails: canModel.children.map(child => ({
          name: child.name,
          type: child.type,
          geometry: child instanceof THREE.Mesh ? child.geometry.type : null,
          material: child instanceof THREE.Mesh ? child.material : null
        }))
      });
    }
  }, [canModel]);

  // Set up animations for music scene
  const { actions: musicActions } = useAnimations(musicAnimations, musicScene);

  // Initialize playlist when game starts
  useEffect(() => {
    // Only initialize if we don't have a track yet and we're in the central map
    if (playlist.length > 0 && !currentTrack && currentMap === 'central' && !isLoading) {
      console.log('🎮 World: Initializing music system');
      const initialTrack = playlist[0];
      console.log('🎮 World: Setting initial track:', initialTrack.title);
      
      // Set track and play immediately
      setTrack(initialTrack);
      
      // Set volume to 200% before playing
      const { setVolume } = useAudioStore.getState();
      setVolume(2.0);
      
      // Start playing
      setTimeout(() => {
        play();
        // Dispatch event to show Now Playing
        window.dispatchEvent(new CustomEvent('show-now-playing'));
      }, 100);
    }
  }, [currentMap, currentTrack, isLoading, play, setTrack]); // Add proper dependencies

  // Initialize performance manager
  useEffect(() => {
    const initManagers = async () => {
      await performanceManager.initializeGPUTier();
    };
    initManagers();
  }, [currentMap]);

  // Update the getCurrentScene function to not redeclare scene
  const getCurrentScene = () => {
    // Return the current scene based on the map
    return currentMap === 'gallery' ? galleryScene :
           currentMap === 'central' ? centralScene :
           currentMap === 'overworld' ? overworldScene :
           currentMap === 'toris' ? torisScene :
           currentMap === 'music' ? musicScene :
           currentMap === 'gct' ? gctScene :
           centralScene; // Default to central
  };
  
  // Use this instead of redeclaring scene
  const currentScene = getCurrentScene();

  // Apply performance optimizations
  useEffect(() => {
    if (!currentScene) {
      // If no scene, mark everything as loaded to avoid hanging
      useLoadingStore.getState().setTexturesLoaded(true);
      useLoadingStore.getState().setGeometriesLoaded(true);
      return;
    }

    const wrapper = new THREE.Scene();
    const sceneClone = currentScene.clone();
    wrapper.add(sceneClone);
    
    // Track texture and geometry loading
    let texturesLoaded = 0;
    let totalTextures = 0;
    let geometriesLoaded = 0;
    let totalGeometries = 0;

    // Count total textures and geometries
    sceneClone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        totalGeometries++;
        const material = object.material;
        if (material && material instanceof THREE.MeshStandardMaterial && material.map) {
          totalTextures++;
        }
      }
    });

    // Mark textures as loaded immediately if there are none to track
    if (totalTextures === 0) {
      useLoadingStore.getState().setTexturesLoaded(true);
    }

    // Mark geometries as loaded immediately if there are none to track
    if (totalGeometries === 0) {
      useLoadingStore.getState().setGeometriesLoaded(true);
    }

    // Track load listeners so we can clean them up on map switch
    const loadHandlers: Array<() => void> = [];

    // Only traverse if there's something to track
    if (totalTextures > 0 || totalGeometries > 0) {
      sceneClone.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometriesLoaded++;
          const material = object.material;
          if (material && material instanceof THREE.MeshStandardMaterial && material.map) {
            const texture = material.map;
            if (texture.image) {
              // Texture already loaded
              texturesLoaded++;
              if (texturesLoaded === totalTextures) {
                console.log('🎮 All textures loaded for:', currentMap);
                useLoadingStore.getState().setTexturesLoaded(true);
              }
            } else {
              // Wait for texture to load
              const handler = () => {
                texturesLoaded++;
                if (texturesLoaded === totalTextures) {
                  console.log('🎮 All textures loaded for:', currentMap);
                  useLoadingStore.getState().setTexturesLoaded(true);
                }
              };
              texture.addEventListener('load', handler);
              loadHandlers.push(() => texture.removeEventListener('load', handler));
            }
          }
        }
      });

      // Set geometries as loaded since they're already in memory
      if (geometriesLoaded === totalGeometries) {
        console.log('🎮 All geometries loaded for:', currentMap);
        useLoadingStore.getState().setGeometriesLoaded(true);
      }
    }
    
    performanceManager.optimizeScene(wrapper, camera);

    return () => {
      loadHandlers.forEach((remove) => remove());
    };
  }, [currentScene, camera, currentMap]);

  // Add lights to central map
  useEffect(() => {
    if (currentMap === 'central' && centralScene) {
      const ambientLight = new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY);
      const directionalLight = new THREE.DirectionalLight(DIRECTIONAL_LIGHT_COLOR, DIRECTIONAL_LIGHT_INTENSITY);
      directionalLight.position.set(...DIRECTIONAL_LIGHT_POSITION);
      
      centralScene.add(ambientLight);
      centralScene.add(directionalLight);
      
      return () => {
        if (centralScene) {
          centralScene.remove(ambientLight);
          centralScene.remove(directionalLight);
        }
      };
    }
  }, [currentMap, centralScene]);

  // Simple map change detection 
  useEffect(() => {
    console.log('Map changed to:', currentMap);
    
    // Update the data attribute for tracking
    document.body.setAttribute('data-current-map', currentMap);
    
    // Dispatch map change event
    window.dispatchEvent(new CustomEvent('map-changed', { 
      detail: { map: currentMap }
    }));
    
    // Show appropriate instruction GIF 3 seconds after entering specific maps
    if (['gct', 'gallery', 'music', 'toris'].includes(currentMap)) {
      setTimeout(() => {
        if (currentMap === 'gct' && !window.__hasShownGCTInstruction) {
          window.__hasShownGCTInstruction = true;
          window.dispatchEvent(new CustomEvent('show-gct-instruction'));
        } else if (currentMap === 'gallery' && !window.__hasShownGalleryInstruction) {
          window.__hasShownGalleryInstruction = true;
          window.dispatchEvent(new CustomEvent('show-gallery-instruction'));
        } else if (currentMap === 'music') {
          // Show music instruction
          window.dispatchEvent(new CustomEvent('show-music-instruction'));
        } else if (currentMap === 'toris' && !window.__hasShownToriInstruction) {
          window.__hasShownToriInstruction = true;
          window.dispatchEvent(new CustomEvent('show-tori-instruction'));
        }
      }, 3000);
    }
    
    // Special handling for toris map on mobile
    if (currentMap === 'toris') {
      // Check if mobile
      const isMobile = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       document.body.getAttribute('data-is-mobile') === 'true';
      
      if (isMobile) {
        console.log('🎮 TORIS MAP DETECTED ON MOBILE - IMMEDIATE ACTION');
        
        // Set a flag on body to enable special handling of tori objects
        document.body.setAttribute('data-toris-auto-open', 'true');
        
        // Force disable movement immediately
        window.dispatchEvent(new CustomEvent('interactable-opened'));
        
        // Fire multiple triggers to ensure it works
        window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
        
        // Try multiple times with different timing to ensure it works
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          console.log('🎮 TORIS TRIGGER - 100ms');
        }, 100);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          console.log('🎮 TORIS TRIGGER - 300ms');
        }, 300);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          console.log('🎮 TORIS TRIGGER - 500ms');
        }, 500);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          console.log('🎮 TORIS TRIGGER - 1000ms');
        }, 1000);
      }
    }
  }, [currentMap]);

  // Initialize mobile state once at component mount
  useEffect(() => {
    const isMobileDevice = 'ontouchstart' in window;
    if (isMobileDevice) {
      // Set up persistent mobile state
      document.body.setAttribute('data-is-mobile', 'true');
      document.body.style.touchAction = 'none';
      
      // Prevent any pointer lock operations on mobile
      const preventPointerLock = (e: Event) => {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        e.stopPropagation();
      };
      
      document.addEventListener('pointerlockchange', preventPointerLock);
      
      // Clean up only on unmount
      return () => {
        document.removeEventListener('pointerlockchange', preventPointerLock);
      };
    }
  }, []); // Empty deps - only run once on mount

  // Handle teleport between maps - with persistent mobile controls
  const handleTeleport = useCallback((targetMap: string) => {
    const { lastTeleportTime, setLastTeleportTime } = useMapStore.getState();
    const currentTime = Date.now();
    const TELEPORT_COOLDOWN = 2000; // 2 second cooldown

    // Check if enough time has passed since last teleport
    if (currentTime - lastTeleportTime < TELEPORT_COOLDOWN) {
      console.log('🌐 Teleport cooldown active, skipping teleport');
      return;
    }

    if (!isTransitioning) {
      setTransitioning(true);
      setLastTeleportTime(currentTime);
      setFadeOpacity(1);
      
      const isMobileDevice = document.body.getAttribute('data-is-mobile') === 'true';
      
      // Only handle pointer lock on desktop
      if (!isMobileDevice) {
        document.exitPointerLock();
      }
      
      // Set video and trigger loading screen FIRST - IMMEDIATE VIDEO PLAYBACK
      useLoadingStore.getState().setCurrentVideo(getVideoUrlForMap(targetMap));
      
      // Force loading screen to be visible with video playing BEFORE loading assets
      useLoadingStore.getState().setLoading(true);
      
      // SHORT DELAY before starting to load the map - gives video time to start playing
      setTimeout(() => {
        // Now start loading the map - this will update the progress bar while video plays
        handleMapChange(targetMap);
        
        // Store the current map before changing it
        if (currentMap === 'toris' && targetMap === 'central') {
          console.log('🌐 Setting previousMap to toris before teleporting to central');
          window.dispatchEvent(new CustomEvent('map-transition', { 
            detail: { from: 'toris', to: 'central' } 
          }));
        }
        
        // Handle spawn points
        if (targetMap === 'toris') {
          console.log('🌐 Teleporting TO toris map, setting toris spawn point');
          setSpawnPoint('toris', {
            position: [-203, -232, 73] as [number, number, number],
            rotation: [-3.12, 45.85 + 180, 0] as [number, number, number]
          });
        } else if (targetMap === 'central' && currentMap === 'toris') {
          // Special case when returning from toris to central
          const torisReturnSpawn = RETURN_TO_CENTRAL_SPAWN_POINTS.toris;
          console.log('🌐 Teleporting FROM toris TO central, setting central spawn at:', torisReturnSpawn.position);
          setSpawnPoint('central', {
            position: [...torisReturnSpawn.position] as [number, number, number],
            rotation: [...torisReturnSpawn.rotation] as [number, number, number]
          });
        } else {
          const returnSpawn = RETURN_TO_CENTRAL_SPAWN_POINTS[targetMap as keyof typeof RETURN_TO_CENTRAL_SPAWN_POINTS];
          if (returnSpawn) {
            console.log(`🌐 Setting spawn point for ${targetMap} at:`, returnSpawn.position);
            setSpawnPoint('central', {
              position: [...returnSpawn.position] as [number, number, number],
              rotation: [...returnSpawn.rotation] as [number, number, number]
            });
          }
        }
        
        // Change map without disrupting controls
        setCurrentMap(targetMap);
        
        // Don't clear loading here - loadingStore.handleMapChange will clear it
        // once physics, textures, geometries AND player spawn are all confirmed
        setTimeout(() => {
          setFadeOpacity(0);
          setTransitioning(false);
          
          // Only request pointer lock on desktop if map is not open
          if (!isMobileDevice) {
            const isMapOpen = document.body.getAttribute('data-map-open') === 'true';
            if (!isMapOpen) {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                canvas.requestPointerLock();
              }
            }
          }
          
          // Dispatch map change complete event
          window.dispatchEvent(new CustomEvent('map-change-complete', {
            detail: { map: targetMap }
          }));
        }, 500);
      }, 100); // Short delay to ensure video starts playing first
    }
  }, [isTransitioning, setTransitioning, setSpawnPoint, setCurrentMap, handleMapChange]);

  // Initialize interaction system
  useEffect(() => {
    if (!currentScene || !camera) return;
    interactionSystem.current = new InteractionSystem(camera, currentScene, currentMap);
  }, [currentScene, camera, currentMap]);

  // Update interaction system when map changes
  useEffect(() => {
    if (interactionSystem.current) {
      interactionSystem.current.updateMap(currentMap);
    }
  }, [currentMap]);

  // Update interaction system
  useFrame(() => {
    if (interactionSystem.current) {
      interactionSystem.current.update();
      
      // Set global hover state and cancel throw animation when hovering over interactables
      (window as any).__isHoveringInteractable__ = !!hoveredObject;
      if (hoveredObject) {
        console.log('🎯 Canceling animations - hovering over:', hoveredObject.name);
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('stop-throw-animation'));
        window.dispatchEvent(new CustomEvent('reset-viewmodel'));
      }
    }
  });

  // Cancel animations when hovering over interactables
  useEffect(() => {
    if (hoveredObject) {
      console.log('🎯 [Hover] Starting animation cancellation for:', hoveredObject.name);
      
      const cancelAnimations = () => {
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('stop-throw-animation'));
        window.dispatchEvent(new CustomEvent('reset-viewmodel'));
        console.log('🎯 [Hover] Canceling animations - hovering over:', hoveredObject.name);
      };
      
      // Cancel immediately and set up interval
      cancelAnimations();
      const interval = setInterval(cancelAnimations, 100);
      
      return () => {
        clearInterval(interval);
        console.log('🎯 [Hover] Stopped canceling animations for:', hoveredObject.name);
      };
    }
  }, [hoveredObject]);

  // Add event listeners for game interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        handleClick();
      } else if ((e.key === 'm' || e.key === 'M') && currentMap === 'central') {
        // Check if map is already open
        const isMapOpen = document.body.getAttribute('data-map-open') === 'true' || window.__btrMapOpen;
        
        if (isMapOpen) {
          // Close the map
          document.body.removeAttribute('data-map-open');
          window.__btrMapOpen = false;
          useInteractionStore.getState().setShowInfo(false);
          useInteractionStore.getState().setSelectedObject(null);
          useInteractionStore.getState().setHoveredObject(null);
          
          // Reacquire pointer lock if needed
          if (!document.pointerLockElement) {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              canvas.requestPointerLock();
            }
          }
        } else {
          // Create a synthetic BTR map object
          const btrMap = new THREE.Object3D();
          btrMap.name = 'Plane__0024';
          
          // Set selected object and show info
          useInteractionStore.getState().setHoveredObject(btrMap);
          useInteractionStore.getState().setSelectedObject(btrMap);
          useInteractionStore.getState().setShowInfo(true);
          
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          
          document.body.setAttribute('data-map-open', 'true');
          window.__btrMapOpen = true;
          window.dispatchEvent(new CustomEvent('interactable-opened'));
        }
      } else if (e.key === 'i' || e.key === 'I') {
        // Specific handling for I key in central map to show artist information
        const isMobile = 'ontouchstart' in window || 
                        navigator.maxTouchPoints > 0 || 
                        document.body.getAttribute('data-is-mobile') === 'true';
                        
        if (currentMap === 'central') {
          // Toggle artist info - close if already open
          if (selectedObject && selectedObject.name === 'Cube005') {
            // Close the info panel
            setSelectedObject(null);
            setShowInfo(false);
            
            // Signal that interactable is closed
            window.dispatchEvent(new CustomEvent('interactable-closed'));
            
            // Reacquire pointer lock
            const canvas = document.querySelector('canvas');
            if (canvas && !document.pointerLockElement) {
              canvas.requestPointerLock();
            }
          } else {
            // Create a synthetic artist info object
            const artistInfoObj = new THREE.Object3D();
            artistInfoObj.name = 'Cube005';
            
            // Set selected object and show info
            setSelectedObject(artistInfoObj);
            setShowInfo(true);
            
            // Exit pointer lock for better viewing
            if (document.pointerLockElement) {
              document.exitPointerLock();
            }
            
            // Signal that interactable is open
            window.dispatchEvent(new CustomEvent('interactable-opened'));
          }
        }
        // Regular gallery visualizer handling for other maps
        else if (!isMobile && currentMap === 'gallery') {
          // Show instruction the first time
          if (!window.__hasShownGalleryInstruction) {
            window.__hasShownGalleryInstruction = true;
            window.dispatchEvent(new CustomEvent('show-gallery-instruction'));
          }
          // Create a gallery object
          const galleryObj = new THREE.Object3D();
          galleryObj.name = 'Gallery';
          // Set selected object and show info
          setSelectedObject(galleryObj);
          setShowInfo(true);
          // Exit pointer lock for better interaction
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          // Signal gallery is open
          window.dispatchEvent(new CustomEvent('gallery-opened'));
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          // Initialize the gallery slideshow
          window.dispatchEvent(new CustomEvent('gallery-navigation', {
            detail: { direction: 'next' }
          }));
        } else if (!isMobile && currentMap === 'gct') {
          // Show GCT instruction the first time
          if (!window.__hasShownGCTInstruction) {
            window.__hasShownGCTInstruction = true;
            window.dispatchEvent(new CustomEvent('show-gct-instruction'));
          }
          // Create a GCT object
          const gctObj = new THREE.Object3D();
          gctObj.name = 'GCT';
          setSelectedObject(gctObj);
          setShowInfo(true);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          window.dispatchEvent(new CustomEvent('gct-opened'));
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          window.dispatchEvent(new CustomEvent('gct-navigation', {
            detail: { direction: 'next' }
          }));
        } else if (!isMobile && currentMap === 'toris') {
          // Show tori instruction the first time
          if (!window.__hasShownToriInstruction) {
            window.__hasShownToriInstruction = true;
            window.dispatchEvent(new CustomEvent('show-tori-instruction'));
          }
          // Create a tori object
          const toriObj = new THREE.Object3D();
          toriObj.name = 'TNPR0-100';
          setSelectedObject(toriObj);
          setShowInfo(true);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          window.dispatchEvent(new CustomEvent('tori-opened'));
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          window.dispatchEvent(new CustomEvent('tori-navigation', {
            detail: { direction: 'next' }
          }));
        } else if (currentMap === 'music') {
          // Open first vinyl as if clicked
          openFirstVinyl(setSelectedObject);
          setShowInfo(true);
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          window.dispatchEvent(new CustomEvent('interactable-opened'));
        }
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && showInfo) {
        // Only handle arrow navigation on PC when gallery, GCT, or tori is open
        const isMobile = 'ontouchstart' in window || 
                        navigator.maxTouchPoints > 0 || 
                        document.body.getAttribute('data-is-mobile') === 'true';
        if (!isMobile) {
          if (currentMap === 'gallery') {
            // Create a synthetic event to trigger navigation
            const event = new CustomEvent('gallery-navigation', {
              detail: { direction: e.key === 'ArrowLeft' ? 'prev' : 'next' }
            });
            window.dispatchEvent(event);
          } else if (currentMap === 'gct') {
            const event = new CustomEvent('gct-navigation', {
              detail: { direction: e.key === 'ArrowLeft' ? 'prev' : 'next' }
            });
            window.dispatchEvent(event);
          } else if (currentMap === 'toris') {
            const event = new CustomEvent('tori-navigation', {
              detail: { direction: e.key === 'ArrowLeft' ? 'prev' : 'next' }
            });
            window.dispatchEvent(event);
          }
        }
      }
    };

    const handleClick = () => {
      if (hoveredObject) {
        // Cancel throw animation and all related animations
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('stop-throw-animation'));
        window.dispatchEvent(new CustomEvent('reset-viewmodel'));
        console.log('🎯 Cancelled all throw animations - clicked:', hoveredObject.name);
        
        const info = getObjectInfo(hoveredObject.name);
        
        // Special handling for BTR map
        if (hoveredObject.name === 'Plane__0024') {
          console.log('🗺️ BTR Map clicked - keeping pointer unlocked');
          
          // Handle exit pointer lock
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          
          // Set selected object and show info
          setSelectedObject(hoveredObject);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          
          // Set flags to indicate map is open
          document.body.setAttribute('data-map-open', 'true');
          window.__btrMapOpen = true;
          return;
        }
        
        // Special handling for music box in music map
        if (hoveredObject.name === 'Box001_Material_#25_0027') {
          console.log('🎵 Music Box clicked in music map');
          // Handle exit pointer lock
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          // Set selected object and show info
          setSelectedObject(hoveredObject);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          return;
        }
        
        if (info.isMusicPlayer || hoveredObject.name.toLowerCase().includes('turntable')) {
          console.log('Toggling music player');
          // Center mouse and release pointer lock BEFORE processing the click
          if (document.pointerLockElement) {
            console.log('🎵 World: Exiting pointer lock on turntable click');
            const canvas = document.querySelector('canvas');
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              window.scrollTo(0, 0);
              window.moveTo(centerX, centerY);
            }
            document.exitPointerLock();
          }
          
          const newState = !showMusicPlayer;
          setShowMusicPlayer(newState);
          
          // Dispatch event with a small delay to ensure UI is ready
          setTimeout(() => {
            console.log('Dispatching toggle event:', { visible: newState });
            window.dispatchEvent(new CustomEvent('toggle-music-player', { 
              detail: { visible: newState } 
            }));
            // Dispatch interactable state change
            window.dispatchEvent(new CustomEvent(newState ? 'interactable-opened' : 'interactable-closed'));
          }, 50);
        } else if (selectedObject === hoveredObject) {
          setSelectedObject(null);
          setShowInfo(false);
          window.dispatchEvent(new CustomEvent('interactable-closed'));
        } else {
          setSelectedObject(hoveredObject);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
        }
      } else if (selectedObject && selectedObject.name === 'Cube005' && currentMap === 'central') {
        // Close the artist info panel when clicking anywhere if it's open
        setSelectedObject(null);
        setShowInfo(false);
        
        // Signal that interactable is closed
        window.dispatchEvent(new CustomEvent('interactable-closed'));
        
        // Reacquire pointer lock
        const canvas = document.querySelector('canvas');
        if (canvas && !document.pointerLockElement) {
          canvas.requestPointerLock();
        }
      }
    };

    const handleMobileInteract = () => {
      if (hoveredObject) {
        // Cancel throw animation and all related animations
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('stop-throw-animation'));
        window.dispatchEvent(new CustomEvent('reset-viewmodel'));
        console.log('🎯 Cancelled all throw animations - mobile tap:', hoveredObject.name);
        
        const info = getObjectInfo(hoveredObject.name);
        if ((info.isMusicPlayer || hoveredObject.name.toLowerCase().includes('turntable')) && info.variant !== 'musicDisc') {
          console.log('Toggling music player (mobile)');
          const newState = !showMusicPlayer;
          setShowMusicPlayer(newState);
          
          // Dispatch event with a small delay to ensure UI is ready
          setTimeout(() => {
            console.log('Dispatching toggle event:', { visible: newState });
            window.dispatchEvent(new CustomEvent('toggle-music-player', { 
              detail: { visible: newState } 
            }));
            // Dispatch interactable state change
            window.dispatchEvent(new CustomEvent(newState ? 'interactable-opened' : 'interactable-closed'));
          }, 50);
        } else if (selectedObject === hoveredObject) {
          setSelectedObject(null);
          setShowInfo(false);
          window.dispatchEvent(new CustomEvent('interactable-closed'));
        } else {
          setSelectedObject(hoveredObject);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
        }
      }
    };

    const handleThrowAnimation = () => {
      // Only spawn can if not hovering over an interactable
      if (!hoveredObject) {
        window.dispatchEvent(new CustomEvent('player-shoot'));
      }
    };

    // Handle showBTRMap event for magnifying glass button
    const handleShowBTRMap = (e: CustomEvent) => {
      if (currentMap === 'central') {
        console.log('🗺️ Show BTR Map event received in central map');
        
        // Get the object from the event detail
        const object = e.detail?.object;
        
        if (object) {
          // Set selected object and show info
          setSelectedObject(object);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
          
          // Set flags to indicate map is open
          document.body.setAttribute('data-map-open', 'true');
          window.__btrMapOpen = true;
        }
      }
    };
    
    // Handle findObjectByName event for MobileMapSlideshow
    const handleFindObjectByName = (e: CustomEvent) => {
      const name = e.detail?.name;
      const callback = e.detail?.callback;
      
      if (name && callback && typeof callback === 'function') {
        // Search through the scene to find the requested object
        const searchScene = (scene: THREE.Object3D) => {
          if (!scene) return;
          
          scene.traverse((object) => {
            if (object.name === name) {
              callback(object);
            }
          });
        };
        
        // Search in current scene
        let currentScene;
        switch (currentMap) {
          case 'central':
            currentScene = centralScene;
            break;
          case 'gallery':
            currentScene = galleryScene;
            break;
          case 'toris':
            currentScene = torisScene;
            break;
          case 'music':
            currentScene = musicScene;
            break;
          case 'gct':
            currentScene = gctScene;
            break;
          case 'overworld':
            currentScene = overworldScene;
            break;
        }
        
        if (currentScene) {
          searchScene(currentScene);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    window.addEventListener('interact-with-object', handleMobileInteract);
    window.addEventListener('start-throw-animation', handleThrowAnimation);
    window.addEventListener('show-btr-map', handleShowBTRMap as EventListener);
    window.addEventListener('find-object-by-name', handleFindObjectByName as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('interact-with-object', handleMobileInteract);
      window.removeEventListener('start-throw-animation', handleThrowAnimation);
      window.removeEventListener('show-btr-map', handleShowBTRMap as EventListener);
      window.removeEventListener('find-object-by-name', handleFindObjectByName as EventListener);
    };
  }, [hoveredObject, selectedObject, setSelectedObject, setShowInfo, setShowMusicPlayer, showMusicPlayer, currentMap]);

  // Show Now Playing notification on map change
  useEffect(() => {
    if (currentTrack && !isLoading) {
      window.dispatchEvent(new CustomEvent('show-now-playing'));
    }
  }, [currentMap, currentTrack, isLoading]);

  // Clear interactions on map change - but preserve ALL mobile functionality
  useEffect(() => {
    const isMobileDevice = document.body.getAttribute('data-is-mobile') === 'true';
    
    // Clear non-control related state
    setSelectedObject(null);
    setHoveredObject(null);
    setShowInfo(false);
    setShowMusicPlayer(false);
    
    // Clear highlights without affecting controls
    window.dispatchEvent(new CustomEvent('clear-highlights'));
    
    // Set loading state
    setTransitioning(true);
    
    // Create a promise for map loading
    const loadMap = new Promise<void>((resolve) => {
      let scene;
      switch (currentMap) {
        case 'overworld':
          scene = overworldScene;
          break;
        case 'central':
          scene = centralScene;
          break;
        case 'gallery':
          scene = galleryScene;
          break;
        case 'toris':
          scene = torisScene;
          break;
        case 'music':
          scene = musicScene;
          break;
        case 'gct':
          scene = gctScene;
          break;
      }
      
      if (scene) {
        // Wait for textures and geometries to load
        let loadedCount = 0;
        const totalToLoad = scene.children.length;
        
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const material = object.material as THREE.MeshStandardMaterial;
            if (material && 'map' in material && material.map) {
              if (material.map.image) {
                loadedCount++;
                if (loadedCount === totalToLoad) resolve();
              } else {
                material.map.addEventListener('load', () => {
                  loadedCount++;
                  if (loadedCount === totalToLoad) resolve();
                });
              }
            } else {
              loadedCount++;
              if (loadedCount === totalToLoad) resolve();
            }
          }
        });
        
        // Fallback resolve after 2 seconds
        setTimeout(resolve, 2000);
      } else {
        resolve();
      }
    });

    // Wait for map to load before proceeding
    loadMap.then(() => {
      setTimeout(() => {
        setTransitioning(false);
        
        // Dispatch map ready event
        window.dispatchEvent(new CustomEvent('map-ready', { 
          detail: { 
            map: currentMap,
            isMobile: isMobileDevice 
          }
        }));
        
        // Special handling for Toris map on mobile
        if (currentMap === 'toris' && isMobileDevice) {
          // Trigger the Toris viewer to open immediately
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          
          // Also dispatch a map-changed event for any listeners
          window.dispatchEvent(new CustomEvent('map-changed', {
            detail: {
              map: 'toris',
              isMobile: true
            }
          }));
        }
      }, 500);
    });
  }, [currentMap, setSelectedObject, setHoveredObject, setShowInfo, setTransitioning, overworldScene, centralScene, galleryScene, torisScene, musicScene, gctScene]);

  // Add listener for clear-highlights event
  useEffect(() => {
    const handleClearHighlights = () => {
      setSelectedObject(null);
      setHoveredObject(null);
      setShowInfo(false);
      setShowMusicPlayer(false);
      if (interactionSystem.current) {
        interactionSystem.current.cleanup();
      }
    };

    window.addEventListener('clear-highlights', handleClearHighlights);
    return () => window.removeEventListener('clear-highlights', handleClearHighlights);
  }, [setSelectedObject, setHoveredObject, setShowInfo]);

  // Play all animations when music scene is active
  useEffect(() => {
    if (currentMap === 'music' && musicActions) {
      Object.values(musicActions).forEach(action => {
        if (action) {
          action.reset().play();
          action.setLoop(THREE.LoopRepeat, Infinity);
        }
      });
    }
    return () => {
      if (musicActions) {
        Object.values(musicActions).forEach(action => {
          if (action) {
            action.stop();
          }
        });
      }
    };
  }, [currentMap, musicActions]);

  // Add hover check handler
  useEffect(() => {
    const handleHoverCheck = (e: CustomEvent) => {
      if (hoveredObject && e.detail?.callback) {
        e.detail.callback(true);
      } else if (e.detail?.callback) {
        e.detail.callback(false);
      }
    };
    
    window.addEventListener('check-hover', handleHoverCheck as EventListener);
    return () => window.removeEventListener('check-hover', handleHoverCheck as EventListener);
  }, [hoveredObject]);

  // Handle projectile spawning
  useEffect(() => {
    const handleShoot = (e: CustomEvent) => {
      // Don't spawn projectile if hovering over an interactive object
      if (hoveredObject) {
        // Cancel throw animation when attempting to shoot while hovering
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('prevent-throw-start'));
        console.log('🎯 Prevented throw animation - attempted shoot while hovering over:', hoveredObject.name);
        return;
      }

      // Skip can spawning if this was triggered by a mobile shoot (animation will handle it)
      if (e.detail?.fromMobile) {
        return;
      }

      try {
        const position = new THREE.Vector3();
        const direction = new THREE.Vector3();
        camera.getWorldPosition(position);
        camera.getWorldDirection(direction);
        
        const spread = 0.1;
        direction.x += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        position.add(direction.clone().multiplyScalar(1));
        const rightVector = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
        position.add(rightVector.multiplyScalar(0.3));

        const projectile = canModel.clone();
        projectile.scale.multiplyScalar(0.9);
        projectile.position.copy(position);
        projectile.lookAt(position.clone().add(direction));
        
        const velocity = 35;
        const bounce = 0.5;
        let time = 0;

        // Create physics body
        const rigidBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(position.x, position.y, position.z)
          .setLinvel(direction.x * velocity, direction.y * velocity, direction.z * velocity)
          .setAngvel(new THREE.Vector3(Math.random() * 15 - 7.5, Math.random() * 15 - 7.5, Math.random() * 15 - 7.5))
        );
        
        // Set userData to identify this as a player projectile
        rigidBody.userData = { type: 'playerProjectile' };
        console.log('🎯 Created can projectile with userData:', rigidBody.userData);
        
        // Add collider with sensor enabled
        const colliderDesc = RAPIER.ColliderDesc.cylinder(0.2, 0.3)
          .setRestitution(bounce)
          .setFriction(0.2)
          .setSensor(true); // Make it a sensor to detect intersections
        const collider = world.createCollider(colliderDesc, rigidBody);
        console.log('🎯 Created can collider:', collider);
        
        scene.add(projectile);
        
        function updateProjectilePosition() {
          if (!rigidBody || !projectile) {
            return;
          }
          
          try {
            const pos = rigidBody.translation();
            projectile.position.set(pos.x, pos.y, pos.z);
            
            const rot = rigidBody.rotation();
            projectile.quaternion.set(rot.x, rot.y, rot.z, rot.w);
            
            if (time > 3) {
              scene.remove(projectile);
              world.removeRigidBody(rigidBody);
              return;
            }
            
            time += 0.016;
            requestAnimationFrame(updateProjectilePosition);
          } catch (error) {
            console.error('Error updating projectile position:', error);
            // Clean up on error
            if (projectile) scene.remove(projectile);
            if (rigidBody) world.removeRigidBody(rigidBody);
          }
        }
        
        updateProjectilePosition();
        
      } catch (error) {
        console.error('🚨 ERROR SPAWNING CAN PROJECTILE', error);
      }
    };

    window.addEventListener('player-shoot', handleShoot);
    return () => window.removeEventListener('player-shoot', handleShoot);
  }, [camera, scene, canModel, world, hoveredObject]);

  // Handle enemy spawning in central map
  useEffect(() => {
    if (currentMap === 'central' && !isTransitioning) {
      // Clear any existing enemies first
      useGameStore.getState().enemies.forEach(enemy => {
        removeEnemy(enemy.id);
      });

      // Spawn new enemies
      CENTRAL_ENEMY_SPAWNS.forEach(spawn => {
        const enemyId = uuidv4();
        addEnemy({
          id: enemyId,
          position: { x: spawn.position[0], y: spawn.position[1], z: spawn.position[2] },
          modelIndex: spawn.modelIndex
        });
      });
    }
  }, [currentMap, isTransitioning, addEnemy, removeEnemy]);

  // Add mobile interaction handler - now more persistent
  useEffect(() => {
    // Handler for mobile tap interaction
    const handleMobileTap = () => {
      if (interactionSystem.current?.hoveredObject) {
        const obj = interactionSystem.current.hoveredObject;
        console.log('Mobile tap on interactable:', obj.name);
        
        // Prevent any throw animations when interacting
        window.dispatchEvent(new CustomEvent('cancel-throw'));
        window.dispatchEvent(new CustomEvent('prevent-throw-start'));
        
        // Simulate the same behavior as keyboard E press
        const info = getObjectInfo(obj.name);
        
        if ((info.isMusicPlayer || obj.name.toLowerCase().includes('turntable')) && info.variant !== 'musicDisc') {
          console.log('Toggling music player (mobile)');
          const newState = !showMusicPlayer;
          setShowMusicPlayer(newState);
          
          // Dispatch event with a small delay to ensure UI is ready
          setTimeout(() => {
            console.log('Dispatching toggle event (mobile):', { visible: newState });
            window.dispatchEvent(new CustomEvent('toggle-music-player', { 
              detail: { visible: newState } 
            }));
            // Dispatch interactable state change
            window.dispatchEvent(new CustomEvent(newState ? 'interactable-opened' : 'interactable-closed'));
          }, 50);
        } else if (selectedObject === obj) {
          setSelectedObject(null);
          setShowInfo(false);
          window.dispatchEvent(new CustomEvent('interactable-closed'));
        } else {
          setSelectedObject(obj);
          setShowInfo(true);
          window.dispatchEvent(new CustomEvent('interactable-opened'));
        }
        
        // Provide haptic feedback on successful interaction
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    };
    
    // Listen for mobile-tap events - only set up once
    window.addEventListener('mobile-tap', handleMobileTap);
    
    // Clean up only when component is unmounted
    return () => {
      window.removeEventListener('mobile-tap', handleMobileTap);
    };
  }, [selectedObject, showMusicPlayer, setSelectedObject, setShowInfo, setShowMusicPlayer]); // Dependencies that don't trigger often

  // Add safety check for physics initialization
  useEffect(() => {
    // Small delay to ensure scene is loaded
    setTimeout(() => {
      setPhysicsReady(true);
      document.body.setAttribute('data-physics-ready', 'true');
      console.log('🎮 Physics initialized with safety delay');
      
      // Force dispatch game-fully-initialized if all conditions are met
      const checkAllSystems = () => {
        const physicsReady = document.body.getAttribute('data-physics-ready') === 'true';
        const texturesLoaded = document.body.getAttribute('data-textures-loaded') === 'true';
        const geometriesLoaded = document.body.getAttribute('data-geometries-loaded') === 'true';
        
        if (physicsReady && texturesLoaded && geometriesLoaded) {
          console.log('🎮 All systems ready, dispatching game-fully-initialized');
          // On mobile, ensure controls stay active during initialization
          if ('ontouchstart' in window) {
            window.dispatchEvent(new CustomEvent('preserve-mobile-controls'));
          }
          window.dispatchEvent(new CustomEvent('game-fully-initialized'));
        }
      };
      
      // Check after a short delay to ensure all attributes are set
      setTimeout(checkAllSystems, 100);
    }, 500);
  }, [currentMap, setPhysicsReady]);

  // Track texture loading
  useEffect(() => {
    if (currentScene) {
      let texturesLoaded = true;
      currentScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const material = object.material as THREE.MeshStandardMaterial;
          if (material && 'map' in material && material.map) {
            if (!material.map.image) {
              texturesLoaded = false;
            }
          }
        }
      });
      
      if (texturesLoaded) {
        document.body.setAttribute('data-textures-loaded', 'true');
        console.log('🎮 All textures loaded for:', currentMap);
      }
    }
  }, [currentScene, currentMap]);

  // Track geometry loading
  useEffect(() => {
    if (currentScene) {
      let geometriesLoaded = true;
      currentScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!object.geometry || !object.geometry.attributes.position) {
            geometriesLoaded = false;
          }
        }
      });
      
      if (geometriesLoaded) {
        document.body.setAttribute('data-geometries-loaded', 'true');
        console.log('🎮 All geometries loaded for:', currentMap);
      }
    }
  }, [currentScene, currentMap]);

  // Add this after the other useEffect hooks
  useEffect(() => {
    if (currentMap === 'toris') {
      const CORRECT_POSITION = new THREE.Vector3(-203, -232, 73);
      const MAX_DISTANCE = 50;
      
      // Initial force teleport immediately on map load
      camera.position.copy(CORRECT_POSITION);
      
      // Set up the position forcing function
      const forceCorrectPosition = () => {
        const distance = camera.position.distanceTo(CORRECT_POSITION);
        if (distance > 1) {
          console.log('🎮 Forcing toris position - Distance from correct:', distance);
          camera.position.copy(CORRECT_POSITION);
          
          if (distance > MAX_DISTANCE) {
            window.dispatchEvent(new CustomEvent('reset-player-state'));
          }
        }
      };

      // Run the check every 100ms for exactly 5 seconds
      const interval = setInterval(forceCorrectPosition, 100);
      
      // Clean up after 5 seconds
      const cleanupTimeout = setTimeout(() => {
        console.log('🎮 Stopping toris position enforcement after 5 seconds');
        clearInterval(interval);
      }, 5000);

      // Cleanup function to clear everything if we leave the map early
      return () => {
        console.log('🎮 Cleaning up toris position enforcement');
        clearInterval(interval);
        clearTimeout(cleanupTimeout);
      };
    }
  }, [currentMap]);

  // Listen for trigger-teleport event from mobile slideshows for full teleport experience
  useEffect(() => {
    // Listen for trigger-teleport event from mobile slideshows
    const handleTriggerTeleport = (e: CustomEvent) => {
      if (e.detail && e.detail.targetMap) {
        const targetMap = e.detail.targetMap;
        const fromMap = e.detail.fromMap || currentMap;
        console.log(`🌐 Handling full teleport to ${targetMap} from ${fromMap} with loading screen`);
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        
        // Reset any UI states
        setSelectedObject(null);
        setShowInfo(false);
        
        // Mobile controls management (matches minimap/ImageViewer behavior)
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isMobile) {
          if (targetMap === 'toris') {
            document.body.setAttribute('data-controls-visible', 'false');
            document.body.setAttribute('data-toris-auto-open', 'true');
          } else {
            document.body.setAttribute('data-controls-visible', 'true');
            document.body.setAttribute('data-keep-controls', 'true');
          }
        }
        
        // Trigger map transition event for any listeners
        window.dispatchEvent(new CustomEvent('map-transition', { 
          detail: { from: fromMap, to: targetMap } 
        }));
        
        // Execute the full teleport implementation
        handleTeleport(targetMap);
        
        // Single delayed control reset to avoid interrupting active joystick input
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('reset-controls'));
        }, 1000);
      }
    };

    window.addEventListener('trigger-teleport', handleTriggerTeleport as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('trigger-teleport', handleTriggerTeleport as EventListener);
    };
  }, [handleTeleport, setSelectedObject, setShowInfo]);

  // Listen for teleport-to-central event from MobileToriSlideshow
  useEffect(() => {
    // Listen for teleport-to-central event from MobileToriSlideshow
    const handleTorisReturn = (e: CustomEvent) => {
      const { from, to } = e.detail || { from: '', to: '' };
      
      // Check if we're teleporting from toris, gct, or gallery to central
      if ((currentMap === 'toris' && from === 'toris') || 
          (currentMap === 'gct' && from === 'gct') || 
          (currentMap === 'gallery' && from === 'gallery')) {
        console.log(`🌐 Handling return to central from ${from}`);
        
        // Only proceed if not already transitioning
        if (!isTransitioning) {
          // Start transition
          setTransitioning(true);
          
          // Force fade out
          setFadeOpacity(1);
          
          // Store the current map before changing it
          window.dispatchEvent(new CustomEvent('map-transition', { 
            detail: { from, to: 'central' } 
          }));
          
          // Get the return spawn point for the current map
          const returnSpawn = RETURN_TO_CENTRAL_SPAWN_POINTS[from as keyof typeof RETURN_TO_CENTRAL_SPAWN_POINTS];
          console.log(`🌐 Teleporting FROM ${from} TO central, using spawn point:`, returnSpawn.position);
          
          // Set spawn point for when we arrive in central
          setSpawnPoint('central', {
            position: [...returnSpawn.position] as [number, number, number],
            rotation: [...returnSpawn.rotation] as [number, number, number]
          });
          
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
          }
          
          // Set correct loading video
          useLoadingStore.getState().setCurrentVideo(getVideoUrlForMap('central'));
          useLoadingStore.getState().setLoading(true);
          
          // A brief loading delay
          setTimeout(() => {
            // Change map
            setCurrentMap('central');
            
            // Fade back in after a short delay and clear loading
            setTimeout(() => {
              setFadeOpacity(0);
              setTransitioning(false);
              useLoadingStore.getState().setLoading(false);
              useLoadingStore.getState().setCurrentVideo(null);
              
              // Dispatch map change complete event
              window.dispatchEvent(new CustomEvent('map-change-complete', {
                detail: { map: 'central' }
              }));
            }, 500);
          }, 500);
        }
      }
    };

    window.addEventListener('teleport-to-central', handleTorisReturn as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('teleport-to-central', handleTorisReturn as EventListener);
    };
  }, [currentMap, isTransitioning, setTransitioning, setCurrentMap, setSpawnPoint, setFadeOpacity]);

  // Special handler to force Tori viewer to open if we're already in Toris map
  useEffect(() => {
    // Only run on mobile devices - strict check
    const isMobile = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     document.body.getAttribute('data-is-mobile') === 'true';
                     
    if (!isMobile) {
      console.log('💻 Desktop device - not forcing open Tori viewer');
      return;
    }

    if (currentMap === 'toris') {
      console.log('🔴 Forcing Tori viewer to open on mobile');
      
      // Create a Tori object
      const obj = new THREE.Object3D();
      obj.name = 'TNPR0-100'; // First Tori variant
      
      // Show it
      setSelectedObject(obj);
      setShowInfo(true);
      setForceTorisOpen(true);
      
      // Set flag to prevent accidental closing
      document.body.setAttribute('data-toris-auto-open', 'true');
    }
  }, [currentMap, setSelectedObject, setShowInfo, setForceTorisOpen]);

  // Add immediate invocation of the mobile-entered-toris event when in Toris map
  useEffect(() => {
    // Run once on component mount
    if (currentMap === 'toris') {
      const isMobile = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 || 
                      document.body.getAttribute('data-is-mobile') === 'true';
      
      if (isMobile) {
        console.log('🎮 Initial Toris map load - immediate trigger for viewer on mobile only');
        
        // Set auto-open flag
        document.body.setAttribute('data-toris-auto-open', 'true');
        
        // Trigger multiple times with increasing delays
        window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
        
        setTimeout(() => window.dispatchEvent(new CustomEvent('mobile-entered-toris')), 50);
        setTimeout(() => window.dispatchEvent(new CustomEvent('mobile-entered-toris')), 200);
        setTimeout(() => window.dispatchEvent(new CustomEvent('mobile-entered-toris')), 500);
      } else {
        console.log('💻 Desktop: Toris map loaded - NOT auto-opening viewer');
        // Ensure desktop doesn't have auto-open flag
        document.body.removeAttribute('data-toris-auto-open');
        // Make sure the force flag is also removed
        useInteractionStore.getState().setForceTorisOpen(false);
      }
    }
  }, [currentMap]);

  // Add this effect to set the force open flag when entering Toris map
  useEffect(() => {
    if (currentMap === 'toris') {
      const isMobile = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 || 
                      document.body.getAttribute('data-is-mobile') === 'true';
      
      if (isMobile) {
        console.log('🎮 Setting force open flag for Toris map on mobile');
        setForceTorisOpen(true);
        
        // Clear the flag when leaving Toris map
        return () => {
          setForceTorisOpen(false);
        };
      } else {
        // Make sure desktop doesn't have force open flag
        setForceTorisOpen(false);
        // Also remove the auto-open attribute
        document.body.removeAttribute('data-toris-auto-open');
      }
    }
  }, [currentMap, setForceTorisOpen]);

  // Direct Tori creation when the scene loads
  useEffect(() => {
    if (currentMap === 'toris' && torisScene) {
      console.log('🟢 Toris map and scene loaded');
      
      // Check if mobile
      const isMobile = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       document.body.getAttribute('data-is-mobile') === 'true';
      
      // Only proceed if this is a mobile device
      if (isMobile) {
        console.log('📱 Mobile device detected - showing Tori viewer automatically');
        // Create the Tori object directly
        const toriObj = new THREE.Object3D();
        toriObj.name = 'TNPR0-100'; // First Tori variant
        
        // Show it immediately
        setSelectedObject(toriObj);
        setShowInfo(true);
        setForceTorisOpen(true);
        
        // Set flags to prevent closing
        document.body.setAttribute('data-toris-auto-open', 'true');
        
        // Disable movement
        window.dispatchEvent(new CustomEvent('interactable-opened'));
      } else {
        console.log('💻 Desktop device detected - NOT showing Tori viewer automatically');
        // Ensure desktop doesn't have auto-open flag
        document.body.removeAttribute('data-toris-auto-open');
        // Explicitly set force open to false
        setForceTorisOpen(false);
      }
    }
  }, [currentMap, torisScene, setSelectedObject, setShowInfo, setForceTorisOpen]);



  return (
    <>
      {/* Overworld map */}
      {currentMap === 'overworld' && (
        <>
          <RigidBody 
            type="fixed" 
            colliders="trimesh"
            friction={0}
            restitution={0}
            onColliderAdd={() => {
              useLoadingStore.getState().setPhysicsReady(true);
              console.log('🎮 Overworld map physics initialized');
            }}
          >
            <primitive object={overworldScene!} />
          </RigidBody>
          <GuideNPC playerPosition={playerPosition.current} />
          
          {/* Elevator trigger */}
          <RigidBody type="fixed" sensor>
            <CuboidCollider 
              args={TRIGGER_SIZE} 
              position={ELEVATOR_POSITION}
              sensor
              onIntersectionEnter={() => {
                window.dispatchEvent(new CustomEvent('trigger-teleport', {
                  detail: { targetMap: 'central', fromMap: 'overworld' }
                }));
              }}
            />
          </RigidBody>
        </>
      )}

      {/* Central map */}
      {currentMap === 'central' && (
        <>
          <RigidBody
            type="fixed"
            colliders="trimesh"
            friction={0}
            restitution={0}
            onColliderAdd={() => {
              useLoadingStore.getState().setPhysicsReady(true);
              console.log('🎮 Central map physics initialized');
            }}
          >
            <primitive object={centralScene!} />
          </RigidBody>

          <EnemyManager />

          {/* Return to overworld teleporter */}
          <RigidBody
            type="fixed"
            position={[-92.10, -1.86, -1.13]}
            sensor
            onIntersectionEnter={() => {
              window.dispatchEvent(new CustomEvent('trigger-teleport', {
                detail: { targetMap: 'overworld', fromMap: 'central' }
              }));
            }}
          >
            <CuboidCollider args={[2, 3, 2]} sensor />
          </RigidBody>

          {/* Map teleport triggers */}
          {Object.entries(TELEPORT_TRIGGERS).map(([targetMap, position]) => (
            <RigidBody key={targetMap} type="fixed" sensor>
              <CuboidCollider
                args={TRIGGER_SIZE}
                position={position}
                sensor
                onIntersectionEnter={() => {
                  window.dispatchEvent(new CustomEvent('trigger-teleport', {
                    detail: { targetMap, fromMap: 'central' }
                  }));
                }}
              />
            </RigidBody>
          ))}

          <QRRain />
        </>
      )}

      {/* Other maps */}
      {!['overworld', 'central'].includes(currentMap) && (
        <>
          <RigidBody
            type="fixed"
            colliders={__IS_IOS && ['toris', 'gct'].includes(currentMap) ? 'hull' : 'trimesh'}
            friction={0}
            restitution={0}
            onColliderAdd={() => {
              useLoadingStore.getState().setPhysicsReady(true);
              console.log(`🎮 ${currentMap} map physics initialized`);
            }}
          >
            <primitive object={currentScene!} />
          </RigidBody>

          {/* Return trigger */}
          <RigidBody
            type="fixed"
            sensor
          >
            <CuboidCollider
              args={currentMap === 'gallery' ? GALLERY_RETURN_TRIGGER_SIZE : TRIGGER_SIZE}
              position={RETURN_TELEPORTER_POSITIONS[currentMap as keyof typeof RETURN_TELEPORTER_POSITIONS]}
              sensor
              onIntersectionEnter={() => {
                window.dispatchEvent(new CustomEvent('trigger-teleport', {
                  detail: { targetMap: 'central', fromMap: currentMap }
                }));
              }}
            />
          </RigidBody>

          {currentMap === 'gct' && <Staircase />}
          {currentMap === 'toris' && (
            <>
              <Ramp />
              <Stage />
            </>
          )}
        </>
      )}

      <ShootingEffects />
      <ProjectileSystem />
      <ProjectileManager />

      {/* Fade overlay - only render when visible to avoid WebGL overhead on iOS */}
      {isTransitioning && fadeOpacity > 0 && (
        <mesh position={[0, 0, -1]} renderOrder={9999}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial 
            color="black" 
            transparent 
            opacity={fadeOpacity}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Encava spinning model for BTR map activator */}
      <SpinningModelOverlay targetObjectName="Plane__0024" />
    </>
  );
} 