import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache for mobile detection result
let isMobileCache: boolean | null = null;

/**
 * Utility to detect if the current device is a mobile device
 * @returns boolean indicating if the current device is mobile
 */
export function isMobileDevice(): boolean {
  // Return cached result if available
  if (isMobileCache !== null) {
    return isMobileCache;
  }

  // First check if we're in the Toris map on desktop - never return true in this case
  if (document.body.getAttribute('data-is-desktop-toris') === 'true') {
    console.log('📱 isMobileDevice: false (desktop toris)');
    isMobileCache = false;
    return false;
  }

  // Check user agent first - this is the most reliable indicator
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // If user agent indicates mobile, return true
  if (isMobileUA) {
    isMobileCache = true;
    return true;
  }

  // For desktop devices, check if explicitly marked as mobile
  const result = document.body.getAttribute('data-is-mobile') === 'true';

  // Only log on first check
  console.log('📱 Initial isMobileDevice check:', {
    result,
    mobileAttr: document.body.getAttribute('data-is-mobile'),
    touchStart: 'ontouchstart' in window,
    touchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent
  });

  // Cache the result
  isMobileCache = result;
  return result;
}

/**
 * Get the current viewport dimensions
 * @returns An object with width and height properties
 */
export function getViewportDimensions() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
