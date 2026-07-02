import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { EnemyProjectile } from './EnemyProjectile';
import { create } from 'zustand';

interface Projectile {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
}

interface ProjectileStore {
  projectiles: Projectile[];
  addProjectile: (projectile: Projectile) => void;
  removeProjectile: (id: string) => void;
}

const useProjectileStore = create<ProjectileStore>((set) => ({
  projectiles: [],
  addProjectile: (projectile) => 
    set((state) => ({
      projectiles: [...state.projectiles, projectile]
    })),
  removeProjectile: (id) =>
    set((state) => ({
      projectiles: state.projectiles.filter((p) => p.id !== id)
    }))
}));

export function ProjectileManager() {
  const { projectiles, removeProjectile } = useProjectileStore();

  const handleProjectileHit = useCallback((id: string) => {
    removeProjectile(id);
  }, [removeProjectile]);

  return (
    <>
      {projectiles.map((projectile) => (
        <EnemyProjectile
          key={projectile.id}
          position={projectile.position}
          direction={projectile.direction}
          speed={projectile.speed}
          damage={projectile.damage}
          onHit={() => handleProjectileHit(projectile.id)}
        />
      ))}
    </>
  );
}

// Export the store for use in other components
export { useProjectileStore }; 