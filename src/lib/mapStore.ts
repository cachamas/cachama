import { create } from 'zustand';
import { useLoadingStore } from '../stores/loadingStore';
import { useAudioStore } from '../stores/audioStore';

interface MapState {
  currentMap: string;
  setCurrentMap: (map: string) => void;
  isTransitioning: boolean;
  setTransitioning: (state: boolean) => void;
  spawnPoints: {
    [key: string]: {
      position: [number, number, number];
      rotation: [number, number, number];
    };
  };
  setSpawnPoint: (map: string, data: { position: [number, number, number], rotation: [number, number, number] }) => void;
  handleMapTransition: (newMap: string) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  currentMap: 'central',
  setCurrentMap: (map) => set({ currentMap: map }),
  isTransitioning: false,
  setTransitioning: (state) => set({ isTransitioning: state }),
  spawnPoints: {
    overworld: {
      position: [-11.28, 262.44, 79.57],
      rotation: [43.48 - 26.48, -43.02 + 25.28, 0]
    },
    central: {
      position: [-85.41, -2.66, -0.43],
      rotation: [18.22, 269.36, 0]
    },
    gallery: {
      position: [112.01, 7.31, 4.09],
      rotation: [23.14, 64.62 + 180, 0]
    },
    music: {
      position: [8.66, 43.61, -47.84],
      rotation: [11.75, 130.87 + 180, 0]
    },
    toris: {
      position: [-203, -232, 73],
      rotation: [-3.12, 45.85 + 180, 0]
    },
    gct: {
      position: [-69.17, 45.98, -2.94],
      rotation: [15.82, 270.28 + 180, 0]
    }
  },
  setSpawnPoint: (map, data) => set((state) => ({
    ...state,
    spawnPoints: {
      ...state.spawnPoints,
      [map]: {
        position: [...data.position] as [number, number, number],
        rotation: [...data.rotation] as [number, number, number]
      }
    }
  })),
  handleMapTransition: (newMap: string) => {
    const state = get();
    if (state.currentMap === newMap) return;

    // Clear any active highlights before transition
    window.dispatchEvent(new CustomEvent('clear-highlights'));
    
    // Start transition
    state.setTransitioning(true);
    
    // Trigger loading screen and wait for map to load
    useLoadingStore.getState().handleMapChange(newMap).then(() => {
      // Update map after loading is complete and physics is ready
      if (useLoadingStore.getState().isPhysicsReady) {
        state.setCurrentMap(newMap);
        state.setTransitioning(false);
      } else {
        console.error('Physics not ready after map load, retrying...');
        // Retry the transition
        setTimeout(() => state.handleMapTransition(newMap), 500);
      }
    }).catch(error => {
      console.error('Failed to change map:', error);
      state.setTransitioning(false);
    });
  }
}));