/**
 * This utility applies essential mobile optimizations
 * without modifying the core player component.
 */

/**
 * Apply mobile optimizations
 */
export function applyBrowserOptimizations() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS;
  
  // Create style element for CSS fixes
  const styleEl = document.createElement('style');
  let styles = '';
  
  // Essential touch optimizations
  styles += `
    canvas {
      touch-action: none !important;
    }
  `;
  
  if (isMobile) {
    // Mobile-specific optimizations
    styles += `
      body, html {
        position: fixed;
        overflow: hidden;
        width: 100%;
        height: 100%;
        touch-action: none;
        overscroll-behavior: none;
      }
    `;
    
    // Add visibility change handler to reset controls
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // When returning to app, reset any ongoing movement
        window.dispatchEvent(new CustomEvent('reset-controls'));
      }
    });

    // Fix mobile height calculation
    const setMobileHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setMobileHeight();
    window.addEventListener('resize', setMobileHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setMobileHeight, 100);
    });
  }
  
  // Apply the styles
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
  
  // Add essential event handlers for control consistency
  window.addEventListener('blur', () => {
    window.dispatchEvent(new CustomEvent('reset-controls'));
  });
  
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) {
      window.dispatchEvent(new CustomEvent('reset-controls'));
    }
  });
  
  // Add a marker so we don't apply optimizations twice
  window.browserOptimizationsApplied = true;
}

// Add to window for debugging
declare global {
  interface Window {
    browserOptimizationsApplied?: boolean;
  }
} 