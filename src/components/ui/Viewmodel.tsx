import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { debugLog } from '../../stores/debugStore';
import { isViewmodelPreloaded } from '../../utils/viewmodelPreloader';

interface ViewmodelProps {
  isMoving: boolean;
  showDebug: boolean;
  onSpawnCan?: (position: THREE.Vector3, direction: THREE.Vector3) => void;
}

export default function Viewmodel({ isMoving, showDebug, onSpawnCan }: ViewmodelProps) {
  const viewmodelRef = useRef<HTMLImageElement>(null);
  const swayX = useRef(0);
  const swayY = useRef(0);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const animationFrameRef = useRef<number>();
  const animationState = useRef<'idle' | 'drinking' | 'throwing'>('idle');
  const currentFrame = useRef(1);
  const { camera } = useThree();

  // SUPER EXPLICIT DEBUG
  console.log('🚨 VIEWMODEL RENDERED 🚨');

  // Check if viewmodel images are preloaded
  useEffect(() => {
    if (!isViewmodelPreloaded()) {
      debugLog('Viewmodel', 'Images not preloaded yet');
    }
  }, []);

  // Handle mouse movement for sway effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        const sensitivity = 0.015;
        const deltaX = e.movementX * sensitivity;
        const deltaY = e.movementY * sensitivity;
        
        // Smooth sway based on mouse movement
        swayX.current = Math.max(-10, Math.min(10, swayX.current + deltaX));
        swayY.current = Math.max(-10, Math.min(10, swayY.current + deltaY));
        
        lastMouseX.current = e.movementX;
        lastMouseY.current = e.movementY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animation update using requestAnimationFrame
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!viewmodelRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Return to center position
      const returnSpeed = 5;
      swayX.current = swayX.current * (1 - returnSpeed * delta);
      swayY.current = swayY.current * (1 - returnSpeed * delta);

      // Add walking/running bob effect when moving
      if (isMoving) {
        const bobSpeed = 8;
        const bobAmount = 2;
        const time = currentTime / 1000;
        swayY.current += Math.sin(time * bobSpeed) * bobAmount * delta;
      }

      // Apply transformations
      const translateX = swayX.current;
      const translateY = swayY.current;
      viewmodelRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMoving]);

  // DIRECT DOM MANIPULATION FOR ANIMATIONS
  function playDrinkAnimation() {
    console.log('🚨 DRINK ANIMATION STARTED 🚨');
    if (!viewmodelRef.current || animationState.current !== 'idle') {
      console.log('🚨 Animation blocked - current state:', animationState.current, '🚨');
      return;
    }

    // Set animation state
    animationState.current = 'drinking';
    currentFrame.current = 1;
    
    // Update image source directly
    viewmodelRef.current.src = '/images/viewmodel/drink1.webp';
    console.log('🚨 Set image to drink1.webp 🚨');
    
    // After 150ms, show frame 2
    setTimeout(() => {
      if (!viewmodelRef.current) return;
      
      currentFrame.current = 2;
      viewmodelRef.current.src = '/images/viewmodel/drink2.webp';
      console.log('🚨 Set image to drink2.webp 🚨');
      
      // Return to idle after 300ms
      setTimeout(() => {
        if (!viewmodelRef.current) return;
        
        animationState.current = 'idle';
        currentFrame.current = 1;
        viewmodelRef.current.src = '/images/viewmodel/viewmodel1.webp';
        console.log('🚨 Set image back to viewmodel1.webp 🚨');
      }, 300);
    }, 150);
  }

  function playThrowAnimation() {
    console.log('🚨 THROW ANIMATION STARTED 🚨');
    if (!viewmodelRef.current || animationState.current !== 'idle') {
      console.log('🚨 Animation blocked - current state:', animationState.current, '🚨');
      return;
    }

    // Set animation state
    animationState.current = 'throwing';
    currentFrame.current = 1;
    
    // Update image source directly
    viewmodelRef.current.src = '/images/viewmodel/throw1.webp';
    console.log('🚨 Set image to throw1.webp 🚨');
    
    // After 150ms, show frame 2 and spawn can
    setTimeout(() => {
      if (!viewmodelRef.current) return;
      
      currentFrame.current = 2;
      viewmodelRef.current.src = '/images/viewmodel/throw2.webp';
      console.log('🚨 Set image to throw2.webp 🚨');
      
      // Spawn can
      if (onSpawnCan) {
        console.log('🚨 SPAWNING CAN 🚨');
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const position = camera.position.clone();
        position.add(direction.multiplyScalar(2));
        position.y -= 0.5;
        onSpawnCan(position, direction);
      } else {
        console.log('🚨 onSpawnCan is undefined 🚨');
      }
      
      // Return to idle after 300ms
      setTimeout(() => {
        if (!viewmodelRef.current) return;
        
        animationState.current = 'idle';
        currentFrame.current = 1;
        viewmodelRef.current.src = '/images/viewmodel/viewmodel1.webp';
        console.log('🚨 Set image back to viewmodel1.webp 🚨');
      }, 300);
    }, 150);
  }

  // Handle keyboard input for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      debugLog('Viewmodel', 'Key pressed', e.code);
      
      if (e.code === 'KeyB') {
        debugLog('Viewmodel', 'B key pressed - drinking');
        playDrinkAnimation();
      } else if (e.code === 'KeyN') {
        debugLog('Viewmodel', 'N key pressed - throwing');
        playThrowAnimation();
      } else if (e.code === 'KeyM') {
        // Debug key
        debugLog('Viewmodel', 'Debug info', {
          animationState: animationState.current,
          currentFrame: currentFrame.current,
          viewmodelRef: viewmodelRef.current,
          imageSrc: viewmodelRef.current?.src
        });
      }
    };

    debugLog('Viewmodel', 'Adding keyboard event listener');
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      debugLog('Viewmodel', 'Removing keyboard event listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [camera, onSpawnCan]);

  // Handle mouse input
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      console.log('🚨 MOUSE BUTTON PRESSED:', e.button, '🚨');
      
      if (!document.pointerLockElement) {
        console.log('🚨 Not in pointer lock, ignoring click 🚨');
        return;
      }
      
      if (e.button === 0) { // Left click
        console.log('🚨 LEFT CLICK - THROWING 🚨');
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

    console.log('🚨 ADDING MOUSE EVENT LISTENERS 🚨');
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      console.log('🚨 REMOVING MOUSE EVENT LISTENERS 🚨');
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, onSpawnCan]);

  return (
    <div 
      className="fixed bottom-0 right-0 pointer-events-none" 
      style={{ 
        zIndex: 9999,
        width: '400px',
        height: '400px',
        background: showDebug ? 'rgba(255,0,0,0.5)' : 'transparent',
      }}
    >
      {showDebug && (
        <div className="absolute top-0 left-0 text-white text-xs bg-black/80 p-2 rounded">
          <div>Viewmodel Debug:</div>
          <div>Moving: {isMoving ? 'Yes' : 'No'}</div>
          <div>Animation: {animationState.current}</div>
          <div>Frame: {currentFrame.current}</div>
          <div>Sway X: {swayX.current.toFixed(2)}</div>
          <div>Sway Y: {swayY.current.toFixed(2)}</div>
        </div>
      )}
      <img
        ref={viewmodelRef}
        src="/images/viewmodel/viewmodel1.webp"
        alt="Viewmodel"
        className="w-full h-full object-contain select-none"
        style={{
          transform: `translate(${swayX.current}px, ${swayY.current}px)`,
          transition: 'transform 0.1s ease-out'
        }}
        onError={(e) => {
          debugLog('Viewmodel', 'Image load error', e);
        }}
        onLoad={() => {
          debugLog('Viewmodel', 'Image loaded', viewmodelRef.current?.src);
        }}
      />
    </div>
  );
} 