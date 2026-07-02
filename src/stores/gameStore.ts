import { create } from 'zustand';
import * as THREE from 'three';

export interface Enemy {
  id: string;
  position: THREE.Vector3;
  health: number;
  state: string;
}

interface GameState {
  enemies: Enemy[];
  updateEnemy: (id: string, updatedEnemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  addEnemy: (enemy: Enemy) => void;
  takeDamage: (amount: number) => void;
  playerHealth: number;
}

export const useGameStore = create<GameState>((set) => ({
  enemies: [],
  playerHealth: 100,
  
  updateEnemy: (id, updatedEnemy) => set((state) => ({
    enemies: state.enemies.map((enemy) =>
      enemy.id === id ? updatedEnemy : enemy
    ),
  })),
  
  removeEnemy: (id) => set((state) => ({
    enemies: state.enemies.filter((enemy) => enemy.id !== id),
  })),
  
  addEnemy: (enemy) => set((state) => ({
    enemies: [...state.enemies, enemy],
  })),
  
  takeDamage: (amount) => set((state) => ({
    playerHealth: Math.max(0, state.playerHealth - amount),
  })),
})); 