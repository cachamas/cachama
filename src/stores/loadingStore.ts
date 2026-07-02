import { create } from 'zustand';
import { useGLTF } from '@react-three/drei';

interface LoadingState {
  isLoading: boolean;
  isPhysicsReady: boolean;
  currentVideo: string | null;
  loadedMaps: Set<string>;
  setLoading: (loading: boolean) => void;
  setPhysicsReady: (ready: boolean) => void;
  setCurrentVideo: (video: string | null) => void;
  handleMapChange: (mapName: string) => Promise<void>;
  preloadMap: (mapName: string) => Promise<void>;
  texturesLoaded: boolean;
  setTexturesLoaded: (loaded: boolean) => void;
  geometriesLoaded: boolean;
  setGeometriesLoaded: (loaded: boolean) => void;
  isMapFullyReady: boolean;
  setMapFullyReady: (ready: boolean) => void;
  sceneStable: boolean;
  setSceneStable: (stable: boolean) => void;
  playerSpawned: boolean;
  setPlayerSpawned: (spawned: boolean) => void;
  checkMapReady: () => boolean;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  isLoading: true,
  isPhysicsReady: false,
  currentVideo: null,
  loadedMaps: new Set(['central']), // Start with central map loaded
  texturesLoaded: false,
  geometriesLoaded: false,
  isMapFullyReady: false,
  sceneStable: false,
  playerSpawned: false,
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setPhysicsReady: (ready: boolean) => set({ isPhysicsReady: ready }),
  setCurrentVideo: (video: string | null) => {
    set({ currentVideo: video });
  },
  setTexturesLoaded: (loaded: boolean) => set({ texturesLoaded: loaded }),
  setGeometriesLoaded: (loaded: boolean) => set({ geometriesLoaded: loaded }),
  setMapFullyReady: (ready: boolean) => set({ isMapFullyReady: ready }),
  setSceneStable: (stable: boolean) => set({ sceneStable: stable }),
  setPlayerSpawned: (spawned: boolean) => set({ playerSpawned: spawned }),
  
  checkMapReady: () => {
    const state = get();
    return state.isMapFullyReady && 
           state.isPhysicsReady && 
           state.texturesLoaded && 
           state.geometriesLoaded && 
           state.sceneStable &&
           state.playerSpawned;
  },
  
  preloadMap: async (mapName: string) => {
    const store = get();
    if (store.loadedMaps.has(mapName)) return;

    try {
      // Reset loading states
      set({ 
        texturesLoaded: false,
        geometriesLoaded: false,
        isPhysicsReady: false,
        isMapFullyReady: false,
        sceneStable: false
      });

      // Load the map
      await useGLTF.preload(`/models/${mapName}.glb`);
      set(state => ({
        loadedMaps: new Set([...state.loadedMaps, mapName])
      }));

      // Set geometries as loaded after GLB loads
      set({ geometriesLoaded: true });
    } catch (error) {
      console.error(`Failed to preload map: ${mapName}`, error);
    }
  },

  handleMapChange: async (mapName: string) => {
    const store = get();
    store.setLoading(true);

    // Reset loading states
    set({ 
      texturesLoaded: false,
      geometriesLoaded: false,
      isPhysicsReady: false,
      isMapFullyReady: false,
      sceneStable: false,
      playerSpawned: false
    });

    try {
      // Load the map GLB if not already loaded
      if (!store.loadedMaps.has(mapName)) {
        await store.preloadMap(mapName);
      }

      // Wait for physics colliders to be ready (RigidBody onColliderAdd)
      await new Promise<void>((resolve) => {
        const checkPhysics = () => {
          if (get().isPhysicsReady) {
            resolve();
          } else {
            setTimeout(checkPhysics, 100);
          }
        };
        checkPhysics();
      });

      // Wait for player to fully spawn and confirm position
      await new Promise<void>((resolve) => {
        const checkPlayerSpawn = () => {
          if (get().playerSpawned) {
            resolve();
          } else {
            setTimeout(checkPlayerSpawn, 100);
          }
        };
        checkPlayerSpawn();
      });

      // Small settling delay then clear loading
      setTimeout(() => {
        store.setLoading(false);
      }, 500);
    } catch (error) {
      console.error(`Failed to load map: ${mapName}`, error);
      setTimeout(() => {
        store.setLoading(false);
      }, 1000);
    }
  }
}));

// Listen for player spawn completion to update loading state
if (typeof window !== 'undefined') {
  window.addEventListener('player-spawn-complete', () => {
    useLoadingStore.getState().setPlayerSpawned(true);
  });
}

export type { LoadingState };