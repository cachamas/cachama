import { useEffect } from 'react';
import { useOptimizedMobileControls } from '../../hooks/useOptimizedMobileControls';

/**
 * PlayerMotionAdapter component provides mobile-optimized controls
 * and handles device-specific adaptations for consistent gameplay
 */
export function PlayerMotionAdapter() {
  const { controls, deviceInfo, handlers } = useOptimizedMobileControls();

  useEffect(() => {
    // Track tab visibility to handle app switching properly
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Reset all controls to default state
        handlers.handleMove({ x: 0, y: 0 });
        handlers.handleLook({ x: 0, y: 0 });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Apply mobile CSS optimizations
    const styleEl = document.createElement('style');
    let styles = `
      canvas {
        touch-action: none !important;
        user-select: none !important;
      }
    `;

    // Mobile-specific optimizations
    if (deviceInfo.isMobile) {
      styles += `
        body, html {
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
          touch-action: none;
          overscroll-behavior: none;
          user-select: none !important;
        }
      `;
    }

    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      styleEl.remove();
    };
  }, [controls, deviceInfo, handlers]);

  return null;
} 