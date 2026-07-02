import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

// Constants for cube behavior
const SPAWN_POINT = new THREE.Vector3(-15, 30, -5);
const CUBE_SIZE = 1.44;
const BASE_VELOCITY = -15;
const SPAWN_INTERVAL = 250; // Spawn every 250ms (twice as fast)
const MAX_CUBES = 8; // Allow more cubes
const CUBE_LIFETIME = 2000; // 2 seconds lifetime

export function QRRain() {
  const { scene } = useThree();
  const { world } = useRapier();
  const textureRef = useRef<THREE.Texture | null>(null);
  const nextSpawnTime = useRef(0);
  const cubeRefs = useRef<Array<{ mesh: THREE.Mesh, body: any, spawnTime: number }>>([]);
  const isComponentMounted = useRef(true);

  // Load texture once
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/images/qr.webp', (texture) => {
      if (isComponentMounted.current) {
        texture.flipY = false;
        textureRef.current = texture;
      }
    });

    return () => {
      isComponentMounted.current = false;
      // Clean up all cubes
      cubeRefs.current.forEach(({ mesh, body }) => {
        if (body && body.raw) {
          world.removeRigidBody(body.raw);
        }
        if (mesh && mesh.parent) {
          mesh.parent.remove(mesh);
        }
      });
      cubeRefs.current = [];
    };
  }, [world]);

  useFrame((state) => {
    if (!isComponentMounted.current || !textureRef.current) return;

    const currentTime = state.clock.getElapsedTime() * 1000;

    // Spawn new cube if we haven't hit the limit
    if (currentTime >= nextSpawnTime.current && cubeRefs.current.length < MAX_CUBES) {
      // Create mesh
      const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      const material = new THREE.MeshStandardMaterial({
        map: textureRef.current,
        emissive: '#ffffff',
        emissiveMap: textureRef.current,
        emissiveIntensity: 0.6
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add slight position variation to prevent stacking
      const spawnPos = SPAWN_POINT.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        )
      );
      mesh.position.copy(spawnPos);
      scene.add(mesh);

      // Create rigid body with correct Rapier types
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
        .setLinvel(0, BASE_VELOCITY, 0)
        .setAngvel({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 })
        .setGravityScale(1.5);

      const rigidBody = world.createRigidBody(rigidBodyDesc);

      // Create collider with correct Rapier types
      const colliderDesc = RAPIER.ColliderDesc.cuboid(CUBE_SIZE/2, CUBE_SIZE/2, CUBE_SIZE/2)
        .setRestitution(0.4)
        .setFriction(0.5);

      world.createCollider(colliderDesc, rigidBody);

      // Store references with spawn time
      cubeRefs.current.push({ 
        mesh, 
        body: rigidBody, 
        spawnTime: currentTime 
      });
      
      // Set next spawn time
      nextSpawnTime.current = currentTime + SPAWN_INTERVAL;
    }

    // Update mesh positions and remove old cubes
    cubeRefs.current = cubeRefs.current.filter((cube) => {
      const position = cube.body.translation();
      cube.mesh.position.set(position.x, position.y, position.z);
      
      const rotation = cube.body.rotation();
      cube.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      // Remove if lifetime exceeded or too low
      const age = currentTime - cube.spawnTime;
      if (age > CUBE_LIFETIME || position.y < -10) {
        world.removeRigidBody(cube.body);
        scene.remove(cube.mesh);
        return false;
      }
      return true;
    });
  });

  return (
    <CuboidCollider
      position={[0, 0, 0]}
      args={[50, 0.1, 50]}
      sensor
    />
  );
} 