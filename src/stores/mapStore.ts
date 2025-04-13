import { create } from 'zustand';

interface MapState {
  currentMap: string;
  isTransitioning: boolean;
  spawnPoints: Record<string, [number, number, number]>;
  setCurrentMap: (map: string) => void;
  setIsTransitioning: (isTransitioning: boolean) => void;
  setSpawnPoint: (map: string, point: [number, number, number]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentMap: '',
  isTransitioning: false,
  spawnPoints: {},
  setCurrentMap: (map) => set({ currentMap: map }),
  setIsTransitioning: (isTransitioning) => set({ isTransitioning }),
  setSpawnPoint: (map, point) => set((state) => ({
    spawnPoints: {
      ...state.spawnPoints,
      [map]: point
    }
  }))
})); 