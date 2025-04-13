import { useRef, useEffect } from 'react';

/**
 * This hook provides essential mobile adaptations for physics and rendering
 */
export function useDeviceAdapter() {
  const deviceInfoRef = useRef({
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  });

  useEffect(() => {
    // Add extra ambient light for mobile devices if needed
    if (deviceInfoRef.current.isMobile && typeof window.THREE !== 'undefined') {
      const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.5);
      window.scene?.add(ambientLight);
    }

    // Frame update handler for mobile physics adjustments
    const handleFrame = () => {
      if (deviceInfoRef.current.isMobile) {
        // Apply mobile-specific physics adjustments if needed
      }
      requestAnimationFrame(handleFrame);
    };
    
    handleFrame();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Return device info for components that need it
  return deviceInfoRef.current;
}

// Add device info type to window for global access
declare global {
  interface Window {
    scene?: THREE.Scene;
    THREE?: any;
  }
} 