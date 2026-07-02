import { create } from 'zustand';
import * as THREE from 'three';

interface InteractionStore {
  selectedObject: THREE.Object3D | null;
  setSelectedObject: (object: THREE.Object3D | null) => void;
  hoveredObject: THREE.Object3D | null;
  setHoveredObject: (object: THREE.Object3D | null) => void;
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
  isForceTorisOpen: boolean;
  setForceTorisOpen: (force: boolean) => void;
  reset: () => void;
}

export const useInteractionStore = create<InteractionStore>((set) => ({
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),
  hoveredObject: null,
  setHoveredObject: (object) => set({ hoveredObject: object }),
  showInfo: false,
  setShowInfo: (show) => set({ showInfo: show }),
  isForceTorisOpen: false,
  setForceTorisOpen: (force) => set({ isForceTorisOpen: force }),
  reset: () => set({ 
    hoveredObject: null, 
    selectedObject: null, 
    showInfo: false,
  }),
})); 