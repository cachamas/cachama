import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { isViewmodelPreloaded } from '../../utils/viewmodelPreloader';
import { debugLog } from '../../stores/debugStore';

interface AnimationState {
  walk: { x: number; y: number };
  mouse: { x: number; y: number };
  recoil: { y: number };
  mobileMoving: boolean;
}

export default function SimpleViewmodel() {
  const viewmodelRef = useRef<HTMLImageElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const activeKeys = useRef(new Set<string>());
  const animState = useRef<AnimationState>({
    walk: { x: 0, y: 0 },
    mouse: { x: 0, y: 0 },
    recoil: { y: 0 },
    mobileMoving: false
  });
  const lastMouseMove = useRef({ x: 0, y: 0, time: 0 });
  const animationFrameRef = useRef<number>();
  
  // Animation state
  const currentAnimation = useRef<'idle' | 'drinking' | 'throwing'>('idle');
  const currentFrame = useRef<number>(1);
  const drinkAnimationProgress = useRef<number>(0);
  
  const [preventThrow, setPreventThrow] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<any>(null);
  
  // Check if viewmodel images are preloaded
  useEffect(() => {
    if (!isViewmodelPreloaded()) {
      debugLog('SimpleViewmodel', 'Images not preloaded yet');
    }
  }, []);

  // Update viewport size
  useEffect(() => {
    function updateSize() {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animation functions
  function playDrinkAnimation() {
    console.log('🚨 DRINK ANIMATION STARTED 🚨');
    if (currentAnimation.current !== 'idle' || !viewmodelRef.current) {
      console.log('🚨 Animation blocked - current state:', currentAnimation.current, '🚨');
      return;
    }

    // Set animation state
    currentAnimation.current = 'drinking';
    currentFrame.current = 1;
    drinkAnimationProgress.current = 0;
    
    // Update image source directly
    viewmodelRef.current.src = '/images/viewmodel/drink1.webp';
    console.log('🚨 Set image to drink1.webp 🚨');
    
    // Animate the can moving up smoothly
    const drinkDuration = 1000;
    const startTime = performance.now();
    
    const animateDrinking = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / drinkDuration, 1);
      drinkAnimationProgress.current = progress;
      
      // After 300ms, show frame 2
      if (progress >= 0.3 && currentFrame.current === 1) {
        currentFrame.current = 2;
        if (viewmodelRef.current) {
          viewmodelRef.current.src = '/images/viewmodel/drink2.webp';
          console.log('🚨 Set image to drink2.webp 🚨');
        }
      }
      
      // Apply transformations for drinking animation
      if (viewmodelRef.current) {
        // First phase: Move up and scale smoothly (0-30%)
        if (progress < 0.3) {
          const upProgress = progress / 0.3;
          const moveY = -15 * upProgress;
          const scale = 1.0 + (0.1 * upProgress);
          const moveX = -120 * upProgress; // More centered
          
          viewmodelRef.current.style.transition = 'none';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
        } 
        // Second phase: Drinking position (30-70%)
        else if (progress < 0.7) {
          const drinkProgress = (progress - 0.3) / 0.4;
          const moveY = -15 + (200 * drinkProgress); // Much lower
          const scale = 1.1 + (0.2 * drinkProgress);
          const moveX = -120 + (110 * drinkProgress); // More centered movement
          const rotate = 5 * drinkProgress;
          
          viewmodelRef.current.style.transition = 'none';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale}) rotate(${rotate}deg)`;
        }
        // Third phase: Return smoothly (70-100%)
        else {
          const returnProgress = (progress - 0.7) / 0.3;
          const moveY = 185 * (1 - returnProgress); // Adjusted for new lower position
          const scale = 1.3 - (0.3 * returnProgress);
          const moveX = -10 * (1 - returnProgress); // Minimal sway
          const rotate = 5 * (1 - returnProgress);
          
          viewmodelRef.current.style.transition = 'none';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale}) rotate(${rotate}deg)`;
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateDrinking);
      } else {
        // Animation complete
        currentAnimation.current = 'idle';
        currentFrame.current = 1;
        drinkAnimationProgress.current = 0;
        
        if (viewmodelRef.current) {
          viewmodelRef.current.src = '/images/viewmodel/viewmodel1.webp';
          viewmodelRef.current.style.transform = '';
          console.log('🚨 Set image back to viewmodel1.webp 🚨');
        }
      }
    };
    
    requestAnimationFrame(animateDrinking);
  }

  function spawnProjectile() {
    console.log('🚨 SPAWNING PROJECTILE 🚨');
    
    // Dispatch player-shoot event - World component will handle camera position and direction
    window.dispatchEvent(new CustomEvent('player-shoot', {
      detail: {}  // World component will handle getting camera position and direction
    }));
  }

  function playThrowAnimation() {
    console.log('🚨 THROW ANIMATION STARTED 🚨');
    if (currentAnimation.current !== 'idle' || !viewmodelRef.current) {
      console.log('🚨 Animation blocked - current state:', currentAnimation.current, '🚨');
      return;
    }

    // Check if throwing is prevented by game state
    if (preventThrow) {
      console.log('🚨 Throwing prevented by game state 🚨');
      return;
    }

    // Set animation state
    currentAnimation.current = 'throwing';
    currentFrame.current = 1;
    
    // Update image source directly
    viewmodelRef.current.src = '/images/viewmodel/throw1.webp';
    console.log('🚨 Set image to throw1.webp 🚨');
    
    // Animate the throwing motion
    const throwDuration = 1000; // Increased duration for more impact
    const startTime = performance.now();
    
    const animateThrowing = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / throwDuration, 1);
      
      // Frame transitions - longer time on throw2 with dynamic movement
      if (progress >= 0.45 && progress < 0.8 && currentFrame.current === 1) {
        currentFrame.current = 2;
        if (viewmodelRef.current) {
          viewmodelRef.current.src = '/images/viewmodel/throw2.webp';
          console.log('🚨 Set image to throw2.webp 🚨');
          
          // Dispatch event for World to handle can spawn
          window.dispatchEvent(new CustomEvent('start-throw-animation'));
        }
      } else if (progress >= 0.8 && currentFrame.current === 2) {
        currentFrame.current = 3;
        if (viewmodelRef.current) {
          viewmodelRef.current.src = '/images/viewmodel/viewmodel1.webp';
          console.log('🚨 Set image to viewmodel1.webp for pickup 🚨');
        }
      }
      
      // Apply transformations for throwing animation
      if (viewmodelRef.current) {
        const baseScale = 1.15;
        
        // First phase: Wind up (0-35%)
        if (progress < 0.35) {
          const windupProgress = progress / 0.35;
          const moveY = -15 * windupProgress;
          const moveX = -20 * windupProgress;
          const windupScale = baseScale + (0.05 * Math.sin(windupProgress * Math.PI));
          
          viewmodelRef.current.style.transition = 'transform 0.05s ease-out';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${windupScale})`;
        } 
        // Second phase: Extended throw forward (35-80%)
        else if (progress < 0.8) {
          const throwProgress = (progress - 0.35) / 0.45;
          const moveY = -15 + (-25 * throwProgress);
          const moveX = -20 + (60 * throwProgress);
          
          // Smoother scale during throw
          const throwScale = baseScale + (0.1 * Math.sin(throwProgress * Math.PI));
          
          viewmodelRef.current.style.transition = 'transform 0.05s ease-out';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${throwScale})`;
        }
        // Third phase: Complete motion from bottom (80-100%)
        else {
          const finalProgress = (progress - 0.8) / 0.2;
          
          // Smooth easing for the pickup motion
          const easeInOutCubic = finalProgress < 0.5
            ? 4 * finalProgress * finalProgress * finalProgress
            : 1 - Math.pow(-2 * finalProgress + 2, 3) / 2;
          
          // Use the eased progress for smoother motion
          const moveY = 150 * (1 - easeInOutCubic);
          const moveX = 60 * (1 - easeInOutCubic);
          
          // Smoother scale transition for pickup
          const pickupScale = baseScale + (0.05 * (1 - easeInOutCubic));
          
          viewmodelRef.current.style.transition = 'transform 0.1s ease-out';
          viewmodelRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(${pickupScale})`;
          
          // When reaching the end of the animation, smoothly transition to idle state
          if (finalProgress > 0.95) {
            viewmodelRef.current.style.transition = 'transform 0.15s ease-out';
            viewmodelRef.current.style.transform = `scale(${baseScale})`;
          }
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateThrowing);
      } else {
        // Animation complete
        currentAnimation.current = 'idle';
        currentFrame.current = 1;
        
        if (viewmodelRef.current) {
          // Set final transform with sprint intensity scale
          const sprintIntensity = 1.15; // Match the sprint intensity from the movement system
          viewmodelRef.current.style.transition = 'transform 0.15s ease-out';
          viewmodelRef.current.style.transform = `scale(${sprintIntensity})`;
        }
      }
    };
    
    requestAnimationFrame(animateThrowing);
  }

  // Handle hover object change event
  const handleHoverChange = useCallback((e: CustomEvent<{object: any}>) => {
    if (e && e.detail) {
      setHoveredObject(e.detail.object);
    } else {
      setHoveredObject(null);
    }
  }, []);
  
  // Combined animation and movement system
  useEffect(() => {
    let lastTime = performance.now();
    
    function animate() {
      const currentTime = performance.now();
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Mouse movement decay
      const mouseDecay = Math.pow(0.1, delta);
      animState.current.mouse.x *= mouseDecay;
      animState.current.mouse.y *= mouseDecay;

      // Check movement state - include both keyboard and mobile movement
      const isMoving = activeKeys.current.has('KeyW') || 
                      activeKeys.current.has('KeyS') || 
                      activeKeys.current.has('KeyA') || 
                      activeKeys.current.has('KeyD') ||
                      activeKeys.current.has('ArrowUp') ||
                      activeKeys.current.has('ArrowDown') ||
                      activeKeys.current.has('ArrowLeft') ||
                      activeKeys.current.has('ArrowRight') ||
                      animState.current.mobileMoving;
      
      // Always use sprint intensity for movement
      const isSprinting = true; // Always use sprint movement

      // Walking animation
      if (isMoving) {
        // Slower timing for more natural walking pace
        const walkTime = currentTime * (isSprinting ? 0.004 : 0.003);
        
        if (isSprinting) {
          // More pronounced sprint movement
          animState.current.walk.x = Math.sin(walkTime) * 4;
          // Deeper vertical movement + slight forward tilt
          animState.current.walk.y = Math.abs(Math.sin(walkTime * 2)) * 6 + 
                                   Math.sin(walkTime) * 2;
        } else {
          // Gentler walking sway
          animState.current.walk.x = Math.sin(walkTime) * 2;
          // Deeper walking bob + slight forward tilt
          animState.current.walk.y = Math.abs(Math.sin(walkTime * 2)) * 3 + 
                                   Math.sin(walkTime) * 1;
        }
      } else {
        // Smoother reset
        animState.current.walk.x *= 0.85;
        animState.current.walk.y *= 0.85;
      }

      // Apply movement to viewmodel
      if (viewmodelRef.current && currentAnimation.current === 'idle') {
        const sprintIntensity = 1.15; // Always use sprint intensity
        const totalOffset = {
          x: (animState.current.walk.x + animState.current.mouse.x) * 2,
          y: (animState.current.walk.y + animState.current.mouse.y) * 2.5
        };

        viewmodelRef.current.style.transform = `
          translate(${totalOffset.x}px, ${totalOffset.y}px)
          scale(${sprintIntensity})
        `;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    // Key handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.current.add(e.code);
      
      // Animation controls
      if (e.code === 'KeyB') {
        console.log('🚨 B KEY PRESSED - DRINKING 🚨');
        playDrinkAnimation();
      } else if (e.code === 'KeyN') {
        console.log('🚨 N KEY PRESSED - THROWING 🚨');
        playThrowAnimation();
      } else if (e.code === 'KeyF') {
        console.log('🚨 F KEY PRESSED - SHOOTING 🚨');
        spawnProjectile();
        // Add recoil effect
        if (viewmodelRef.current) {
          animState.current.recoil.y = 5; // Add upward recoil
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
    };

    // Mouse handler
    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;

      const sensitivity = 0.045;
      const now = performance.now();
      const timeDelta = now - lastMouseMove.current.time;
      
      if (timeDelta > 0) {
        const scaledX = e.movementX * sensitivity;
        const scaledY = e.movementY * sensitivity;

        animState.current.mouse.x -= scaledX;
        animState.current.mouse.y -= scaledY;

        lastMouseMove.current = { x: e.movementX, y: e.movementY, time: now };
      }
    };
    
    const handlePreventThrow = () => {
      setPreventThrow(true);
      setTimeout(() => setPreventThrow(false), 100); // Reset after a short delay
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      
      console.log('🚨 MOUSE BUTTON PRESSED:', e.button, '🚨');
      
      if (e.button === 0) { // Left click
        console.log('🚨 LEFT CLICK - THROWING 🚨');
        // Check if we should prevent throwing
        const isHovered = (window as any).__isHoveringInteractable__;
        if (isHovered) {
          console.log('🚨 THROW BLOCKED - Hovering over interactable 🚨');
          return;
        }
        if (preventThrow) {
          console.log('🚨 THROW PREVENTED - HOVERING OVER INTERACTABLE 🚨');
          return;
        }
        playThrowAnimation();
      } else if (e.button === 2) { // Right click
        console.log('🚨 RIGHT CLICK - DRINKING 🚨');
        playDrinkAnimation();
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      console.log('🚨 CONTEXT MENU PREVENTED 🚨');
      return false;
    };

    // Mobile event handlers
    const handleMobileMove = (e: CustomEvent<{x: number, y: number}>) => {
      const { x, y } = e.detail;
      
      // Detect if mobile is moving based on joystick values
      const joystickMagnitude = Math.sqrt(x * x + y * y);
      
      // Set mobile moving state if joystick movement exceeds threshold
      animState.current.mobileMoving = joystickMagnitude > 0.1;
      
      // Optional: add some viewmodel sway based on joystick direction
      if (animState.current.mobileMoving) {
        animState.current.mouse.x = -x * 3;
        animState.current.mouse.y = y * 2;
      }
    };
    
    // Handle mobile look/camera movement
    const handleMobileLook = (e: CustomEvent<{x: number, y: number}>) => {
      if (!('ontouchstart' in window)) return;

      const { x, y } = e.detail;
      const sensitivity = 0.265; // Increased by 65% from 0.1 for more dramatic mobile sway
      
      // Apply camera movement to viewmodel sway
      animState.current.mouse.x -= x * sensitivity;
      animState.current.mouse.y -= y * sensitivity;
      
      lastMouseMove.current = { 
        x: x * sensitivity, 
        y: y * sensitivity, 
        time: performance.now() 
      };
    };

    const handleMobileShoot = () => {
      if (document.documentElement.classList.contains('pointer-lock-element') || 
          document.pointerLockElement ||
          'ontouchstart' in window) {
        console.log('🚨 MOBILE SHOOT DETECTED 🚨');
        
        // Check if we're hovering over an interactable
        const isHoveringInteractable = (window as any).__isHoveringInteractable__;
        
        if (isHoveringInteractable) {
          // Cancel any ongoing throw animation
          window.dispatchEvent(new CustomEvent('cancel-throw'));
          window.dispatchEvent(new CustomEvent('stop-throw-animation'));
          window.dispatchEvent(new CustomEvent('reset-viewmodel'));
          
          // Trigger interaction with the currently hovered object
          window.dispatchEvent(new CustomEvent('interact-with-object'));
          console.log('🚨 Interacting with object 🚨');
        } else {
          // Execute the throw animation
          playThrowAnimation();
          console.log('🚨 THROWING CAN 🚨');
        }
      }
    };

    // Register all event listeners
    animationFrameRef.current = requestAnimationFrame(animate);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('prevent-throw-change', handlePreventThrow as EventListener);
    window.addEventListener('hover-object-changed', handleHoverChange as EventListener);
    
    // Mobile-specific events
    window.addEventListener('mobile-move', handleMobileMove as EventListener);
    window.addEventListener('mobile-look', handleMobileLook as EventListener);
    window.addEventListener('mobile-shoot', handleMobileShoot);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('prevent-throw-change', handlePreventThrow as EventListener);
      window.removeEventListener('hover-object-changed', handleHoverChange as EventListener);
      
      // Clean up mobile event listeners
      window.removeEventListener('mobile-move', handleMobileMove as EventListener);
      window.removeEventListener('mobile-look', handleMobileLook as EventListener);
      window.removeEventListener('mobile-shoot', handleMobileShoot);
    };
  }, [handleHoverChange]);

  // Calculate adaptive size based on viewport and aspect ratio
  const baseSize = Math.min(viewportSize.width * 0.4, viewportSize.height * 0.45);
  const aspectRatio = viewportSize.width / viewportSize.height;
  const sizeAdjustment = aspectRatio > 1.5 
    ? { width: baseSize * 1.2, height: baseSize * 0.9 }
    : aspectRatio < 1 
      ? { width: baseSize * 1.4, height: baseSize * 1.4 }
      : { width: baseSize, height: baseSize };

  return (
    <div 
      className="fixed pointer-events-none z-[1000]"
      style={{
        right: aspectRatio > 1.5 ? '20%' : '-10%',
        bottom: aspectRatio < 1 ? '-10%' : '-15%',
        width: `${sizeAdjustment.width}px`,
        height: `${sizeAdjustment.height}px`,
        transition: 'width 0.2s, height 0.2s, right 0.3s ease-out'
      }}
    >
      <img
        ref={viewmodelRef}
        src="/images/viewmodel/viewmodel1.webp"
        alt="viewmodel"
        className="w-full h-full object-contain"
        style={{ 
          imageRendering: 'pixelated',
          transformOrigin: 'bottom right'
        }}
        onError={(e) => {
          console.error('🚨 IMAGE LOAD ERROR 🚨', e);
        }}
        onLoad={() => {
          console.log('🚨 IMAGE LOADED:', viewmodelRef.current?.src, '🚨');
        }}
      />
    </div>
  );
} 