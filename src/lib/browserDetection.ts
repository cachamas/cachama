/**
 * Utility for detecting device information
 * to apply platform-specific optimizations
 */

export interface BrowserInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTouchScreen: boolean;
  devicePixelRatio: number;
  performanceTier: 'low' | 'medium' | 'high';
}

/**
 * Detect device information
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // Detect OS
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detect touch screen
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Get device pixel ratio
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Determine performance tier based on device characteristics
  let performanceTier: BrowserInfo['performanceTier'] = 'high';
  
  if (isMobile) {
    performanceTier = 'medium';
    
    // Check for lower-end devices
    if (devicePixelRatio < 2) {
      performanceTier = 'low';
    }
  } else if (window.innerWidth * devicePixelRatio < 1000 || devicePixelRatio < 1) {
    performanceTier = 'medium';
  }
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isTouchScreen,
    devicePixelRatio,
    performanceTier
  };
}

/**
 * Get movement config based on device capabilities
 */
export function getMovementConfig(browserInfo: BrowserInfo) {
  // Base configuration for consistent movement
  const baseConfig = {
    fixedTimeStep: 1/60,
    inputSmoothing: 0.25,
    inputDeadzone: 0.04,
    inputThreshold: 0.008,
    velocityDamping: 0.94,
    jumpForce: 10,
    moveSpeed: 28,
    sprintSpeed: 50
  };

  // Performance-based adjustments only
  if (browserInfo.performanceTier === 'low') {
    return {
      ...baseConfig,
      fixedTimeStep: 1/30,
      inputSmoothing: 0.7,
      velocityDamping: 0.85
    };
  }
  
  if (browserInfo.performanceTier === 'medium') {
    return {
      ...baseConfig,
      fixedTimeStep: 1/45,
      inputSmoothing: 0.4
    };
  }
  
  return baseConfig;
} 