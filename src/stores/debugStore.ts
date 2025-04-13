import { create } from 'zustand';

interface DebugStore {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
}

export const useDebugStore = create<DebugStore>((set) => ({
  isDebugMode: false,
  toggleDebugMode: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
}));

// Debug logging utility
export function debugLog(category: string, message: string, data?: any) {
  const isDebugMode = useDebugStore.getState().isDebugMode;
  if (!isDebugMode) return;
  
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${timestamp}] [${category}]`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
} 