import { create } from 'zustand'

interface GameState {
  isReady: boolean
  setReady: (v: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  isReady: false,
  setReady: (v) => set({ isReady: v }),
}))
