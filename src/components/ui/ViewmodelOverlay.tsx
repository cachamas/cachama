import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { debugLog } from '../../stores/debugStore';

interface ViewmodelOverlayProps {
  isMoving: boolean;
  showDebug?: boolean;
}

export default function ViewmodelOverlay({ isMoving, showDebug = false }: ViewmodelOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewmodelRef = useRef<HTMLImageElement>(null);
  const animationState = useRef<'idle' | 'drinking' | 'throwing'>('idle');
  const currentFrame = useRef<number>(1);
  const swayX = useRef<number>(0);
  const swayY = useRef<number>(0);
  const lastMouseX = useRef<number>(0);
  const lastMouseY = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const { camera } = useThree();

  // Preload images
  useEffect(() => {
    const imagesToPreload = [
      '/images/viewmodel/viewmodel1.webp',
      '/images/viewmodel/drink1.webp',
      '/images/viewmodel/drink2.webp',
      '/images/viewmodel/throw1.webp',
      '/images/viewmodel/throw2.webp'
    ];
    
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
      console.log(`🔫 Preloading image: ${src}`);
    });
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

  // Animation loop for smooth movement
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!viewmodelRef.current) {
        animationFrameId.current = requestAnimationFrame(animate);
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

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isMoving]);

  // Animation functions
  const playAnimation = (type: 'drink' | 'throw') => {
    if (animationState.current !== 'idle' || !viewmodelRef.current) {
      console.log(`🔫 Animation blocked - current state: ${animationState.current}`);
      return;
    }
    
    console.log(`🔫 Playing ${type} animation`);
    
    // Set animation state
    animationState.current = type === 'drink' ? 'drinking' : 'throwing';
    currentFrame.current = 1;
    
    // Update image source for frame 1
    viewmodelRef.current.src = `/images/viewmodel/${type}${currentFrame.current}.webp`;
    
    // After 150ms, show frame 2
    setTimeout(() => {
      if (!viewmodelRef.current) return;
      
      currentFrame.current = 2;
      viewmodelRef.current.src = `/images/viewmodel/${type}${currentFrame.current}.webp`;
      
      // If throwing, spawn a can
      if (type === 'throw') {
        spawnCan();
      }
      
      // After 300ms more, return to idle
      setTimeout(() => {
        if (!viewmodelRef.current) return;
        
        animationState.current = 'idle';
        currentFrame.current = 1;
        viewmodelRef.current.src = '/images/viewmodel/viewmodel1.webp';
      }, 300);
    }, 150);
  };
  
  // Spawn a can in the 3D world
  const spawnCan = () => {
    console.log('🔫 Spawning can');
    
    // Get camera direction and position
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const position = camera.position.clone();
    position.add(direction.multiplyScalar(2));
    position.y -= 0.5;
    
    // Dispatch event for the 3D world to handle
    window.dispatchEvent(new CustomEvent('spawn-can', {
      detail: { position, direction }
    }));
  };

  // Handle mouse input
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      
      debugLog('ViewmodelOverlay', 'Mouse button pressed', e.button);
      
      if (e.button === 0) { // Left click
        playAnimation('throw');
      } else if (e.button === 2) { // Right click
        playAnimation('drink');
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Handle keyboard input for testing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyB') {
        debugLog('ViewmodelOverlay', 'B key pressed - drinking');
        playAnimation('drink');
      } else if (e.code === 'KeyN') {
        debugLog('ViewmodelOverlay', 'N key pressed - throwing');
        playAnimation('throw');
      } else if (e.code === 'KeyM') {
        // Debug key
        debugLog('ViewmodelOverlay', 'Debug info', {
          animationState: animationState.current,
          currentFrame: currentFrame.current,
          swayX: swayX.current,
          swayY: swayY.current,
          isMoving
        });
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [camera]);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 right-0 pointer-events-none" 
      style={{ 
        zIndex: 9999,
        width: '400px',
        height: '400px',
        background: showDebug ? 'rgba(255,0,0,0.1)' : 'transparent',
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
          debugLog('ViewmodelOverlay', 'Viewmodel image failed to load', e);
        }}
        onLoad={() => {
          debugLog('ViewmodelOverlay', 'Image loaded', viewmodelRef.current?.src);
        }}
      />
    </div>
  );
} 