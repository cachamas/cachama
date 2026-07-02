import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { useMapStore } from './World';
import QRCube from './QRCube';
import { useLoadingStore } from '../../stores/loadingStore';
import { MobileControlsState } from '../../hooks/useMobileControls';
import { debugLog } from '../../stores/debugStore';
import {
  MOVE_SPEED,
  ROTATION_SPEED,
  JUMP_FORCE,
  JUMP_COOLDOWN,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_CAMERA_OFFSET,
  MAX_VERTICAL_ANGLE,
  SHOOT_COOLDOWN,
  CONCUSSION_MOVEMENT_PENALTY,
  SPAWN_HEIGHT_OFFSET,
  FALL_THRESHOLD,
  MUSIC_FALL_THRESHOLD,
  OVERWORLD_FALL_THRESHOLD,
  POST_LOADING_FALL_TOLERANCE,
  HEAVY_MAPS,
  LOAD_PROTECTION_TIME,
  CENTRAL_TARGET,
  PLAYER_INITIAL_SPAWN_POINTS,
  RETURN_TO_CENTRAL_SPAWN_POINTS,
  PLAYER_MASS,
  MOBILE_LOOK_SENSITIVITY,
  MOBILE_HORIZONTAL_SENSITIVITY_MULTIPLIER,
  MOBILE_DEADZONE,
  MOBILE_LOOK_ACTIVATION_THRESHOLD,
  MOBILE_LOOK_ROTATION_DELTA_MIN,
  MOBILE_STUCK_CHECK_LIMIT,
  GROUNDED_VELOCITY_THRESHOLD,
  MOUSE_SENSITIVITY_MULTIPLIER,
} from '../../lib/physicsConfig';

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



// Track the previous map for teleport rotations
let previousMap = '';

interface PlayerProps {

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

export default function Player({ mobileControls }: PlayerProps) {
  const { currentMap, spawnPoints, isTransitioning } = useMapStore();
  const { isLoading, isPhysicsReady } = useLoadingStore();

  const ref = useRef<RigidBodyType>(null);
  const [, getKeys] = useKeyboardControls();
  const rotationY = useRef(0);
  const rotationX = useRef(0);
  const jumpCooldown = useRef(false);
  const bobOffset = useRef(0);
  const [lastShotTime, setLastShotTime] = useState(0);

  const lastSpawnTime = useRef(0);
  const [qrCubes, setQrCubes] = useState<Record<string, Array<[number, number, number]>>>({});
  const { camera } = useThree();
  const lastMovementState = useRef(false);
  const intendedSpawnY = useRef<number | null>(null);
  const [isConcussed, setIsConcussed] = useState(false);
  const concussionRotationRef = useRef({ x: 0, y: 0 });

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
        (Math.abs(mobileControls.lookX) > MOBILE_LOOK_ACTIVATION_THRESHOLD || Math.abs(mobileControls.lookY) > MOBILE_LOOK_ACTIVATION_THRESHOLD)) {
      
      const rotationDelta = Math.abs(currentRotation.x - lastCameraRotationRef.current.x) +
                           Math.abs(currentRotation.y - lastCameraRotationRef.current.y);
                           
      if (rotationDelta < MOBILE_LOOK_ROTATION_DELTA_MIN) {
        consecutiveStuckChecksRef.current++;
        
        if (consecutiveStuckChecksRef.current >= MOBILE_STUCK_CHECK_LIMIT) {
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
        const lookSensitivity = MOBILE_LOOK_SENSITIVITY;
        const horizontalSensitivity = lookSensitivity * MOBILE_HORIZONTAL_SENSITIVITY_MULTIPLIER;
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
      const spawnY = spawnData.position[1] + SPAWN_HEIGHT_OFFSET;
      intendedSpawnY.current = spawnY;

      // Set initial position with additional height for safety
      ref.current.setTranslation({ 
        x: spawnData.position[0], 
        y: spawnY, 
        z: spawnData.position[2]
      }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);

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
          const mapRotations = PLAYER_INITIAL_SPAWN_POINTS[currentMap as keyof typeof PLAYER_INITIAL_SPAWN_POINTS];
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
            // Additional safety check after loading
            if (ref.current) {
              const pos = ref.current.translation();
              // If player somehow fell, reset to spawn position
              if (pos.y < intendedSpawnY.current! - POST_LOADING_FALL_TOLERANCE) {
                console.log('Post-loading safety correction applied');
                ref.current.setTranslation({
                  x: spawnData.position[0],
                  y: intendedSpawnY.current!,
                  z: spawnData.position[2]
                }, true);
                ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
              }
            }
            // Signal that player spawn is fully confirmed for heavy maps
            window.dispatchEvent(new CustomEvent('player-spawn-complete', { detail: { map: currentMap } }));
          }, LOAD_PROTECTION_TIME);
        } else {
          // Signal that player spawn is fully confirmed for light maps (after settling buffer)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('player-spawn-complete', { detail: { map: currentMap } }));
          }, 500);
        }
      }, 20);

      // Update previous map for next teleport
      previousMap = currentMap;
    }
  }, [currentMap, spawnPoints]);

  // Add effect to handle M key for returning to central
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyM' && currentMap !== 'central' && currentMap !== 'overworld') {
        console.log('🌐 M key pressed - returning to central map');
        
        // Show return message in help text format
        window.dispatchEvent(new CustomEvent('show-message', {
          detail: { 
            message: 'RETURNING TO CENTRAL...', 
            duration: 2000,
            helpText: true
          }
        }));

        // Wait for message to be shown before teleporting
        setTimeout(() => {
          // Trigger the full teleport experience with loading screen
          window.dispatchEvent(new CustomEvent('trigger-teleport', { 
            detail: { targetMap: 'central', fromMap: currentMap } 
          }));
        }, 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMap]);

  useFrame((state) => {
    if (!ref.current || isTransitioning) return;

    const translation = ref.current.translation();
    const vel = ref.current.linvel();

    // Fall detection / respawn
    const spawnData = spawnPoints[currentMap as keyof typeof spawnPoints];
    if (spawnData?.position) {
      const threshold = currentMap === 'music' ? MUSIC_FALL_THRESHOLD :
        currentMap === 'overworld' ? OVERWORLD_FALL_THRESHOLD : FALL_THRESHOLD;
      if (translation.y < spawnData.position[1] - threshold) {
        const spawnY = spawnData.position[1] + SPAWN_HEIGHT_OFFSET;
        ref.current.setTranslation({ x: spawnData.position[0], y: spawnY, z: spawnData.position[2] }, true);
        ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        lastSpawnTime.current = Date.now();
        return;
      }
    }

    // --- INPUT ---
    const { forward, backward, left, right, jump } = getKeys();
    let inputX = 0;
    let inputZ = 0;
    if (forward) inputZ -= 1;
    if (backward) inputZ += 1;
    if (right) inputX += 1;
    if (left) inputX -= 1;

    if (mobileControls?.activeMoveJoystick) {
      const deadzone = MOBILE_DEADZONE;
      const mx = Math.abs(mobileControls.moveX) > deadzone ? mobileControls.moveX : 0;
      const my = Math.abs(mobileControls.moveY) > deadzone ? mobileControls.moveY : 0;
      if (Math.abs(mx) > Math.abs(inputX)) inputX = mx;
      if (Math.abs(my) > Math.abs(inputZ)) inputZ = my;
    }

    const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (len > 1) { inputX /= len; inputZ /= len; }

    // Camera-relative direction (W = forward where camera looks)
    const angle = rotationY.current;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const moveX = inputX * cos + inputZ * sin;
    const moveZ = -inputX * sin + inputZ * cos;
    const isMoving = moveX !== 0 || moveZ !== 0;

    // --- VELOCITY (direct, no smoothing, no double gravity) ---
    const speed = MOVE_SPEED * (isConcussed ? CONCUSSION_MOVEMENT_PENALTY : 1);
    ref.current.setLinvel({ x: moveX * speed, y: vel.y, z: moveZ * speed }, true);

    // --- JUMP ---
    const isGrounded = Math.abs(vel.y) < GROUNDED_VELOCITY_THRESHOLD;
    if (jump && isGrounded && !jumpCooldown.current && !isConcussed) {
      ref.current.setLinvel({ x: moveX * speed, y: JUMP_FORCE, z: moveZ * speed }, true);
      jumpCooldown.current = true;
      setTimeout(() => { jumpCooldown.current = false; }, JUMP_COOLDOWN);
    }

    // Movement state for UI
    if (isMoving !== lastMovementState.current) {
      lastMovementState.current = isMoving;
      window.dispatchEvent(new CustomEvent('player-movement', { detail: { isMoving } }));
    }

    // --- CAMERA ---
    state.camera.position.x = translation.x;
    state.camera.position.y = translation.y + PLAYER_CAMERA_OFFSET;
    state.camera.position.z = translation.z;
    state.camera.rotation.order = 'YXZ';
    state.camera.rotation.x = rotationX.current + concussionRotationRef.current.x;
    state.camera.rotation.y = rotationY.current + concussionRotationRef.current.y;
    state.camera.rotation.z = 0;
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
      const spawnPoint = PLAYER_INITIAL_SPAWN_POINTS[currentMap as keyof typeof PLAYER_INITIAL_SPAWN_POINTS];
      if (spawnPoint) {
        targetPosition = spawnPoint.position;
        // Use default rotation if available
        if ('rotation' in spawnPoint) {
          targetRotation = (spawnPoint as any).rotation;
        }
      }
    }

    if (targetPosition) {
      ref.current.setTranslation({
        x: targetPosition[0],
        y: targetPosition[1] + SPAWN_HEIGHT_OFFSET,
        z: targetPosition[2]
      }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Hard-coded override for iOS GCT: spawn higher and more forward to avoid geometry
    if (currentMap === 'gct' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      ref.current.setTranslation({
        x: targetPosition ? targetPosition[0] : -62.27,
        y: 50,
        z: -7
      }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
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
          const mapRotations = PLAYER_INITIAL_SPAWN_POINTS[currentMap as keyof typeof PLAYER_INITIAL_SPAWN_POINTS];
          const rotation = currentMap === 'overworld' && previousMap === 'central'
            ? mapRotations.fromCentral
            : mapRotations.default;
          
          if (rotation) {
            rotationX.current = (rotation.x * Math.PI) / 180;
            rotationY.current = (rotation.y * Math.PI) / 180;
          }
        }

        // Request pointer lock again (desktop only; iOS will throw)
        try {
          const canvas = document.querySelector('canvas');
          const isMapOpen = document.body.getAttribute('data-map-open') === 'true';
          if (canvas && !document.pointerLockElement && !isMapOpen) {
            canvas.requestPointerLock();
          }
        } catch {
          // iOS doesn't support pointer lock
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
          rotationY.current -= event.movementX * ROTATION_SPEED * MOUSE_SENSITIVITY_MULTIPLIER;
          rotationX.current -= event.movementY * ROTATION_SPEED * MOUSE_SENSITIVITY_MULTIPLIER;
          
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
        mass={PLAYER_MASS}
        type="dynamic"
        position={spawnPoints[currentMap as keyof typeof spawnPoints].position}
        enabledRotations={[false, false, false]}
        friction={0}
        restitution={0}
        linearDamping={0}
        angularDamping={0}
        canSleep={false}
        userData={{ type: 'player' }}
      >
        <CapsuleCollider 
          args={[PLAYER_HEIGHT / 2, PLAYER_RADIUS]} 
          sensor={false}
          friction={0}
          restitution={0}
        />
      </RigidBody>
      
      {(qrCubes[currentMap] || []).map((position, index) => (
        <QRCube key={`${currentMap}-${index}`} position={position} />
      ))}
    </>
  );
} 