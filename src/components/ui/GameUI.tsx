import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MusicPlayer } from '@/components/audio/MusicPlayer';
import ObjectInfo from '@/components/ui/ObjectInfo';
import { useInteractionStore } from '@/stores/interactionStore';
import SimpleViewmodel from './SimpleViewmodel';
import * as THREE from 'three';
import { useLoadingStore } from '@/stores/loadingStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import Crosshair from './Crosshair';
import PositionDisplay from './PositionDisplay';
import DebugOverlay from './DebugOverlay';
import DebugConsole from './DebugConsole';
import { debugLog } from '../../stores/debugStore';

interface InteractableObject extends THREE.Object3D {
  title?: string;
  description?: string;
}

interface GameUIProps {
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export default function GameUI({ position }: GameUIProps) {
  debugLog('GameUI', 'Component rendering');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [damageEffect, setDamageEffect] = useState(0);
  const [showTestButtons, setShowTestButtons] = useState(false);
  const [flightModeActive, setFlightModeActive] = useState(false);
  const [showFlightNotification, setShowFlightNotification] = useState(false);
  const [gameLoading, setGameLoading] = useState(true);
  const [isMessageBoxOpen, setIsMessageBoxOpen] = useState(false);
  const { selectedObject, setSelectedObject } = useInteractionStore();
  const { isLoading, currentVideo, setLoading, setCurrentVideo } = useLoadingStore();
  const isMobile = useIsMobile();

  const flightNotificationTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Detect mobile device on mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    // No need to set isMobile as it's from a hook
    
    // Set initial loading state
    setGameLoading(true);
    
    // Simulate loading completion after a reasonable delay
    const loadingTimer = setTimeout(() => {
      setGameLoading(false);
      console.log('Game loading completed');
    }, 3000);
    
    return () => clearTimeout(loadingTimer);
  }, []);

  // Handle initial interaction
  const handleStartGame = () => {
    debugLog('GameUI', 'Initial interaction, starting game');
    setHasInteracted(true);
    
    // Only request pointer lock on desktop
    if (!isMobile) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    }
    
    window.dispatchEvent(new CustomEvent('game-started'));
  };

  useEffect(() => {
    console.log('🎮 GameUI: Setting up event listeners');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyO') {
        console.log('🎮 GameUI: O key pressed');
        setShowDebug(prev => !prev);
      } else if (e.code === 'KeyT') {
        console.log('🎮 GameUI: T key pressed');
        setShowTestButtons(prev => !prev);
      }
    };

    const handlePlayerMovement = (e: CustomEvent<{ isMoving: boolean }>) => {
      setIsMoving(e.detail.isMoving);
    };

    const handleFlightModeChange = (e: CustomEvent<{ isActive: boolean }>) => {
      console.log('🎮 GameUI: Flight mode change detected', e.detail.isActive);
      setFlightModeActive(e.detail.isActive);
      setShowFlightNotification(true);
      
      // Clear any existing timeout
      if (flightNotificationTimeout.current) {
        clearTimeout(flightNotificationTimeout.current);
      }
      
      // Hide notification after 3 seconds
      flightNotificationTimeout.current = setTimeout(() => {
        setShowFlightNotification(false);
      }, 3000);
    };

    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('player-movement', handlePlayerMovement as EventListener);
    window.addEventListener('flight-mode-change', handleFlightModeChange as EventListener);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('player-movement', handlePlayerMovement as EventListener);
      window.removeEventListener('flight-mode-change', handleFlightModeChange as EventListener);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      
      if (flightNotificationTimeout.current) {
        clearTimeout(flightNotificationTimeout.current);
      }
    };
  }, []);

  // Handle can spawning
  const handleSpawnCan = useCallback((position: THREE.Vector3, direction: THREE.Vector3) => {
    console.log('🎮 GameUI: Spawning can at', position, 'with direction', direction);
    // Dispatch a custom event that World component will listen to
    window.dispatchEvent(new CustomEvent('spawn-can', {
      detail: { position, direction }
    }));
  }, []);

  // Test functions
  const testDrink = () => {
    console.log('🎮 GameUI: Test drink button clicked');
    // Dispatch a keydown event for B key
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
  };

  const testThrow = () => {
    console.log('🎮 GameUI: Test throw button clicked');
    // Dispatch a keydown event for N key
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' }));
  };

  // Handle message box state
  useEffect(() => {
    const handleMessageBoxOpen = () => {
      setIsMessageBoxOpen(true);
      // Set the global state for mobile controls
      (window as any).__isMessageBoxOpen__ = true;
    };

    const handleMessageBoxClose = () => {
      setIsMessageBoxOpen(false);
      // Update the global state for mobile controls
      (window as any).__isMessageBoxOpen__ = false;
    };

    window.addEventListener('open-message-box', handleMessageBoxOpen);
    window.addEventListener('close-message-box', handleMessageBoxClose);

    return () => {
      window.removeEventListener('open-message-box', handleMessageBoxOpen);
      window.removeEventListener('close-message-box', handleMessageBoxClose);
    };
  }, []);

  return (
    <>
      {/* Debug info - Always visible */}
      <div className="fixed top-4 left-4 bg-black/50 text-white p-2 z-[100000] pointer-events-none">
        <div>Debug: {showDebug ? 'On' : 'Off'}</div>
        <div>Press O for debug</div>
        <div>Press T for test buttons</div>
        <div>Press B to drink, N to throw</div>
        {isMobile && <div>Mobile Mode Active</div>}
      </div>

      {/* Position Display */}
      <PositionDisplay position={position} />

      {/* Flight mode notification */}
      {showFlightNotification && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         text-white text-2xl font-bytebounce bg-black/60 px-4 py-2 rounded-none
                         pointer-events-none z-[100005]">
          Flight Mode {flightModeActive ? 'Enabled' : 'Disabled'}
        </div>
      )}

      {/* Test buttons */}
      {showTestButtons && (
        <div className="fixed top-20 left-4 bg-black/50 text-white p-2 z-[100000] pointer-events-auto">
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            onClick={testDrink}
          >
            Test Drink
          </button>
          <button 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={testThrow}
          >
            Test Throw
          </button>
        </div>
      )}

      {/* Loading indicator for mobile devices */}
      {isMobile && gameLoading && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100001]">
          <div className="text-white text-center">
            <h2 className="text-2xl mb-4">Loading Game...</h2>
            <div className="w-64 h-2 bg-gray-800 rounded-full">
              <div className="h-full bg-white rounded-full animate-pulse"></div>
            </div>
            <p className="mt-4 text-sm">This may take a moment on mobile devices</p>
          </div>
        </div>
      )}

      {/* Viewmodel - Always visible when game has started */}
      {hasInteracted && !isMobile && <SimpleViewmodel />}

      {/* Initial interaction overlay */}
      {!hasInteracted && !gameLoading && (
        <div 
          className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center cursor-pointer z-[100000] pointer-events-auto"
          onClick={handleStartGame}
        >
          <div className="text-white text-center font-bytebounce">
            <h1 className="text-4xl mb-4">Click to Start</h1>
            {isMobile && (
              <div className="text-xl mb-8">
                <p className="mb-2">Use the joysticks to move and look around.</p>
                <p>Tap the buttons to jump and shoot.</p>
                <p className="mt-6 text-yellow-400">For best experience, <br />rotate your device to landscape mode</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Damage effect overlay */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity duration-100 z-[99999]"
        style={{ 
          opacity: damageEffect,
          backgroundColor: '#ff0000',
          mixBlendMode: 'multiply',
          backdropFilter: 'brightness(1.2)',
          WebkitBackdropFilter: 'brightness(1.2)'
        }} 
      />

      {/* Message Box */}
      {selectedObject && (
        <div 
          className={`fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] transition-opacity duration-200 ${isMessageBoxOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('close-message-box'));
          }}
        >
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg max-w-2xl mx-4">
            <h2 className="text-2xl font-bold mb-4 text-white">{(selectedObject as InteractableObject).title}</h2>
            <p className="text-white/90">{(selectedObject as InteractableObject).description}</p>
          </div>
        </div>
      )}
    </>
  );
} 