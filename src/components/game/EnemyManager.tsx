import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../lib/gameStore';
import { Enemy } from './Enemy';
import { v4 as uuidv4 } from 'uuid';

// Define spawn points in Central
const CENTRAL_SPAWN_POINTS = [
  { position: new THREE.Vector3(-28, -4, 33), modelIndex: 0 as const },   // New Enemy
  { position: new THREE.Vector3(-29, -8, -34), modelIndex: 1 as const },  // Enemy 2
  { position: new THREE.Vector3(34, -8, -29), modelIndex: 2 as const },   // Enemy 3
  { position: new THREE.Vector3(41, -8, 36), modelIndex: 3 as const }     // Enemy 4
] as const;

type SpawnPoint = typeof CENTRAL_SPAWN_POINTS[number];
type ModelIndex = 0 | 1 | 2 | 3;

export function EnemyManager() {
  const { camera } = useThree();
  const addEnemy = useGameStore(state => state.addEnemy);
  const enemies = useGameStore(state => state.enemies);
  const currentMap = useGameStore(state => state.currentMap);
  const spawnedModels = useRef(new Set<ModelIndex>());

  // Function to spawn a specific enemy
  const spawnEnemy = (spawnPoint: SpawnPoint) => {
    // Check if this model is already spawned
    if (spawnedModels.current.has(spawnPoint.modelIndex)) {
      return;
    }

    const enemyId = uuidv4();
    addEnemy({
      id: enemyId,
      position: spawnPoint.position,
      health: 100,
      state: 'patrol',
      modelIndex: spawnPoint.modelIndex
    });

    spawnedModels.current.add(spawnPoint.modelIndex);
  };

  // Handle automatic spawning in Central
  useEffect(() => {
    if (currentMap === 'central') {
      // Clear any existing spawned models tracking
      spawnedModels.current.clear();
      
      // Wait a couple seconds before spawning
      const spawnTimeout = setTimeout(() => {
        CENTRAL_SPAWN_POINTS.forEach(spawnPoint => {
          spawnEnemy(spawnPoint);
        });
      }, 2000); // 2 second delay

      return () => {
        clearTimeout(spawnTimeout);
        spawnedModels.current.clear();
      };
    }
  }, [currentMap, addEnemy]);

  // Handle manual spawning with P key (for testing)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyP') {
        const position = new THREE.Vector3();
        camera.getWorldPosition(position);
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const spawnPosition = position.clone().add(direction.multiplyScalar(5));
        
        // Find first available model index
        let availableIndex: ModelIndex = 0;
        while (spawnedModels.current.has(availableIndex) && availableIndex < 4) {
          availableIndex = ((availableIndex + 1) % 4) as ModelIndex;
        }
        
        if (!spawnedModels.current.has(availableIndex)) {
          spawnEnemy({
            position: spawnPosition,
            modelIndex: availableIndex
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, addEnemy]);

  // Clean up enemies when leaving Central
  useEffect(() => {
    if (currentMap !== 'central') {
      spawnedModels.current.clear();
    }
  }, [currentMap]);

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          id={enemy.id}
          position={new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z)}
          modelIndex={enemy.modelIndex}
        />
      ))}
    </>
  );
} 