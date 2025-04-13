import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { Group } from 'three';

const START_POSITION = new THREE.Vector3(28.31, 260.79, 44.41);
const TARGET_POSITION = new THREE.Vector3(73.37, 267.35, 15.94);
const ACTIVATION_DISTANCE = 15;
const AVOIDANCE_DISTANCE = 8;
const NPC_SCALE = 0.33;
const ROTATION_SMOOTHING = 0.1;
const SPEED_MULTIPLIER = 1.2; // Multiplier to make NPC slightly faster than player

export function GuideNPC({ playerPosition }: { playerPosition: THREE.Vector3 }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF('/models/enemy4.glb');
  const { actions } = useAnimations(animations, group);
  const currentPosition = useRef(START_POSITION.clone());
  const targetPosition = useRef(START_POSITION.clone());
  const lastPlayerPos = useRef(playerPosition.clone());
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    if (actions['rumba']) {
      actions['rumba'].reset().play();
      actions['rumba'].repetitions = Infinity;
    }
  }, [actions]);

  useFrame(() => {
    if (!group.current) return;

    group.current.scale.set(NPC_SCALE, NPC_SCALE, NPC_SCALE);

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
    lastUpdateTime.current = currentTime;

    // Calculate player velocity and speed
    const playerVelocity = playerPosition.clone().sub(lastPlayerPos.current);
    const playerSpeed = playerVelocity.length() / deltaTime; // Units per second
    lastPlayerPos.current.copy(playerPosition);

    // Calculate distances
    const distanceToPlayer = currentPosition.current.distanceTo(playerPosition);
    const distanceToTarget = currentPosition.current.distanceTo(targetPosition.current);

    // Calculate movement vector
    let moveVector = new THREE.Vector3();

    if (distanceToPlayer <= ACTIVATION_DISTANCE) {
      // Calculate avoidance direction (away from player)
      const avoidanceDirection = currentPosition.current.clone()
        .sub(playerPosition)
        .normalize();

      // Calculate path direction (towards target)
      const pathDirection = targetPosition.current.clone()
        .sub(currentPosition.current)
        .normalize();

      // Blend between avoidance and path following based on player distance
      const avoidanceWeight = Math.max(0, 1 - (distanceToPlayer / ACTIVATION_DISTANCE));
      const pathWeight = 1 - avoidanceWeight;

      // Combine directions
      moveVector.addScaledVector(avoidanceDirection, avoidanceWeight);
      moveVector.addScaledVector(pathDirection, pathWeight);
      moveVector.normalize();

      // Calculate speed based on player's speed and distance
      let speed = playerSpeed * SPEED_MULTIPLIER;
      
      // Increase speed when player is too close
      if (distanceToPlayer < AVOIDANCE_DISTANCE) {
        const urgencyFactor = 1 + (AVOIDANCE_DISTANCE - distanceToPlayer) / AVOIDANCE_DISTANCE;
        speed *= urgencyFactor;
      }

      // Apply movement
      if (distanceToTarget > 0.1) {
        moveVector.multiplyScalar(speed * deltaTime);
        currentPosition.current.add(moveVector);
        group.current.position.copy(currentPosition.current);
      } else {
        // Switch target when close enough
        if (targetPosition.current.equals(START_POSITION)) {
          targetPosition.current.copy(TARGET_POSITION);
        } else {
          targetPosition.current.copy(START_POSITION);
        }
      }
    }

    // Face movement direction with smooth rotation
    if (moveVector.length() > 0.001) {
      const targetAngle = Math.atan2(moveVector.x, moveVector.z);
      const currentAngle = group.current.rotation.y;
      const angleDiff = ((targetAngle - currentAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
      group.current.rotation.y += angleDiff * ROTATION_SMOOTHING;
    } else {
      // When not moving, face the player
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, currentPosition.current)
        .setY(0)
        .normalize();
      const targetAngle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      const currentAngle = group.current.rotation.y;
      const angleDiff = ((targetAngle - currentAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
      group.current.rotation.y += angleDiff * ROTATION_SMOOTHING;
    }
  });

  return (
    <group ref={group} position={START_POSITION.toArray()}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/enemy4.glb'); 