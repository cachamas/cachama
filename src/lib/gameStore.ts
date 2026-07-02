import { create } from 'zustand';
import * as THREE from 'three';

interface Enemy {
  id: string;
  position: { x: number; y: number; z: number };
  modelIndex: number;
  health?: number;
  state?: string;
}

interface GameState {
  enemies: Enemy[];
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  updateEnemy: (id: string, updates: Partial<Enemy>) => void;
  health: number;
  maxHealth: number;
  lastDamageTime: number;
  hitCount: number;
  damageEffect: number; // 0-1 for red screen effect
  isRegenerating: boolean;
  score: number;
  setHealth: (health: number) => void;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  takeDamage: (damage: number) => boolean;
  resetGame: () => void;
  clearEnemies: () => void;
  currentMap: string;
  setCurrentMap: (map: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  enemies: [],
  addEnemy: (enemy) => set((state) => ({ enemies: [...state.enemies, enemy] })),
  removeEnemy: (id) => set((state) => ({ enemies: state.enemies.filter(e => e.id !== id) })),
  updateEnemy: (id, updates) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, ...updates } : enemy
    )
  })),
  health: 100,
  maxHealth: 100,
  lastDamageTime: 0,
  hitCount: 0,
  damageEffect: 0,
  isRegenerating: false,
  score: 0,
  currentMap: 'central',

  setHealth: (health) => set({ health }),
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  setCurrentMap: (map) => set({ currentMap: map }),
  
  takeDamage: (damage) => {
    const currentTime = Date.now();
    const state = get();
    
    // Reset hit count if more than 2 seconds since last hit
    const hitCount = currentTime - state.lastDamageTime > 2000 ? 1 : state.hitCount + 1;
    
    // Increase damage effect based on hit count
    const damageEffect = Math.min(1, hitCount * 0.2); // 20% red per hit, max 100%
    
    const newHealth = Math.max(0, state.health - damage);
    
    set({
      health: newHealth,
      lastDamageTime: currentTime,
      hitCount,
      damageEffect,
      isRegenerating: false
    });

    return newHealth <= 0; // Return true if dead
  },

  resetGame: () => set({
    health: 100,
    maxHealth: 100,
    lastDamageTime: 0,
    hitCount: 0,
    damageEffect: 0,
    isRegenerating: false,
    score: 0
  }),

  clearEnemies: () => set({ enemies: [] })
}));

// Start health regeneration system
setInterval(() => {
  const state = useGameStore.getState();
  const currentTime = Date.now();
  
  // Start regenerating 3 seconds after last damage
  if (currentTime - state.lastDamageTime > 3000 && state.health < state.maxHealth) {
    useGameStore.setState({
      health: Math.min(state.maxHealth, state.health + 2), // Regenerate 2 health per 100ms
      damageEffect: Math.max(0, state.damageEffect - 0.1), // Fade out red effect
      isRegenerating: true
    });
  }
}, 100); // Update every 100ms 