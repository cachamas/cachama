import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, PointerLockControls } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import Player from './Player';
import World from './World';
import GameUI from '../ui/GameUI';
import Lights from './Lights';
import { useLoadingStore } from '@/stores/loadingStore';

// Define keyboard controls
const controls = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'sprint', keys: ['ShiftLeft'] }
];

export default function Game() {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const { setPhysicsReady, setMapFullyReady } = useLoadingStore();

  // Notify loading system when game is ready
  useEffect(() => {
    // Wait for physics and map to be ready
    const checkGameReady = () => {
      const physicsReady = document.body.getAttribute('data-physics-ready') === 'true';
      const texturesLoaded = document.body.getAttribute('data-textures-loaded') === 'true';
      const geometriesLoaded = document.body.getAttribute('data-geometries-loaded') === 'true';
      
      if (physicsReady && texturesLoaded && geometriesLoaded) {
        setPhysicsReady(true);
        setMapFullyReady(true);
        // Dispatch event that game is fully initialized
        window.dispatchEvent(new CustomEvent('game-fully-initialized'));
        console.log('Game fully initialized - all systems ready');
      } else {
        // Check again in a short while
        setTimeout(checkGameReady, 100);
      }
    };

    // Start checking
    checkGameReady();

    return () => {
      setPhysicsReady(false);
      setMapFullyReady(false);
    };
  }, [setPhysicsReady, setMapFullyReady]);

  return (
    <>
      <Canvas
        className="game-canvas"
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          fov: 90,
          near: 0.1,
          far: 1000,
          position: [0, 2, 5],
        }}
        dpr={0.5}
        style={{
          imageRendering: 'pixelated',
          width: '100%',
          height: '100%'
        }}
      >
        <Physics>
          <KeyboardControls map={controls}>
            <PointerLockControls />
            <Suspense fallback={null}>
              <Lights />
              <Player 
                onPositionChange={setPosition} 
              />
              <World />
            </Suspense>
          </KeyboardControls>
        </Physics>
      </Canvas>

      {/* Game UI Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <GameUI position={position} />
      </div>
    </>
  );
} 