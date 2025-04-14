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
  getVideoForMap: (mapName: string) => string;
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
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setPhysicsReady: (ready: boolean) => set({ isPhysicsReady: ready }),
  setCurrentVideo: (video: string | null) => {
    // Previous video reference for cleanup
    const prevVideo = get().currentVideo;
    
    // Set the new video
    set({ currentVideo: video });
    
    // If we have a video, preload it immediately
    if (video) {
      console.log(`🎥 Preloading video: ${video}`);
      
      // Create a temporary video element for preloading
      const preloadVideo = document.createElement('video');
      preloadVideo.src = `/videos/${video}`;
      preloadVideo.preload = 'auto';
      preloadVideo.muted = true;
      
      // Attempt to load and buffer the video quickly
      preloadVideo.load();
      
      // Try to prefetch and buffer the video with high priority
      if ('fetchPriority' in HTMLVideoElement.prototype) {
        try {
          // @ts-ignore - Not all browsers support this
          preloadVideo.fetchPriority = 'high';
        } catch (e) {
          console.warn('Browser does not support fetchPriority');
        }
      }
      
      // Store reference to prevent garbage collection
      (window as any).__preloadedCurrentVideo = preloadVideo;
      
      // Clean up previous preloaded video if different
      if (prevVideo && prevVideo !== video) {
        setTimeout(() => {
          // Allow time for the new video to be used before cleaning up the old one
          (window as any).__preloadedPreviousVideo = (window as any).__preloadedCurrentVideo;
        }, 5000);
      }
    }
  },
  setTexturesLoaded: (loaded: boolean) => set({ texturesLoaded: loaded }),
  setGeometriesLoaded: (loaded: boolean) => set({ geometriesLoaded: loaded }),
  setMapFullyReady: (ready: boolean) => set({ isMapFullyReady: ready }),
  setSceneStable: (stable: boolean) => set({ sceneStable: stable }),
  
  checkMapReady: () => {
    const state = get();
    return state.isMapFullyReady && 
           state.isPhysicsReady && 
           state.texturesLoaded && 
           state.geometriesLoaded && 
           state.sceneStable;
  },
  
  getVideoForMap: (mapName: string) => {
    const videoMap: { [key: string]: string } = {
      'overworld': 'overworld.mp4',
      'central': 'central.mp4',
      'gallery': 'gallery.mp4',
      'gct': 'gct.mp4',
      'music': 'music.mp4',
      'toris': 'toris.mp4'
    };
    
    return videoMap[mapName] || 'overworld.mp4';
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
    const correctVideo = store.getVideoForMap(mapName);
    
    // Ensure we're showing the correct video for this map
    if (store.currentVideo !== correctVideo) {
      store.setCurrentVideo(correctVideo);
    }
    
    store.setLoading(true);
    
    // Reset all loading states
    set({ 
      texturesLoaded: false,
      geometriesLoaded: false,
      isPhysicsReady: false,
      isMapFullyReady: false,
      sceneStable: false
    });

    try {
      // Load the map if not already loaded
      if (!store.loadedMaps.has(mapName)) {
        await store.preloadMap(mapName);
      }

      // Wait for physics to be ready
      await new Promise<void>((resolve) => {
        const checkPhysics = () => {
          if (get().isPhysicsReady) {
            // When physics is ready, wait a bit before marking scene as stable
            setTimeout(() => {
              set({ sceneStable: true });
            }, 500); // Small delay for physics to settle
            resolve();
          } else {
            setTimeout(checkPhysics, 100);
          }
        };
        checkPhysics();
      });

      // Wait for textures to be loaded
      await new Promise<void>((resolve) => {
        const checkTextures = () => {
          if (get().texturesLoaded) {
            resolve();
          } else {
            setTimeout(checkTextures, 100);
          }
        };
        checkTextures();
      });

      // Wait for geometries to be loaded
      await new Promise<void>((resolve) => {
        const checkGeometries = () => {
          if (get().geometriesLoaded) {
            resolve();
          } else {
            setTimeout(checkGeometries, 100);
          }
        };
        checkGeometries();
      });

      // Double check we still have the correct video playing
      const finalVideo = store.getVideoForMap(mapName);
      if (get().currentVideo !== finalVideo) {
        store.setCurrentVideo(finalVideo);
      }

      // Set map as fully ready once all conditions are met
      set({ isMapFullyReady: true });

      // Only set loading to false if everything is ready
      if (get().checkMapReady()) {
        store.setLoading(false);
      } else {
        console.warn('Map not fully ready, keeping loading screen...');
        // Retry the map change
        await store.handleMapChange(mapName);
      }
    } catch (error) {
      console.error(`Failed to load map: ${mapName}`, error);
      // On error, keep loading screen and retry
      await store.handleMapChange(mapName);
    }
  }
}));

export type { LoadingState };