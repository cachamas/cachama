import React, { useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { useDebugStore } from '../../stores/debugStore';

interface DebugState {
  isUIVisible: boolean;
  isInitialized: boolean;
  isPhysicsReady: boolean;
  isMapFullyReady: boolean;
  isMobile: boolean;
  currentMap: string;
  moveJoystickState: {
    active: boolean;
    x: number;
    y: number;
    lastActive: number;
  };
  lookJoystickState: {
    active: boolean;
    x: number;
    y: number;
    lastActive: number;
  };
  touchEvents: {
    total: number;
    active: number;
    lastEvent: string;
  };
  reinitAttempts: number;
  lastReset: number;
}

export const MobileControlsDebugger: React.FC = () => {
  const [debugState, setDebugState] = useState<DebugState>({
    isUIVisible: true,
    isInitialized: false,
    isPhysicsReady: false,
    isMapFullyReady: false,
    isMobile: false,
    currentMap: '',
    moveJoystickState: {
      active: false,
      x: 0,
      y: 0,
      lastActive: 0,
    },
    lookJoystickState: {
      active: false,
      x: 0,
      y: 0,
      lastActive: 0,
    },
    touchEvents: {
      total: 0,
      active: 0,
      lastEvent: '',
    },
    reinitAttempts: 0,
    lastReset: Date.now(),
  });

  const { currentMap } = useMapStore();
  const isDebugMode = useDebugStore(state => state.isDebugMode);

  useEffect(() => {
    const handleControlsUpdate = (e: CustomEvent) => {
      const data = e.detail;
      setDebugState(prev => ({
        ...prev,
        moveJoystickState: {
          active: data.activeMoveJoystick,
          x: data.moveX,
          y: data.moveY,
          lastActive: data.activeMoveJoystick ? Date.now() : prev.moveJoystickState.lastActive,
        },
        lookJoystickState: {
          active: data.activeLookJoystick,
          x: data.lookX,
          y: data.lookY,
          lastActive: data.activeLookJoystick ? Date.now() : prev.lookJoystickState.lastActive,
        },
      }));
    };

    const handleTouchEvent = (e: TouchEvent) => {
      setDebugState(prev => ({
        ...prev,
        touchEvents: {
          total: prev.touchEvents.total + 1,
          active: e.touches.length,
          lastEvent: e.type,
        },
      }));
    };

    const handleReset = () => {
      setDebugState(prev => ({
        ...prev,
        lastReset: Date.now(),
        reinitAttempts: prev.reinitAttempts + 1,
      }));
      console.log('[MobileDebugger] Controls reset triggered', Date.now());
    };

    const handleMapChange = () => {
      console.log('[MobileDebugger] Map changed to:', currentMap);
      setDebugState(prev => ({
        ...prev,
        currentMap,
        isMapFullyReady: false,
        reinitAttempts: 0,
      }));
    };

    const handleMapReady = () => {
      console.log('[MobileDebugger] Map fully loaded');
      setDebugState(prev => ({
        ...prev,
        isMapFullyReady: true,
      }));
    };

    // Register event listeners
    window.addEventListener('mobile-controls-update' as any, handleControlsUpdate);
    window.addEventListener('touchstart', handleTouchEvent);
    window.addEventListener('touchend', handleTouchEvent);
    window.addEventListener('touchmove', handleTouchEvent);
    window.addEventListener('reset-controls', handleReset);
    window.addEventListener('map-change', handleMapChange);
    window.addEventListener('map-ready', handleMapReady);

    return () => {
      window.removeEventListener('mobile-controls-update' as any, handleControlsUpdate);
      window.removeEventListener('touchstart', handleTouchEvent);
      window.removeEventListener('touchend', handleTouchEvent);
      window.removeEventListener('touchmove', handleTouchEvent);
      window.removeEventListener('reset-controls', handleReset);
      window.removeEventListener('map-change', handleMapChange);
      window.removeEventListener('map-ready', handleMapReady);
    };
  }, [currentMap]);

  if (!isDebugMode) return null;

  const timeSinceLastReset = Math.floor((Date.now() - debugState.lastReset) / 1000);
  const timeSinceLastMoveActive = Math.floor((Date.now() - debugState.moveJoystickState.lastActive) / 1000);
  const timeSinceLastLookActive = Math.floor((Date.now() - debugState.lookJoystickState.lastActive) / 1000);

  return (
    <div className="debug-panel mobile-controls-debug">
      <h3>Mobile Controls Debug</h3>
      <div className="debug-section">
        <h4>Map State</h4>
        <ul>
          <li>Current Map: {debugState.currentMap}</li>
          <li>Map Ready: {debugState.isMapFullyReady ? 'Yes' : 'No'}</li>
          <li>Time Since Reset: {timeSinceLastReset}s</li>
          <li>Reinit Attempts: {debugState.reinitAttempts}</li>
        </ul>
      </div>
      
      <div className="debug-section">
        <h4>Move Joystick</h4>
        <ul>
          <li>Active: {debugState.moveJoystickState.active ? 'Yes' : 'No'}</li>
          <li>X: {debugState.moveJoystickState.x.toFixed(3)}</li>
          <li>Y: {debugState.moveJoystickState.y.toFixed(3)}</li>
          <li>Last Active: {timeSinceLastMoveActive}s ago</li>
        </ul>
      </div>

      <div className="debug-section">
        <h4>Look Joystick</h4>
        <ul>
          <li>Active: {debugState.lookJoystickState.active ? 'Yes' : 'No'}</li>
          <li>X: {debugState.lookJoystickState.x.toFixed(3)}</li>
          <li>Y: {debugState.lookJoystickState.y.toFixed(3)}</li>
          <li>Last Active: {timeSinceLastLookActive}s ago</li>
        </ul>
      </div>

      <div className="debug-section">
        <h4>Touch Events</h4>
        <ul>
          <li>Total Events: {debugState.touchEvents.total}</li>
          <li>Active Touches: {debugState.touchEvents.active}</li>
          <li>Last Event: {debugState.touchEvents.lastEvent}</li>
        </ul>
      </div>
    </div>
  );
}; 