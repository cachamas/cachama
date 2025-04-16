import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { useMapStore } from './World';
import { useGameStore } from '../../lib/gameStore';
import QRCube from './QRCube';
import { useLoadingStore } from '../../stores/loadingStore';
import { MobileControlsState } from '../../hooks/useMobileControls';
import { debugLog } from '../../stores/debugStore';
import { Enemy } from '../../stores/gameStore';

// NOTE: There are some TypeScript linter errors in this file related to the performance optimization
// Variable references like 'ref', 'bobOffset', 'rotationX', etc. in unused code are flagged
// These aren't affecting functionality but should be cleaned up in a future refactoring

// Debug helpers
const DEBUG = true;
let lastDebugTime = 0;
const DEBUG_INTERVAL = 100; // Reduced from 500ms to 100ms for more frequent updates

// Add new debug constants
const DEBUG_COLORS = {
  movement: 'color: #4CAF50',  // Green
  physics: 'color: #2196F3',   // Blue
  ground: 'color: #FFC107',    // Yellow
  obstacle: 'color: #FF5722',  // Orange
  state: 'color: #9C27B0'      // Purple
} as const;

// Movement constants
const MOVE_SPEED = 36; // Base movement speed (reduced for better control)
const SPRINT_SPEED = 20; // Sprint speed (reduced for better control)
const MOBILE_MOVE_SPEED = MOVE_SPEED; // Same as desktop for consistency
const MOBILE_SPRINT_SPEED = SPRINT_SPEED; // Same as desktop for consistency
const ROTATION_SPEED = 0.085;
const JUMP_FORCE = 18;
const JUMP_COOLDOWN = 250;
const OBSTACLE_JUMP_FORCE = 13.5; // Slightly increased for better climbing
const GRAVITY = -22; // Slightly reduced for better slope handling
const FALL_MULTIPLIER = 1.4; // Slightly reduced for better slope control
const LOW_JUMP_MULTIPLIER = 1.2;
const MOVE_JUMP_BOOST = 1.06; // Slightly increased for better slope jumps
const PLAYER_HEIGHT = 1.5;
const PLAYER_RADIUS = 1.0;
const BOB_SPEED = 10;
const BOB_BASE_AMOUNT = 0.12;
const BOB_SPRINT_MULT = 1.8;
const BOB_STEP_OFFSET = 0.015;
const BOB_AMOUNT = 0.04;
const BOB_SIDE_AMOUNT = 0.008;
const MAX_VERTICAL_ANGLE = Math.PI / 2.1;
const STEP_HEIGHT = 2.5;
const STEP_DETECTION_RANGE = 1.5;
const STEP_SMOOTHING = 0.85;
const STEP_FORCE = 200;
const STEP_HORIZONTAL_FORCE = 80;
const STEP_THRESHOLD = 0.3;
const STEP_CHECK_DISTANCE = 0.8;
const STEP_HEIGHT_MAX = 2.5;
const SHOOT_COOLDOWN = 250;
const SHOOT_DAMAGE = 25;
const SHOOT_RANGE = 50;
const DOUBLE_TAP_WINDOW = 300;
const GROUND_CHECK_INTERVAL = 1000; // Reduce frequency to once per second
const GROUND_CHECK_DISTANCE = 8; // Units below player to check for ground
const GROUND_CORRECTION_SPEED = 20; // Speed to move player up when stuck
const CONCUSSION_RECOVERY_TIME = 2000; // 2 seconds to recover from concussion
const CONCUSSION_MOVEMENT_PENALTY = 0.2; // Only 20% normal movement speed when concussed
const SPAWN_HEIGHT_OFFSET = 2; // Additional height offset for safe spawning
const OBSTACLE_CHECK_THRESHOLD = 0.15; // Much less sensitive
const OBSTACLE_JUMP_TIMEOUT = 400; // Much longer timeout to prevent frequent jumps
const OBSTACLE_STEP_HEIGHT = 1.8; // Lower step height
const OBSTACLE_RAY_LENGTH = 1.2; // Much shorter detection range
const OBSTACLE_RAY_SPREAD = 0.2; // Tighter spread
const OBSTACLE_STEP_COOLDOWN = 500; // Much longer cooldown
const OBSTACLE_BOOST_FACTOR = 1.2; // Minimal boost
const OBSTACLE_VERTICAL_BOOST = 1.0; // No extra vertical boost
const FALL_THRESHOLD = 45; // Units to fall before respawning
const MUSIC_FALL_THRESHOLD = 30; // Special threshold for music map
const OVERWORLD_FALL_THRESHOLD = 14; // Special threshold for overworld map
const MOBILE_MOVEMENT_THRESHOLD = 0.02; // Reduced from 0.05 for better detection of small movements
const GEOMETRY_CHECK_INTERVAL = 1200;
const AUTO_JUMP_COOLDOWN = 500; // Cooldown between auto jumps
const AUTO_JUMP_VELOCITY_THRESHOLD = 0.1; // Velocity threshold to detect being stopped by geometry
const AUTO_JUMP_FORCE = 12; // Slightly lower than normal jump force

interface MapRotations {
  default: { x: number; y: number };
  fromCentral?: { x: number; y: number };
  toCentral?: { x: number; y: number };
  fromGallery?: { x: number; y: number };
  fromMusic?: { x: number; y: number };
  fromGct?: { x: number; y: number };
  fromToris?: { x: number; y: number };
}

interface SpawnPoint {
  position: [number, number, number];
  default?: { x: number; y: number };
  fromCentral?: { x: number; y: number };
}

interface ReturnSpawnPoint {
  position: [number, number, number];
  rotation: [number, number, number];
}

const INITIAL_SPAWN_POINTS: Record<string, SpawnPoint> = {
  overworld: {
    position: [-81.36, 3.01, -3.32],
    default: { x: 33.40, y: 307.41 },
    fromCentral: { x: 0.68, y: 121.71 }
  },
  central: {
    position: [-81.36, 3.01, -3.32],
    default: { x: 25.84, y: 267.47 }
  },
  gallery: {
    position: [5.10, 8.0, 57.96],
    default: { x: 6.99, y: 71.63 }
  },
  music: {
    position: [91.48, 4.0, 0.60],
    default: { x: 11.75, y: 130.87 }
  },
  toris: {
    position: [-203, -232, 73],
    default: { x: 3.43, y: 134.61 }
  },
  gct: {
    position: [-62.27, 39.12, -2.01],
    default: { x: 15.82, y: 270.28 }
  }
} as const;

// Return spawn points when coming back to central from other maps
const RETURN_TO_CENTRAL_SPAWN_POINTS: Record<string, ReturnSpawnPoint> = {
  gallery: {
    position: [4.70, 8.32, 61.82],
    rotation: [21.66, 0.75 + 180, 0]
  },
  music: {
    position: [90.33, 3.31, 0.17],
    rotation: [17.02, 89.96 + 180, 0]
  },
  toris: {
    position: [71.16, 3.57, -66.73],
    rotation: [15.30, 134.82 + 180, 0]
  },
  gct: {
    position: [3.31, 3, -61.08],
    rotation: [17.82, 179.85 + 180, 0]
  }
};

// Spawn rotations for each map
const SPAWN_ROTATIONS = {
  overworld: { x: 43.48 - 26.48, y: -43.02 + 25.28 },
  central: { x: 18.22, y: 269.36 },
  gallery: { x: 23.14, y: 64.62 + 180 },
  music: { x: 11.75, y: 130.87 + 180 },
  toris: { x: 3.43, y: 134.61 + 180 },
  gct: { x: 15.82, y: 270.28 + 180 }
};

// Helper function for linear interpolation
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Function to calculate rotation to look at a point
function calculateRotationToPoint(from: THREE.Vector3, target: THREE.Vector3): { x: number; y: number } {
  const direction = new THREE.Vector3().subVectors(target, from);
  const theta = Math.atan2(direction.x, direction.z);
  const phi = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));
  
  // Convert to degrees for easier debugging
  const thetaDeg = (theta * 180 / Math.PI);
  const phiDeg = (phi * 180 / Math.PI);
  
  console.log('Calculated rotation:', { x: phiDeg, y: thetaDeg });
  
  return {
    x: phi,
    y: theta
  };
}

// Central map target object position (Mesh_0)
const CENTRAL_TARGET = new THREE.Vector3(3.58, 7.26, -0.04);

// Track the previous map for teleport rotations
let previousMap = '';
// Track loading state for heavy maps
let isMapLoading = true;
// Now all maps are treated as heavy for consistent performance
const HEAVY_MAPS = ['toris', 'gct', 'overworld', 'central'];
const LOAD_PROTECTION_TIME = 2000; // 2 seconds protection

// Add frame counting for consistent frame skipping
const FRAME_SKIP = {
  MOBILE: 3,  // Process every 3rd frame on mobile
  DESKTOP: 1  // Process every frame on desktop
};

interface PlayerProps {
  onPositionChange?: (position: { x: number; y: number; z: number }) => void;
  mobileControls?: MobileControlsState;
}

interface ConcussionHitEvent extends CustomEvent {
  detail: {
    duration: number;
  };
}

interface ConcussionUpdateEvent extends CustomEvent {
  detail: {
    rotationX: number;
    rotationY: number;
  };
}

export default function Player({ onPositionChange, mobileControls }: PlayerProps) {
  const { currentMap, spawnPoints, isTransitioning } = useMapStore();
  const { isLoading, isPhysicsReady } = useLoadingStore();
  const [isFrozen, setIsFrozen] = useState(true);
  const hasReceivedInput = useRef(false);
  const ref = useRef<RigidBodyType>(null);
  const [, getKeys] = useKeyboardControls();
  const rotationY = useRef(0);
  const rotationX = useRef(0);
  const jumpCooldown = useRef(false);
  const bobOffset = useRef(0);
  const lastMoveTime = useRef(Date.now());
  const [canJump, setCanJump] = useState(true);
  const [lastShotTime, setLastShotTime] = useState(0);
  const updateEnemy = useGameStore(state => state.updateEnemy);
  const enemies = useGameStore(state => state.enemies);
  const [isSprinting, setIsSprinting] = useState(false);
  const lastStepTime = useRef(Date.now());
  const stepCooldown = useRef(false);
  const lastKeyPressTime = useRef({ time: 0, wasReleased: true });
  const obstacleJumpTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpawnTime = useRef(0);
  const [qrCubes, setQrCubes] = useState<Record<string, Array<[number, number, number]>>>({});
  const { camera } = useThree();
  const lastMovementState = useRef(false);
  const intendedSpawnY = useRef<number | null>(null);
  const spawnSafetyCheckComplete = useRef(false);
  const [isConcussed, setIsConcussed] = useState(false);
  const concussionRotationRef = useRef({ x: 0, y: 0 });
  const lastGroundCheckTime = useRef(0);
  const obstacleRaycaster = useRef(new THREE.Raycaster());
  const lastStepoverTime = useRef(0);
  const lastGeometryCheckTime = useRef(0);
  const stuckInGeometryCount = useRef(0);
  const frameCount = useRef(0);
  const lastAutoJumpTime = useRef(0);

  // Create a reference to track mobile input state
  const mobileInputRef = useRef({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    shoot: false,
    lastJump: 0,
    lastShot: 0,
    lastActiveMoveTime: 0,
    lastActiveLookTime: 0,
    activeMoveJoystick: false,
    activeLookJoystick: false
  });
  
  // Reset all mobile input values
  const resetMobileInputs = useCallback(() => {
    if (mobileInputRef.current) {
      // Hard reset all values to defaults
      mobileInputRef.current.moveX = 0;
      mobileInputRef.current.moveY = 0;
      mobileInputRef.current.lookX = 0;
      mobileInputRef.current.lookY = 0;
      mobileInputRef.current.jump = false;
      mobileInputRef.current.shoot = false;
      mobileInputRef.current.activeMoveJoystick = false;
      mobileInputRef.current.activeLookJoystick = false;
      
      // Force reset the timestamps too for complete clean state
      mobileInputRef.current.lastActiveMoveTime = 0;
      mobileInputRef.current.lastActiveLookTime = 0;
      
      // Add debug console log to verify reset
      console.log('Mobile inputs have been completely reset');
    }
  }, []);
  
  // Listen for reset-controls event to reset our inputs
  useEffect(() => {
    const handleResetControls = () => {
      console.log('Received reset-controls event');
      resetMobileInputs();
    };
    
    // Reset controls right away when player mounts
    resetMobileInputs();
    
    window.addEventListener('reset-controls', handleResetControls);
    // Also listen for visibility changes to reset when app is backgrounded/foregrounded
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('App returned to foreground, resetting controls');
        resetMobileInputs();
      }
    });
    
    // Reset controls on map change
    window.addEventListener('map-change', handleResetControls);
    
    return () => {
      window.removeEventListener('reset-controls', handleResetControls);
      window.removeEventListener('map-change', handleResetControls);
      document.removeEventListener('visibilitychange', resetMobileInputs);
    };
  }, [resetMobileInputs]);
  
  // Reset inputs when map changes
  useEffect(() => {
    console.log('Map changed, resetting mobile inputs');
    resetMobileInputs();
  }, [currentMap, resetMobileInputs]);

  // Add refs for camera movement detection
  const lastCameraRotationRef = useRef({ x: 0, y: 0 });
  const cameraStuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveStuckChecksRef = useRef(0);
  
  // Function to check if camera is stuck
  const checkCameraStuck = useCallback((currentRotation: { x: number, y: number }) => {
    if (mobileControls?.activeLookJoystick && 
        (Math.abs(mobileControls.lookX) > 0.05 || Math.abs(mobileControls.lookY) > 0.05)) {  // Increased threshold
      
      const rotationDelta = Math.abs(currentRotation.x - lastCameraRotationRef.current.x) +
                           Math.abs(currentRotation.y - lastCameraRotationRef.current.y);
                           
      if (rotationDelta < 0.001) {  // Increased threshold
        consecutiveStuckChecksRef.current++;
        
        if (consecutiveStuckChecksRef.current >= 10) {  // Increased number of checks
          console.log('Camera appears stuck, triggering full controls reset');
          // Reset both joystick and look controls
          resetMobileInputs();
          // Force touch events cleanup
          window.dispatchEvent(new Event('touchend'));
        }
      } else {
        consecutiveStuckChecksRef.current = 0;
      }
    } else {
      // Reset counter if no active look input
      consecutiveStuckChecksRef.current = 0;
    }
    
    lastCameraRotationRef.current = { ...currentRotation };
  }, [mobileControls?.activeLookJoystick, mobileControls?.lookX, mobileControls?.lookY, resetMobileInputs]);

  // Update useEffect for mobile controls to include consistent camera movement detection
  useEffect(() => {
    if (mobileControls) {
      // Store movement values ONLY if move joystick is active
      if (mobileControls.activeMoveJoystick) {
        mobileInputRef.current.moveX = mobileControls.moveX;
        mobileInputRef.current.moveY = mobileControls.moveY;
        mobileInputRef.current.activeMoveJoystick = true;
        mobileInputRef.current.lastActiveMoveTime = Date.now();

        // Skip emitting movement events in toris map to prevent conflicts with slideshow
        // Emit movement event for slideshow detection in other maps
        if (currentMap !== 'toris') {
          // Dispatch mobile-move event for viewmodel
          window.dispatchEvent(new CustomEvent('mobile-move', {
            detail: {
              x: mobileControls.moveX,
              y: mobileControls.moveY
            }
          }));
          
          window.dispatchEvent(new CustomEvent('camera-movement', {
            detail: {
              moveX: mobileControls.moveX,
              moveY: mobileControls.moveY
            }
          }));
          
          // Also dispatch joystick-change event for mobile slideshow
          window.dispatchEvent(new CustomEvent('joystick-change', {
            detail: {
              x: mobileControls.moveX,
              y: mobileControls.moveY
            }
          }));
        }
      } else {
        mobileInputRef.current.moveX = 0;
        mobileInputRef.current.moveY = 0;
        mobileInputRef.current.activeMoveJoystick = false;
        
        // Reset mobile movement
        window.dispatchEvent(new CustomEvent('mobile-move', {
          detail: { x: 0, y: 0 }
        }));
      }

      // Store look values ONLY if look joystick is active
      if (mobileControls.activeLookJoystick) {
        mobileInputRef.current.lookX = mobileControls.lookX;
        mobileInputRef.current.lookY = mobileControls.lookY;
        mobileInputRef.current.activeLookJoystick = true;
        mobileInputRef.current.lastActiveLookTime = Date.now();
        
        // Apply camera rotation ONLY when look joystick is active
        const lookSensitivity = 0.25;
        const horizontalSensitivity = lookSensitivity * 1.3;
        const newRotationY = rotationY.current - mobileControls.lookX * horizontalSensitivity;
        const newRotationX = rotationX.current - mobileControls.lookY * lookSensitivity;
        
        rotationY.current = newRotationY % (2 * Math.PI);
        if (rotationY.current < 0) rotationY.current += 2 * Math.PI;
        
        rotationX.current = Math.max(
          -MAX_VERTICAL_ANGLE,
          Math.min(MAX_VERTICAL_ANGLE, newRotationX)
        );

        // Skip emitting camera movement events in toris map to prevent conflicts with slideshow
        // Dispatch camera movement event for other maps
        if (currentMap !== 'toris') {
          // Dispatch mobile-look event for viewmodel
          window.dispatchEvent(new CustomEvent('mobile-look', {
            detail: {
              x: mobileControls.lookX,
              y: mobileControls.lookY
            }
          }));
          
          window.dispatchEvent(new CustomEvent('camera-movement', {
            detail: {
              lookX: mobileControls.lookX,
              lookY: mobileControls.lookY
            }
          }));
          
          // Also dispatch joystick-change event for tracking
          window.dispatchEvent(new CustomEvent('joystick-change', {
            detail: {
              x: mobileControls.lookX,
              y: mobileControls.lookY
            }
          }));
          
          // Always dispatch a mobile-joystick-active event for detection
          window.dispatchEvent(new CustomEvent('mobile-joystick-active'));
        }
      } else {
        // Reset mobile look
        window.dispatchEvent(new CustomEvent('mobile-look', {
          detail: { x: 0, y: 0 }
        }));
      }
    }
    
    // Cleanup
    return () => {
      if (cameraStuckTimeoutRef.current) {
        clearTimeout(cameraStuckTimeoutRef.current);
      }
    };
  }, [mobileControls, checkCameraStuck, currentMap]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyK' && ref.current) {
        // Get current map and position
        const pos = ref.current.translation();
        debugLog('Player', 'Spawn point data', {
          map: currentMap,
          rotation: {
            x: (rotationX.current * 180/Math.PI).toFixed(2),
            y: (rotationY.current * 180/Math.PI).toFixed(2)
          },
          position: {
            x: pos.x.toFixed(2),
            y: pos.y.toFixed(2),
            z: pos.z.toFixed(2)
          }
        });
      }
      if (event.code === 'KeyL' && ref.current) {
        const pos = ref.current.translation();
        const vel = ref.current.linvel();
        const isGrounded = Math.abs(vel.y) < 0.5;
        const moveKeys = getKeys();
        const isMoving = Object.values(moveKeys).some(key => key);
        
        debugLog('Player', 'Debug info', {
          position: {
            x: pos.x.toFixed(2),
            y: pos.y.toFixed(2),
            z: pos.z.toFixed(2)
          },
          velocity: {
            x: vel.x.toFixed(2),
            y: vel.y.toFixed(2),
            z: vel.z.toFixed(2)
          },
          state: {
            isGrounded,
            isSprinting,
            isMoving,
            bobOffset: bobOffset.current,
            shouldBob: isMoving && isGrounded
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentMap, isTransitioning]);

  useEffect(() => {
    if (ref.current) {
      // Check if we're returning to central
      const isReturningToCentral = currentMap === 'central' && previousMap && 
        previousMap !== 'overworld' && 
        previousMap in RETURN_TO_CENTRAL_SPAWN_POINTS;

      // Get spawn data from either return points or normal spawn points
      const spawnData = isReturningToCentral 
        ? RETURN_TO_CENTRAL_SPAWN_POINTS[previousMap as keyof typeof RETURN_TO_CENTRAL_SPAWN_POINTS]
        : spawnPoints[currentMap as keyof typeof spawnPoints];
      
      if (!spawnData?.position) return;

      // Log the spawn data for debugging
      console.log(`🚀 Player spawning in ${currentMap}${isReturningToCentral ? ` (returning from ${previousMap})` : ''} at:`, {
        position: spawnData.position,
        isReturningToCentral,
        previousMap,
        currentMap
      });

      // Store the intended Y position for safety check
      const spawnY = spawnData.position[1] + (currentMap === 'gct' ? 4 : SPAWN_HEIGHT_OFFSET);
      intendedSpawnY.current = spawnY;
      spawnSafetyCheckComplete.current = false;

      // Set initial position with additional height for safety
      ref.current.setTranslation({ 
        x: spawnData.position[0], 
        y: spawnY, 
        z: spawnData.position[2]
      }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);

      // Reset loading state with protection for heavy maps
      isMapLoading = HEAVY_MAPS.includes(currentMap);
      
      // Store spawn time to prevent immediate mouse movement
      lastSpawnTime.current = Date.now();

      // Force the exact rotation we want after a brief delay
      setTimeout(() => {
        if (isReturningToCentral || currentMap === 'central') {
          // Calculate rotation to look at Mesh_0 from current position
          const spawnPos = new THREE.Vector3(spawnData.position[0], spawnData.position[1], spawnData.position[2]);
          const lookAtRotation = calculateRotationToPoint(spawnPos, CENTRAL_TARGET);
          rotationX.current = lookAtRotation.x;
          rotationY.current = lookAtRotation.y + Math.PI; // Add 180 degrees to turn around
        } else {
          // For other maps, use the original rotation system
          const mapRotations = INITIAL_SPAWN_POINTS[currentMap as keyof typeof INITIAL_SPAWN_POINTS];
          const rotation = currentMap === 'overworld' && previousMap === 'central'
            ? mapRotations.fromCentral
            : mapRotations.default;
          
          if (rotation) {
            rotationX.current = (rotation.x * Math.PI) / 180;
            rotationY.current = (rotation.y * Math.PI) / 180;
          }
        }
        
        // Force an immediate camera update
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.dispatchEvent(new Event('update'));
        }

        // Allow movement after protection time for heavy maps
        if (HEAVY_MAPS.includes(currentMap)) {
          setTimeout(() => {
            isMapLoading = false;
            // Additional safety check after loading
            if (ref.current) {
              const pos = ref.current.translation();
              // If player somehow fell, reset to spawn position
              if (pos.y < intendedSpawnY.current! - 10) {
                console.log('Post-loading safety correction applied');
                ref.current.setTranslation({
                  x: spawnData.position[0],
                  y: intendedSpawnY.current!,
                  z: spawnData.position[2]
                }, true);
                ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
              }
            }
          }, LOAD_PROTECTION_TIME);
        } else {
          isMapLoading = false;
        }
      }, 20);

      // Update previous map for next teleport
      previousMap = currentMap;
    }
  }, [currentMap, spawnPoints]);

  // Add effect to handle initial input
  useEffect(() => {
    const handleFirstInput = () => {
      if (!hasReceivedInput.current) {
        hasReceivedInput.current = true;
        setIsFrozen(false);
      }
    };

    const events = ['keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleFirstInput));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleFirstInput));
    };
  }, []);

  // Reset frozen state on map change
  useEffect(() => {
    setIsFrozen(true);
    hasReceivedInput.current = false;
  }, [currentMap]);

  // Unfreeze when physics is ready and we have input
  useEffect(() => {
    if (isPhysicsReady && hasReceivedInput.current) {
      setIsFrozen(false);
    }
  }, [isPhysicsReady]);

  useFrame((state, delta) => {
    if (!ref.current || isTransitioning || isFrozen) return;
    
    // Get current state
    const translation = ref.current.translation();
    const vel = ref.current.linvel();
    
    // Check for fall detection thresholds based on the current map
    // If player falls below threshold, respawn them
    const spawnData = spawnPoints[currentMap as keyof typeof spawnPoints];
    
    if (spawnData?.position) {
      const currentFallThreshold = 
        currentMap === 'music' ? MUSIC_FALL_THRESHOLD :
        currentMap === 'overworld' ? OVERWORLD_FALL_THRESHOLD :
        currentMap === 'gct' ? 55 :
        FALL_THRESHOLD;
      
      // Compare player's Y position to the spawn point's Y position
      // If they've fallen too far, respawn them at the map's spawn point
      if (translation.y < spawnData.position[1] - currentFallThreshold) {
        console.log(`🎮 Player fell below threshold (${currentFallThreshold} units) in ${currentMap}, respawning`);
        
        // Calculate safe spawn Y position
        const spawnY = spawnData.position[1] + (currentMap === 'gct' ? 4 : SPAWN_HEIGHT_OFFSET);
        
        // Reset position to spawn point with appropriate height offset
        ref.current.setTranslation({
          x: spawnData.position[0],
          y: spawnY,
          z: spawnData.position[2]
        }, true);
        
        // Reset velocity
        ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        
        // Update last spawn time to prevent immediate movement
        lastSpawnTime.current = Date.now();
      }
    }
    
    // Get inputs
    const { forward, backward, left, right, jump, sprint } = getKeys();
    
    // Ground check with small threshold for better detection
    const isGrounded = Math.abs(vel.y) < 0.1 && vel.y <= 0.1;
    
    // Create input vector from both keyboard and mobile
    let inputX = 0;
    let inputZ = 0;
    
    // Apply keyboard inputs with consistent mapping
    if (forward) inputZ -= 1;
    if (backward) inputZ += 1;
    if (right) inputX += 1;
    if (left) inputX -= 1;
    
    // Apply mobile inputs with improved joystick handling
    if (mobileControls?.activeMoveJoystick) {
      const deadzone = 0.1; // Small deadzone for better control
      const moveX = Math.abs(mobileControls.moveX) > deadzone ? mobileControls.moveX : 0;
      const moveY = Math.abs(mobileControls.moveY) > deadzone ? mobileControls.moveY : 0;
      
      // Advanced mobile input handling for better performance
      const isHeavyMap = currentMap === 'toris' || currentMap === 'gct';
      
      if (isHeavyMap) {
        // Prioritize performance by using simpler input processing in heavy maps
        inputX = moveX;
        inputZ = moveY;
      } else {
        // Use the larger input to prevent diagonal speed boost
        if (Math.abs(moveX) > Math.abs(inputX)) inputX = moveX;
        if (Math.abs(moveY) > Math.abs(inputZ)) inputZ = moveY;
      }
      
      // Cache the last valid mobile input for better responsiveness
      if (Math.abs(moveX) > deadzone || Math.abs(moveY) > deadzone) {
        mobileInputRef.current.lastActiveMoveTime = Date.now();
      }
    }
    
    // Normalize input vector to prevent diagonal speed boost
    const inputMagnitude = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (inputMagnitude > 1) {
      inputX /= inputMagnitude;
      inputZ /= inputMagnitude;
    }
    
    // Handle sprinting with better mobile detection
    const shouldSprint = sprint || (mobileControls?.isMobile && inputMagnitude > 0.9);
    setIsSprinting(!!shouldSprint);
    
    // Calculate movement direction relative to camera
    const moveDir = new THREE.Vector3(0, 0, 0);
    const angle = rotationY.current;
    const fwdX = Math.sin(angle);
    const fwdZ = Math.cos(angle);
    const rightX = Math.sin(angle + Math.PI / 2);
    const rightZ = Math.cos(angle + Math.PI / 2);
    
    // Improved movement vector calculation - removed negative sign from inputZ
    moveDir.x = fwdX * inputZ + rightX * inputX;
    moveDir.z = fwdZ * inputZ + rightZ * inputX;
    
    const isMoving = moveDir.length() > 0;
    if (isMoving) moveDir.normalize();
    
    // Calculate target velocity with improved physics
    const baseSpeed = shouldSprint ? SPRINT_SPEED : MOVE_SPEED;
    const currentSpeed = baseSpeed * (isConcussed ? CONCUSSION_MOVEMENT_PENALTY : 1);

    // Apply movement with improved physics
    if (ref.current) {
      const targetVel = {
        x: moveDir.x * currentSpeed,
        y: vel.y, // Preserve vertical velocity
        z: moveDir.z * currentSpeed
      };

      // Check for auto-jump condition when moving into geometry
      if (isMoving && isGrounded && !jumpCooldown.current && !isConcussed) {
        const currentTime = Date.now();
        const horizontalVelocity = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const targetHorizontalVelocity = Math.sqrt(targetVel.x * targetVel.x + targetVel.z * targetVel.z);
        
        // If we're trying to move but our velocity is very low, we might be against geometry
        if (horizontalVelocity < AUTO_JUMP_VELOCITY_THRESHOLD && 
            targetHorizontalVelocity > 0.5 && 
            currentTime - lastAutoJumpTime.current > AUTO_JUMP_COOLDOWN) {
          // Perform auto-jump
          targetVel.y = AUTO_JUMP_FORCE;
          lastAutoJumpTime.current = currentTime;
          jumpCooldown.current = true;
          setTimeout(() => {
            jumpCooldown.current = false;
          }, JUMP_COOLDOWN);
        }
      }

      // Apply smoother acceleration and deceleration
      const currentVel = ref.current.linvel();
      
      // Adjust acceleration based on map and performance
      const isHeavyMap = currentMap === 'toris' || currentMap === 'gct';
      const isMobile = !!mobileControls?.isMobile;
      
      // Use optimized physics for mobile on heavy maps
      const groundAcceleration = isHeavyMap && isMobile ? 0.2 : 0.25; // Faster on ground
      const airAcceleration = isHeavyMap && isMobile ? 0.05 : 0.1; // Slower in air
      
      const acceleration = isGrounded ? groundAcceleration : airAcceleration;

      // Smooth velocity changes for more responsive movement
      const smoothedVel = {
        x: currentVel.x + (targetVel.x - currentVel.x) * acceleration,
        y: targetVel.y,
        z: currentVel.z + (targetVel.z - currentVel.z) * acceleration
      };

      // Apply movement
      ref.current.setLinvel(smoothedVel, true);

      // Apply gravity with better air control
      if (!isGrounded) {
        // Use simplified physics calculations on mobile for heavy maps
        if (isHeavyMap && isMobile) {
          const simplifiedGravity = GRAVITY * 1.2 * delta;
          ref.current.applyImpulse({ x: 0, y: simplifiedGravity, z: 0 }, true);
        } else {
          const fallForce = vel.y < 0 
            ? GRAVITY * FALL_MULTIPLIER * delta
            : GRAVITY * LOW_JUMP_MULTIPLIER * delta;
          
          ref.current.applyImpulse({ x: 0, y: fallForce, z: 0 }, true);
        }
      }
    }
    
    // Handle jumping
    if (jump && isGrounded && !jumpCooldown.current && !isConcussed) {
      const smoothedVel = ref.current?.linvel() || { x: 0, y: 0, z: 0 };
      smoothedVel.y = JUMP_FORCE;
      ref.current.setLinvel(smoothedVel, true);
      jumpCooldown.current = true;
      setTimeout(() => {
        jumpCooldown.current = false;
      }, JUMP_COOLDOWN);
    }
    
    // Call onPositionChange with current position
    if (onPositionChange) {
      onPositionChange(translation);
    }
    
    // Update movement state for UI
    if (isMoving !== lastMovementState.current) {
      lastMovementState.current = isMoving;
      window.dispatchEvent(new CustomEvent('player-movement', {
        detail: { isMoving }
      }));
    }
    
    // Update camera position
    updateCameraPosition(
      state,
      translation,
      rotationX.current,
      rotationY.current,
      bobOffset.current,
      concussionRotationRef.current,
      ref
    );
  });

  useEffect(() => {
    if (!ref.current || !currentMap) return;

    let targetPosition: [number, number, number] | undefined;
    let targetRotation: [number, number, number] | undefined;

    // Handle return to central from other maps
    if (currentMap === 'central' && previousMap && previousMap !== 'overworld') {
      const returnPoint = RETURN_TO_CENTRAL_SPAWN_POINTS[previousMap as keyof typeof RETURN_TO_CENTRAL_SPAWN_POINTS];
      if (returnPoint) {
        targetPosition = returnPoint.position;
        targetRotation = returnPoint.rotation;
      }
    } else {
      // Handle normal map spawns
      const spawnPoint = INITIAL_SPAWN_POINTS[currentMap as keyof typeof INITIAL_SPAWN_POINTS];
      if (spawnPoint) {
        targetPosition = spawnPoint.position;
        // Use default rotation if available
        if ('rotation' in spawnPoint) {
          targetRotation = (spawnPoint as any).rotation;
        }
      }
    }

    if (targetPosition && targetRotation) {
      // Use direct position setting instead of vec3 and quat
      ref.current.setTranslation({
        x: targetPosition[0],
        y: targetPosition[1],
        z: targetPosition[2]
      }, true);
      
      // Skip rotation setting since it's causing errors
      // We'll rely on the rotation setting in the other useEffect
    }
  }, [currentMap, previousMap, ref]);

  // Clear cubes when map changes
  useEffect(() => {
    setQrCubes(prev => ({ ...prev, [currentMap]: prev[currentMap] || [] }));
  }, [currentMap]);

  // Handle cube spawning
  useEffect(() => {
    const handleSpawn = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        setQrCubes(prev => {
          const mapCubes = prev[currentMap] || [];
          if (mapCubes.length >= 6) return prev;

          const spawnPosition: [number, number, number] = [
            camera.position.x + camera.getWorldDirection(new THREE.Vector3()).x * 3,
            camera.position.y,
            camera.position.z + camera.getWorldDirection(new THREE.Vector3()).z * 3
          ];

          return {
            ...prev,
            [currentMap]: [...mapCubes, spawnPosition]
          };
        });
      }
    };

    window.addEventListener('keydown', handleSpawn);
    return () => window.removeEventListener('keydown', handleSpawn);
  }, [camera, currentMap]);

  // Update the concussion effect event listeners
  useEffect(() => {
    const handlePlayerHit = (e: ConcussionHitEvent) => {
      console.log('🎯 Player hit event received, duration:', e.detail.duration);
      // Reset any existing concussion state
      concussionRotationRef.current = { x: 0, y: 0 };
      setIsConcussed(true);
      
      setTimeout(() => {
        setIsConcussed(false);
        concussionRotationRef.current = { x: 0, y: 0 };
      }, e.detail.duration);
    };

    const handleConcussionUpdate = (e: ConcussionUpdateEvent) => {
      if (!isConcussed) return;
      
      console.log('🎯 Concussion update:', e.detail.rotationX, e.detail.rotationY);
      concussionRotationRef.current = {
        x: e.detail.rotationX,
        y: e.detail.rotationY
      };
    };

    window.addEventListener('player-hit', handlePlayerHit as EventListener);
    window.addEventListener('concussion-update', handleConcussionUpdate as EventListener);

    return () => {
      window.removeEventListener('player-hit', handlePlayerHit as EventListener);
      window.removeEventListener('concussion-update', handleConcussionUpdate as EventListener);
    };
  }, [isConcussed]);

  // Add effect to handle post-loading rotation reset
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // When loading finishes
    if (!isLoading) {
      timeoutId = setTimeout(() => {
        // Get the correct rotation based on map and previous map
        if (currentMap === 'central' || previousMap === 'central') {
          // Calculate rotation to look at Mesh_0 from current position
          if (ref.current) {
            const pos = ref.current.translation();
            const spawnPos = new THREE.Vector3(pos.x, pos.y, pos.z);
            const lookAtRotation = calculateRotationToPoint(spawnPos, CENTRAL_TARGET);
            rotationX.current = lookAtRotation.x;
            rotationY.current = lookAtRotation.y + Math.PI; // Add 180 degrees to turn around
          }
        } else {
          // For other maps, use the original rotation system
          const mapRotations = INITIAL_SPAWN_POINTS[currentMap as keyof typeof INITIAL_SPAWN_POINTS];
          const rotation = currentMap === 'overworld' && previousMap === 'central'
            ? mapRotations.fromCentral
            : mapRotations.default;
          
          if (rotation) {
            rotationX.current = (rotation.x * Math.PI) / 180;
            rotationY.current = (rotation.y * Math.PI) / 180;
          }
        }

        // Request pointer lock again
        const canvas = document.querySelector('canvas');
        const isMapOpen = document.body.getAttribute('data-map-open') === 'true';
        if (canvas && !document.pointerLockElement && !isMapOpen) {
          canvas.requestPointerLock();
        }
      }, 100); // Small delay to ensure loading screen is fully gone
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, currentMap]);

  // Remove loading check from mouse movement handler
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    let isLocked = false;

    const handleMouseMove = (event: MouseEvent) => {
      // Only process mouse movement if pointer is locked and it's our canvas
      if (document.pointerLockElement === canvas) {
        if (!isLocked) {
          isLocked = true;
          return; // Skip first frame after locking to prevent jumps
        }

        // Only allow mouse movement if we're not in a spawn transition
        if (Date.now() - lastSpawnTime.current > 100) {
          // Apply movement with increased sensitivity for PC
          // Higher sensitivity factor (0.0065 instead of 0.005)
          rotationY.current -= event.movementX * ROTATION_SPEED * 0.0065;
          rotationX.current -= event.movementY * ROTATION_SPEED * 0.0065;
          
          // Normalize rotations to prevent accumulation
          rotationX.current = Math.max(
            -MAX_VERTICAL_ANGLE,
            Math.min(MAX_VERTICAL_ANGLE, rotationX.current)
          );
          
          // Keep Y rotation in 0-2π range
          rotationY.current = rotationY.current % (2 * Math.PI);
          if (rotationY.current < 0) rotationY.current += 2 * Math.PI;
        }
      } else {
        isLocked = false;
      }
    };

    const handleClick = () => {
      // Don't request pointer lock if map is open
      const isMapOpen = document.body.getAttribute('data-map-open') === 'true';
      if (isMapOpen) return;
      
      if (!document.pointerLockElement && canvas) {
        try {
          canvas.requestPointerLock();
          // Dispatch a custom event that App.tsx will listen for
          window.dispatchEvent(new CustomEvent('game-started'));
        } catch (err) {
          console.warn('Could not request pointer lock:', err);
        }
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) {
        isLocked = false;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    if (canvas) {
      canvas.style.cursor = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      
      if (canvas) {
        canvas.style.cursor = 'default';
      }
    };
  }, []); // Remove isLoading from dependencies

  // Add mobile shoot event listener
  useEffect(() => {
    const handleMobileShoot = () => {
      // Check if we can shoot based on cooldown
      if (Date.now() - lastShotTime < SHOOT_COOLDOWN) return;
      
      setLastShotTime(Date.now());
      
      // Only trigger shoot event for audio - can spawn is handled by animation
      window.dispatchEvent(new CustomEvent('player-shoot', {
        detail: { fromMobile: true }
      }));
    };
    
    // Listen for mobile-shoot events
    window.addEventListener('mobile-shoot', handleMobileShoot);
    
    return () => {
      window.removeEventListener('mobile-shoot', handleMobileShoot);
    };
  }, [lastShotTime]);

  // Add mobile-specific map transition handler - simulates pointer lock behavior
  useEffect(() => {
    if (!isMobileDevice()) return; // Only apply for mobile devices
    
    // When map changes on mobile, reset control states
    if (currentMap) {
      console.log('Map changed on mobile, resetting controls');
      
      // Reset our local input state immediately
      resetMobileInputs();
      
      // Small delay to ensure map is loaded before resetting controls
      setTimeout(() => {
        // Reset mobile controls to prevent stuck joysticks
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('reset-controls'));
        }
      }, 100);
    }
  }, [currentMap, resetMobileInputs]);

  // Move utility functions inside component
  const isMobileDevice = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check for explicitly set mobile flag first
    if ((window as any).__hasMobileControls__ === true) return true;
    
    // Then check user agent
    const userAgent = window.navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i;
    return mobileRegex.test(userAgent);
  }, []);

  const isHeavyMap = useCallback((mapName: string): boolean => {
    return HEAVY_MAPS.includes(mapName);
  }, []);

  const getScaledMoveSpeed = useCallback((baseSpeed: number, delta: number, mapName: string): number => {
    let adjustedSpeed = baseSpeed;
    
    // 1. Apply device-specific base adjustments first
    if (isMobileDevice()) {
        // Mobile base speed reduction for better control
        adjustedSpeed *= 0.85;
    }
    
    // 2. Apply map-specific adjustments
    if (mapName === 'toris') {
        // For toris, use a logarithmic scale for speed reduction
        const mobileMultiplier = isMobileDevice() ? 0.65 : 0.45;
        const baseMultiplier = Math.log10(adjustedSpeed) / Math.log10(SPRINT_SPEED);
        adjustedSpeed *= mobileMultiplier * baseMultiplier;
        
        // Ensure minimum speed threshold
        const minSpeed = baseSpeed * (isMobileDevice() ? 0.35 : 0.25);
        adjustedSpeed = Math.max(adjustedSpeed, minSpeed);
    } else if (isMobileDevice()) {
        // Apply map-specific mobile optimizations for other maps
        if (isHeavyMap(mapName)) {
            if (mapName === 'central' || mapName === 'overworld') {
                adjustedSpeed *= 1.15; // Reduced boost for better control
            } else {
                adjustedSpeed *= 1.1;
            }
        }
    }
    
    // 3. Apply smooth interpolation for speed transitions
    const targetSpeed = adjustedSpeed;
    const currentSpeed = ref.current?.linvel() || { x: 0, y: 0, z: 0 };
    const currentMagnitude = Math.sqrt(currentSpeed.x * currentSpeed.x + currentSpeed.z * currentSpeed.z);
    const smoothingFactor = isMobileDevice() ? 0.15 : 0.25;
    adjustedSpeed = currentMagnitude + (targetSpeed - currentMagnitude) * smoothingFactor;
    
    // Scale by delta time for frame rate independence
    return adjustedSpeed * (delta / (1/60));
}, [isMobileDevice, isHeavyMap]);

  // Update getAdjustedMovementParams to use component's utility functions
  const getAdjustedMovementParams = useCallback(() => {
    const params = {
      moveSpeed: MOVE_SPEED,
      sprintSpeed: SPRINT_SPEED,
      jumpForce: JUMP_FORCE,
      velocityDamping: 1.0,
      inputSmoothing: 1.0,
      physicsSteps: 1
    };
    
    if (isMobileDevice()) {
      params.moveSpeed = MOBILE_MOVE_SPEED;
      params.sprintSpeed = MOBILE_SPRINT_SPEED;
      
      // Apply stronger damping and smoothing for mobile
      params.velocityDamping = 0.92; // Increased from 0.99 for more stability
      params.inputSmoothing = 0.90; // Increased from 0.98 for smoother input
      params.physicsSteps = 1.2; // Increased from 0.9 for more accurate physics
    }
    
    return params;
  }, [isMobileDevice]);

  // Camera position update function
  const updateCameraPosition = useCallback((
    state: any, 
    translation: { x: number, y: number, z: number }, 
    rotationX: number, 
    rotationY: number, 
    bobOffset: number,
    concussionRotationRef: { x: number, y: number },
    ref: React.RefObject<any>
  ) => {
    // Update the camera position to follow the player
    state.camera.position.x = translation.x;
    state.camera.position.y = translation.y + 1.5 + bobOffset;
    state.camera.position.z = translation.z;
    
    // Set the camera rotation (order matters for Euler angles)
    state.camera.rotation.order = 'YXZ';
    
    // Always apply the base rotation and add concussion effect if active
    state.camera.rotation.x = rotationX + concussionRotationRef.x;
    state.camera.rotation.y = rotationY + concussionRotationRef.y;
    state.camera.rotation.z = 0;
  }, []);

  // Add specific handler for toris map transitions
  useEffect(() => {
    if (currentMap === 'toris') {
      const spawnPosition = spawnPoints.toris.position;
      
      // Function to reset player physics state
      const resetPlayerState = () => {
        if (ref.current) {
          // Stop all movement
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
          
          // Reset position to spawn point
          ref.current.setTranslation({ 
            x: spawnPosition[0], 
            y: spawnPosition[1], 
            z: spawnPosition[2] 
          }, true);
          
          // Reset rotation values - use a default if property not available
          const spawnRotation = SPAWN_ROTATIONS[currentMap as keyof typeof SPAWN_ROTATIONS];
          if (spawnRotation) {
            rotationX.current = spawnRotation.x * (Math.PI / 180);
            rotationY.current = spawnRotation.y * (Math.PI / 180);
          } else {
            // Fallback to default rotation
            rotationX.current = 3.43 * (Math.PI / 180);
            rotationY.current = 134.61 * (Math.PI / 180);
          }
          
          console.log('🎮 Player physics reset for toris map');
        }
      };
      
      // Reset on map load
      resetPlayerState();
      
      // Listen for reset events
      window.addEventListener('reset-player-state', resetPlayerState);
      
      return () => {
        window.removeEventListener('reset-player-state', resetPlayerState);
      };
    } else if (currentMap === 'central' && previousMap === 'toris') {
      // Special case for returning from toris to central
      console.log('🎮 Handling return from toris to central');
      
      const torisReturnPoint = RETURN_TO_CENTRAL_SPAWN_POINTS.toris;
      if (!torisReturnPoint) return;
      
      // Wait a short moment to ensure the map is loaded
      setTimeout(() => {
        if (ref.current) {
          // Apply the correct position and rotation
          ref.current.setTranslation({
            x: torisReturnPoint.position[0],
            y: torisReturnPoint.position[1],
            z: torisReturnPoint.position[2]
          }, true);
          
          // Reset velocity
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
          
          // Set rotation based on the return point rotation
          rotationX.current = (torisReturnPoint.rotation[0] * Math.PI) / 180;
          rotationY.current = (torisReturnPoint.rotation[1] * Math.PI) / 180;
          
          console.log('🎮 Applied toris return point position:', torisReturnPoint.position);
        }
      }, 100);
    }
  }, [currentMap, spawnPoints, previousMap]);

  // Listen for map transitions
  useEffect(() => {
    const handleMapTransition = (e: CustomEvent) => {
      if (e.detail && e.detail.from === 'toris' && e.detail.to === 'central') {
        console.log('🎮 Detected transition from toris to central');
        previousMap = 'toris';
      }
    };
    
    window.addEventListener('map-transition', handleMapTransition as EventListener);
    return () => {
      window.removeEventListener('map-transition', handleMapTransition as EventListener);
    };
  }, []);

  return (
    <>
      <RigidBody
        ref={ref}
        colliders={false}
        mass={1}
        type="dynamic"
        position={spawnPoints[currentMap as keyof typeof spawnPoints].position}
        enabledRotations={[false, false, false]}
        lockRotations={true}
        friction={currentMap === 'toris' ? 0.3 : 0.1}
        restitution={0}
        linearDamping={currentMap === 'toris' ? 0.5 : 0.2}
        angularDamping={0.95}
        gravityScale={isFrozen ? 0 : (currentMap === 'toris' ? 0.7 : 1)}
        userData={{ type: 'player' }}
        onCollisionEnter={() => {
          if (Date.now() - lastSpawnTime.current < 1000) {
            if (ref.current) {
              ref.current.applyImpulse({ x: 0, y: 2, z: 0 }, true);
            }
          }
        }}
      >
        <CapsuleCollider 
          args={[
            (currentMap === 'toris' ? PLAYER_HEIGHT * 0.4 : PLAYER_HEIGHT) / 2, 
            currentMap === 'toris' ? PLAYER_RADIUS * 0.4 : PLAYER_RADIUS
          ]} 
          sensor={false}
          friction={0.1}
          restitution={0}
        />
      </RigidBody>
      
      {(qrCubes[currentMap] || []).map((position, index) => (
        <QRCube key={`${currentMap}-${index}`} position={position} />
      ))}
    </>
  );
} 