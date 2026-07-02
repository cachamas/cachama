import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { create } from 'zustand';
import { useProjectileStore } from '../effects/ProjectileManager';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../../lib/gameStore';
import { debugLog } from '../../stores/debugStore';

interface EnemyProps {
  id: string;
  position: THREE.Vector3;
  modelIndex?: 0 | 1 | 2 | 3 | number;
  onDeath?: () => void;
}

interface EnemyUserData {
  type: string;
  id: string;
  health: number;
}

const DEBUG = true;
const SHOWCASE_MODE = false; // Disable showcase mode
const ANIMATION_DURATION = 3; // Seconds to show each animation
const CHASE_DISTANCE = 15;
const ATTACK_DISTANCE = 5;
const MOVE_SPEED = 3;
const MAX_HEALTH = 100;
const SHOOT_DAMAGE = 10;

// Define state type more precisely
const STATES = {
  IDLE: 'IDLE',
  PATROL: 'PATROL',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  COVER: 'COVER',
  STRAFE: 'STRAFE',
  RETREAT: 'RETREAT',
  DEATH: 'DEATH'
} as const;

type EnemyState = (typeof STATES)[keyof typeof STATES];

// Combat configuration
const COMBAT_CONFIG = {
  ATTACK_DISTANCE: 15,      // Increased from previous value
  RETREAT_DISTANCE: 8,      // Distance at which enemy will retreat
  BURST_DURATION: 0.3,      // Shorter bursts for more dynamic combat
  BURST_COOLDOWN: 800,      // Reduced cooldown between bursts
  STATE_DEBOUNCE: 500,      // Faster state changes
  STRAFE_DURATION: 1.5,     // Shorter strafe duration for more direction changes
  PATROL_RADIUS: 10,        // Larger patrol radius
  RETREAT_SPEED: 2.5,       // Faster retreat speed
  DAMAGE: 10,              // Keep damage the same
  OPTIMAL_RANGE: {
    MIN: 8,               // Closer minimum range
    MAX: 20              // Larger maximum range for more movement
  }
} as const;

// Animation mappings for states
const STATE_ANIMATIONS: Record<EnemyState, string> = {
  [STATES.IDLE]: 'rifleidle',
  [STATES.PATROL]: 'riflewalk',
  [STATES.CHASE]: 'runforward',
  [STATES.ATTACK]: 'rifleaimingidle',
  [STATES.COVER]: 'steppingbackwards',
  [STATES.STRAFE]: 'strafing',
  [STATES.RETREAT]: 'sprintbackwards',
  [STATES.DEATH]: 'dying'
} as const;

// Add animation name validation - updated to be case-insensitive and remove duplicates
const VALID_ANIMATIONS = new Set([
  'CWALK',
  'DEATHFROMRIGHT',
  'dying',
  'firingrifle',
  'jumpingdown',
  'jumpup',
  'reload',
  'rifleaimingidle',
  'rifleidle',
  'rifleruntostop',
  'rifleturn',
  'riflewalk',
  'rumba',
  'runforward',
  'shootrifle',
  'sprintbackwards',
  'steppingbackwards',
  'straferightstop',
  'strafing',
  'walkleft'
].map(name => name.toLowerCase()));

// Enemy store to track health and state
interface EnemyStore {
  health: { [key: string]: number };
  updateHealth: (id: string, damage: number) => void;
}

const useEnemyStore = create<EnemyStore>((set) => ({
  health: {},
  updateHealth: (id, damage) => 
    set((state) => {
      const currentHealth = state.health[id] ?? MAX_HEALTH;
      const newHealth = Math.max(0, currentHealth - damage);
      return { 
        health: { 
          ...state.health, 
          [id]: newHealth 
        } 
      };
    })
}));

const ENEMY_MODELS = [
  '/models/enemy.glb',
  '/models/enemy3.glb',
  '/models/enemy4.glb',
  '/models/enemy5.glb'
];

function getRandomModel() {
  return ENEMY_MODELS[Math.floor(Math.random() * ENEMY_MODELS.length)];
}

// Preload all models
ENEMY_MODELS.forEach(model => useGLTF.preload(model));

// Add animation speed configuration
const ANIMATION_SPEEDS = {
  riflewalk: 4,      // Doubled walk speed
  runforward: 8,     // Doubled run speed
  sprintbackwards: 6,// Doubled backwards speed
  strafing: 4,       // Doubled strafe speed
} as const;

// Update movement configuration
const MOVEMENT_CONFIG = {
  animations: {
    riflewalk: { canMove: true, speed: 12, type: 'forward' },     // Doubled movement speed
    runforward: { canMove: true, speed: 24, type: 'forward' },    // Doubled movement speed
    sprintbackwards: { canMove: true, speed: 18, type: 'backward' }, // Doubled movement speed
    strafing: { canMove: true, speed: 12, type: 'strafe', matchDirection: true }, // Doubled movement speed
    rifleidle: { canMove: false },
    rifleaimingidle: { canMove: false },
    shootrifle: { canMove: false },
    dying: { canMove: false },
    steppingbackwards: { canMove: true, speed: 9, type: 'backward' } // Doubled movement speed
  }
} as const;

const GUIDE_CONFIG = {
  START_POS: { x: 52.99, y: 259.40, z: 37.06 },
  TARGET_POS: { x: 58.38, y: 268.52, z: -10.21 },
  MIN_DISTANCE: 10, // Minimum distance to keep from player
  MOVE_SPEED: 2,    // Movement speed when retreating
  MODEL_PATH: '/models/enemy4.glb'
};

const CAN_SCALE = 3.24; // 20% bigger cans (2.7 * 1.2)
const CHASE_SPEED = 15; // Increased from previous value for better pursuit
const OPTIMAL_RANGE = {
  MIN: 8,
  MAX: 12 // Reduced to make enemy more aggressive
};

// Add rotation smoothing configuration
const ROTATION_SMOOTHING = 0.15; // Lower = smoother rotation
const MIN_ROTATION_THRESHOLD = 0.1; // Minimum angle change to rotate

export function Enemy({ id, position, modelIndex = 0, onDeath, isGuide = false }: EnemyProps & { isGuide?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<any>(null);
  const lastStateChange = useRef<number>(Date.now());
  const currentRotation = useRef<number>(0);
  const [state, setState] = useState<EnemyState>(STATES.PATROL);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const lastShotTime = useRef<number>(0);
  const strafeDirection = useRef<1 | -1>(1);
  const strafeTimer = useRef<number>(0);
  const patrolAngle = useRef<number>(0);
  const distanceToPlayerRef = useRef<number>(0);
  const lastDistanceRef = useRef<number>(0);
  const animSpeedRef = useRef<number>(1);
  const isDying = useRef<boolean>(false);
  
  // State for combat
  const [isShooting, setIsShooting] = useState(false);
  const [currentBurstTime, setCurrentBurstTime] = useState(0);
  
  // Change model selection to use modelIndex
  const [modelPath] = useState(() => ENEMY_MODELS[modelIndex]);
  
  // Update model loading
  const { scene, animations } = useGLTF(modelPath);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const health = useEnemyStore((state) => state.health[id] ?? MAX_HEALTH);
  const updateHealth = useEnemyStore((state) => state.updateHealth);

  // Log available animations on mount
  useEffect(() => {
    if (actions) {
      debugLog("Enemy", 'Animation system initialized');
      debugLog("Enemy", 'Available animations', Object.keys(actions).join(', '));
      
      // Log details about each animation
      Object.entries(actions).forEach(([name, action]) => {
        if (action) {
          const duration = action.getClip().duration;
          const frames = Math.round(duration * 30);
          debugLog("Enemy", `Animation "${name}" details`, {
            duration: duration.toFixed(2),
            frames
          });
        }
      });
    }
  }, [actions]);

  // Initialize health
  useEffect(() => {
    if (!(id in useEnemyStore.getState().health)) {
      updateHealth(id, 0);
    }
  }, [id]);

  // Update playAnimation to handle position continuity
  const playAnimation = useCallback((animationName: string, fadeTime: number = 0.2) => {
    const lowerAnimName = animationName.toLowerCase();
    if (!VALID_ANIMATIONS.has(lowerAnimName)) {
      debugLog("Enemy", `Warning: Animation "${animationName}" is not in the list of valid animations!`);
      return;
    }

    // Find the animation with case-insensitive matching
    const matchingAnim = Object.keys(actions || {}).find(
      key => key.toLowerCase() === lowerAnimName
    );

    if (!actions || !matchingAnim || !actions[matchingAnim]) {
      debugLog("Enemy", `Warning: Animation "${animationName}" not found in loaded actions!`);
      debugLog("Enemy", `Available actions: ${Object.keys(actions || {}).join(', ')}`);
      return;
    }

    const newAnim = actions[matchingAnim];
    debugLog("Enemy", `Playing animation: ${matchingAnim}`);

    // Slow down the animation speed
    const animationSpeed = 0.5; // Half the original speed

    // Stop all current animations first
    Object.values(actions).forEach(action => {
      if (action && action !== newAnim) {
        action.fadeOut(fadeTime);
      }
    });

    // Reset and play new animation with slower speed
    newAnim
      .reset()
      .setEffectiveTimeScale(animationSpeed)
      .setEffectiveWeight(1)
      .fadeIn(fadeTime)
      .play();

    currentActionRef.current = newAnim;
  }, [actions]);

  // Initialize patrol animation on mount
  useEffect(() => {
    if (actions) {
      debugLog("Enemy", 'Initializing patrol animation');
      const patrolAnim = STATE_ANIMATIONS[STATES.PATROL];
      if (patrolAnim && actions[patrolAnim]) {
        playAnimation(patrolAnim);
      }
    }
  }, [actions, playAnimation]);

  // Debounced setState function with animation handling
  const debouncedSetState = useCallback((newState: EnemyState) => {
    const now = Date.now();
    if (now - lastStateChange.current >= COMBAT_CONFIG.STATE_DEBOUNCE) {
      debugLog("Enemy", `Changing state from ${state} to ${newState}`);
      setState(newState);
      lastStateChange.current = now;
      
      // Play corresponding animation
      const animationName = STATE_ANIMATIONS[newState];
      if (animationName && actions?.[animationName]) {
        playAnimation(animationName);
      }
    }
  }, [state, actions, playAnimation]);

  // Function to handle shooting with animation
  const handleShooting = (currentTime: number, playerPos: THREE.Vector3) => {
    if (!rigidBodyRef.current) return;

    // Remove cooldown check to ensure more consistent shooting
    const currentPos = rigidBodyRef.current.translation();
    const direction = new THREE.Vector3()
      .subVectors(playerPos, new THREE.Vector3(currentPos.x, currentPos.y + 1.5, currentPos.z))
      .normalize();

    // Reduced spread for better accuracy
    const spread = 0.05; // Even less spread
    direction.x += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    // Adjust position to throw from shoulder height
    const throwPosition = new THREE.Vector3(currentPos.x, currentPos.y + 1.5, currentPos.z);
    const rightVector = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
    throwPosition.add(rightVector.multiplyScalar(0.3));

    // Create projectile with can properties
    const addProjectile = useProjectileStore.getState().addProjectile;
    addProjectile({
      id: uuidv4(),
      position: throwPosition,
      direction: direction,
      speed: 35, // Faster projectiles
      damage: COMBAT_CONFIG.DAMAGE
    });

    // Play throwing animation
    if (actions?.throw) {
      playAnimation('throw', 0.1);
      setTimeout(() => {
        const stateAnim = STATE_ANIMATIONS[state];
        if (stateAnim && actions[stateAnim]) {
          playAnimation(stateAnim, 0.1);
        }
      }, 300); // Shorter animation time
    }

    setIsShooting(true);
    setCurrentBurstTime(currentTime);
    lastShotTime.current = currentTime;
    debugLog("Enemy", 'Throwing can at player!');
  };

  // Special handling for guide NPC
  useEffect(() => {
    if (isGuide && actions) {
      playAnimation('rumba', 0.2);
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setTranslation(GUIDE_CONFIG.START_POS, true);
      }
    }
  }, [isGuide, actions, playAnimation]);

  useFrame((frameState, delta) => {
    mixer?.update(delta);

    if (!groupRef.current || !rigidBodyRef.current || health <= 0 || isDying.current) return;

    if (isGuide) {
      const currentPos = rigidBodyRef.current.translation();
      const playerPos = frameState.camera.position;
      
      // Calculate distances
      const distanceToPlayer = new THREE.Vector3(
        playerPos.x - currentPos.x,
        0,
        playerPos.z - currentPos.z
      ).length();

      const distanceToTarget = new THREE.Vector3(
        GUIDE_CONFIG.TARGET_POS.x - currentPos.x,
        0,
        GUIDE_CONFIG.TARGET_POS.z - currentPos.z
      ).length();

      // Always face the player
      lookAtPlayer(playerPos, currentPos);

      // Move towards target if player is too close
      if (distanceToPlayer < GUIDE_CONFIG.MIN_DISTANCE && distanceToTarget > 0.1) {
        const moveDir = new THREE.Vector3(
          GUIDE_CONFIG.TARGET_POS.x - currentPos.x,
          0,
          GUIDE_CONFIG.TARGET_POS.z - currentPos.z
        ).normalize();

        // Move backwards while facing player
        const newPos = {
          x: currentPos.x + moveDir.x * GUIDE_CONFIG.MOVE_SPEED * delta,
          y: GUIDE_CONFIG.TARGET_POS.y, // Maintain target height
          z: currentPos.z + moveDir.z * GUIDE_CONFIG.MOVE_SPEED * delta
        };

        rigidBodyRef.current.setTranslation(newPos, true);
      }

      return; // Skip regular enemy behavior for guide
    }

    const currentPos = rigidBodyRef.current.translation();
    groupRef.current.position.set(0, 0, 0);
    const playerPos = frameState.camera.position;
    
    const distanceToPlayer = new THREE.Vector3(
      playerPos.x - currentPos.x,
      0,
      playerPos.z - currentPos.z
    ).length();

    // Calculate player approach speed
    const prevDistance = lastDistanceRef.current;
    const approachSpeed = prevDistance ? (distanceToPlayer - prevDistance) / delta : 0;
    const isPlayerApproaching = approachSpeed < -2;

    lastDistanceRef.current = distanceToPlayer;
    distanceToPlayerRef.current = distanceToPlayer;

    debugLog("Enemy", `Distance: ${distanceToPlayer.toFixed(2)}, Speed: ${approachSpeed.toFixed(2)}`);

    const currentTime = Date.now();

    if (health <= 0 && state !== STATES.DEATH) {
      debouncedSetState(STATES.DEATH);
      return;
    }

    if (currentTime - lastStateChange.current >= COMBAT_CONFIG.STATE_DEBOUNCE) {
      let newState = state;

      if (distanceToPlayer <= COMBAT_CONFIG.RETREAT_DISTANCE && isPlayerApproaching) {
        newState = STATES.RETREAT;
      } else if (distanceToPlayer < COMBAT_CONFIG.OPTIMAL_RANGE.MIN) {
        // More likely to strafe than retreat when close
        newState = Math.random() > 0.7 ? STATES.RETREAT : STATES.STRAFE;
      } else if (distanceToPlayer > COMBAT_CONFIG.OPTIMAL_RANGE.MAX) {
        // Always chase when too far
        newState = STATES.CHASE;
      } else if (distanceToPlayer <= COMBAT_CONFIG.ATTACK_DISTANCE) {
        // Mix of attacking and strafing at optimal range
        newState = Math.random() > 0.4 ? STATES.ATTACK : STATES.STRAFE;
      }

      if (newState !== state) {
        debugLog("Enemy", `State transition: ${state} -> ${newState} (Distance: ${distanceToPlayer.toFixed(2)})`);
        debouncedSetState(newState);
      }
    }

    // Always try to shoot in both ATTACK and STRAFE states
    if ((state === STATES.ATTACK || state === STATES.STRAFE) && 
        !isShooting && 
        currentTime - lastShotTime.current >= COMBAT_CONFIG.BURST_COOLDOWN) {
      handleShooting(currentTime, playerPos);
    }

    // Update strafing
    if (state === STATES.STRAFE) {
      strafeTimer.current += delta;
      if (strafeTimer.current >= COMBAT_CONFIG.STRAFE_DURATION) {
        strafeTimer.current = 0;
        strafeDirection.current *= -1;
      }
    }

    // Update patrol angle
    patrolAngle.current += delta * 0.5;

    // Handle movement and behavior based on state
    switch (state) {
      case STATES.PATROL:
        const patrolPos = new THREE.Vector3(
          position.x + Math.cos(patrolAngle.current) * COMBAT_CONFIG.PATROL_RADIUS,
          currentPos.y,
          position.z + Math.sin(patrolAngle.current) * COMBAT_CONFIG.PATROL_RADIUS
        );
        moveTowards(patrolPos, 1);
        break;

      case STATES.CHASE:
        const dirToPlayer = new THREE.Vector3()
          .subVectors(playerPos, new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z))
          .normalize();
        
        const chasePos = new THREE.Vector3()
          .addVectors(
            new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
            dirToPlayer.multiplyScalar(Math.max(0, distanceToPlayer - COMBAT_CONFIG.ATTACK_DISTANCE))
          );
        
        moveTowards(chasePos, 1);
        break;

      case STATES.ATTACK:
        // Just look at player, no movement during attack
        lookAtPlayer(playerPos, currentPos);
        break;

      case STATES.STRAFE:
        const strafeDir = new THREE.Vector3()
          .subVectors(playerPos, new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z))
          .normalize();
        
        // Calculate strafe target position
        const strafeDistance = 3;
        const strafeTarget = new THREE.Vector3()
          .addVectors(
            new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
            new THREE.Vector3(strafeDir.z, 0, -strafeDir.x)
              .multiplyScalar(strafeDistance * strafeDirection.current)
          );
        
        moveTowards(strafeTarget, 1);
        lookAtPlayer(playerPos, currentPos);
        
        break;

      case STATES.RETREAT:
        const retreatDir = new THREE.Vector3()
          .subVectors(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z), playerPos)
          .normalize();
        
        // Add some randomness to retreat direction to make it less predictable
        const randomAngle = (Math.random() - 0.5) * Math.PI / 4; // ±45 degrees
        retreatDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        const retreatDist = Math.max(
          COMBAT_CONFIG.OPTIMAL_RANGE.MIN,
          distanceToPlayer * 1.2
        );
        
        const retreatPos = new THREE.Vector3()
          .addVectors(
            new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
            retreatDir.multiplyScalar(retreatDist)
          );
        
        moveTowards(retreatPos, COMBAT_CONFIG.RETREAT_SPEED);
        lookAtPlayer(playerPos, currentPos);
        
        break;
    }

    if (DEBUG && Math.random() < 0.01) {
      debugLog("Enemy", `State: ${state}, Health: ${health}, Distance: ${distanceToPlayer.toFixed(2)}`);
    }
  });

  // Update moveTowards for smarter movement
  const moveTowards = (targetPos: THREE.Vector3, speed: number) => {
    if (!rigidBodyRef.current || !groupRef.current || !currentActionRef.current) return;
    
    const currentPos = rigidBodyRef.current.translation();
    const currentAnim = currentActionRef.current.getClip().name.toLowerCase();
    const movementInfo = MOVEMENT_CONFIG.animations[currentAnim as keyof typeof MOVEMENT_CONFIG.animations];
    
    if (!movementInfo?.canMove) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      lookAtPlayer(targetPos, currentPos);
      return;
    }
    
    // Calculate direction to target with prediction
    const direction = new THREE.Vector3()
      .subVectors(targetPos, new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));
    
    // Add some prediction to movement
    if (state === STATES.CHASE) {
      const distanceToTarget = direction.length();
      // Increase speed based on distance
      const speedMultiplier = Math.min(2, distanceToTarget / 10);
      speed *= speedMultiplier;
    }
    
    direction.normalize();
    
    let velocity = { x: 0, y: 0, z: 0 };
    const animationSpeed = movementInfo.speed * speed;
    
    switch (movementInfo.type) {
      case 'forward':
        velocity = {
          x: direction.x * animationSpeed,
          y: 0,
          z: direction.z * animationSpeed
        };
        lookAtPlayer(targetPos, currentPos);
        break;

      case 'backward':
        velocity = {
          x: -direction.x * animationSpeed,
          y: 0,
          z: -direction.z * animationSpeed
        };
        lookAtPlayer(targetPos, currentPos);
        break;

      case 'strafe':
        if (direction.length() > 0.1) {
          const targetRotation = Math.atan2(direction.x, direction.z);
          groupRef.current.rotation.y = targetRotation;

          const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
          const strafeVelocity = right.multiplyScalar(animationSpeed * strafeDirection.current);
          
          velocity = {
            x: strafeVelocity.x,
            y: 0,
            z: strafeVelocity.z
          };
        }
        break;
    }
    
    rigidBodyRef.current.setLinvel(velocity, true);
  };

  // Helper function to make the enemy look at a target
  const lookAtPlayer = (targetPos: THREE.Vector3, currentPos: { x: number, y: number, z: number }) => {
    if (!groupRef.current) return;
    
    const direction = new THREE.Vector3(
      targetPos.x - currentPos.x,
      0,
      targetPos.z - currentPos.z
    ).normalize();
    
    // Only rotate if we have a significant direction
    if (direction.length() > MIN_ROTATION_THRESHOLD) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      
      // Smooth rotation interpolation
      const angleDiff = targetRotation - currentRotation.current;
      
      // Normalize angle difference to [-PI, PI]
      let normalizedDiff = angleDiff;
      while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      // Only rotate if the angle difference is significant
      if (Math.abs(normalizedDiff) > MIN_ROTATION_THRESHOLD) {
        currentRotation.current += normalizedDiff * ROTATION_SMOOTHING;
        groupRef.current.rotation.y = currentRotation.current;
      }
    }
  };

  // Handle death cleanup more thoroughly
  useEffect(() => {
    if (health <= 0 && !isDying.current) {
      isDying.current = true;
      debugLog("Enemy", 'Playing death animation');
      
      // Stop all movement but keep gravity
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      
      playAnimation('dying', 0.1);
      
      // Ensure complete cleanup
      const cleanup = () => {
        if (rigidBodyRef.current) {
          const world = rigidBodyRef.current.world;
          world.removeRigidBody(rigidBodyRef.current);
        }
        
        if (groupRef.current) {
          // Remove all children and dispose resources
          while (groupRef.current.children.length > 0) {
            const child = groupRef.current.children[0];
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else if (child.material) {
                child.material.dispose();
              }
            }
            groupRef.current.remove(child);
          }
          // Force scene graph update
          groupRef.current.parent?.remove(groupRef.current);
        }
        
        const removeEnemy = useGameStore.getState().removeEnemy;
        removeEnemy(id);
      };
      
      setTimeout(cleanup, 2000);
    }
  }, [health, playAnimation, id]);

  // Call onDeath when enemy dies
  useEffect(() => {
    if (health <= 0 && !isDying.current) {
      onDeath?.();
    }
  }, [health, onDeath]);

  return (
    <RigidBody 
      ref={rigidBodyRef}
      position={[position.x, position.y - 3, position.z]}
      enabledRotations={[false, true, false]}
      colliders={false}
      type="dynamic"
      lockRotations
      mass={2}
      friction={1}
      restitution={0}
      linearDamping={5}
      angularDamping={5.0}
      gravityScale={1}
      canSleep={false}
      ccd={true}
      userData={{ type: 'enemy', id, health } as EnemyUserData}
      onIntersectionEnter={(e) => {
        console.log('🎯 Collision detected with:', e.other.rigidBody?.userData);
        const otherUserData = e.other.rigidBody?.userData as { type?: string };
        console.log('🎯 Other userData type:', otherUserData?.type);
        if (otherUserData?.type === 'playerProjectile' && !isDying.current) {
          console.log('🎯 Hit by player projectile! Starting death sequence...');
          
          // Prevent any further updates or state changes
          isDying.current = true;
          
          // Stop all movement and physics but keep gravity
          if (rigidBodyRef.current) {
            rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
          
          // Play death animation
          playAnimation('dying', 0.2);
          
          // Immediate cleanup of debug helpers
          if (groupRef.current) {
            const axisHelper = groupRef.current.children.find(child => child instanceof THREE.AxesHelper);
            if (axisHelper) {
              groupRef.current.remove(axisHelper);
            }
          }
          
          // Complete removal after animation
          setTimeout(() => {
            // Thorough cleanup of all resources
            if (groupRef.current) {
              // Recursively dispose all materials and geometries
              groupRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  if (child.geometry) {
                    child.geometry.dispose();
                  }
                  if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                      material.dispose();
                    });
                  } else if (child.material) {
                    child.material.dispose();
                  }
                }
              });

              // Remove from parent to ensure it's out of the scene graph
              if (groupRef.current.parent) {
                groupRef.current.parent.remove(groupRef.current);
              }
            }

            // Remove physics body
            if (rigidBodyRef.current) {
              const world = rigidBodyRef.current.world;
              if (world) {
                world.removeRigidBody(rigidBodyRef.current);
              }
            }

            // Clear all animations
            if (mixer) {
              mixer.stopAllAction();
              mixer.uncacheRoot(scene);
            }

            // Remove from game store
            const removeEnemy = useGameStore.getState().removeEnemy;
            removeEnemy(id);

            // Clear refs properly - don't try to set read-only .current directly
            // Instead, let React handle the cleanup by not setting them to null manually
            
            // Force garbage collection hint
            if (scene) {
              scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.geometry?.dispose();
                  if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                  } else {
                    child.material?.dispose();
                  }
                }
              });
            }
          }, 2000);
        }
      }}
    >
      <CapsuleCollider 
        args={[1, 0.5]}
        position={[0, -2.75, 0]}
        friction={1}
        restitution={0}
        density={50}
        sensor={false}
      />
      <group 
        ref={groupRef} 
        scale={[0.417, 0.417, 0.417]}
        position={[0, -1.75, 0]}
      >
        <primitive object={scene} />
        {DEBUG && <primitive object={new THREE.AxesHelper(2)} />}
      </group>
    </RigidBody>
  );
} 