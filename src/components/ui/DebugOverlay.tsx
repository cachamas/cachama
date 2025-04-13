import { useState, useEffect } from 'react';

interface DebugOverlayProps {
  filterEnabled: number;
}

export default function DebugOverlay({ filterEnabled }: DebugOverlayProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [fps, setFps] = useState(0);
  
  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    function updateFPS() {
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(updateFPS);
    }
    
    const frameId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Mouse position tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        setMousePos(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!filterEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white font-mono text-sm p-4 rounded z-[100001] pointer-events-none">
      <div>DEBUG MODE ON</div>
      <div>FPS: {fps}</div>
      <div>Mouse X: {mousePos.x.toFixed(2)}</div>
      <div>Mouse Y: {mousePos.y.toFixed(2)}</div>
      <div>Press J to hide debug</div>
    </div>
  );
} 