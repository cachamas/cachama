import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to detect if the current device is a mobile device
 * @returns boolean indicating if the current device is mobile
 */
export function isMobileDevice(): boolean {
  // First check if we're in the Toris map on desktop - never return true in this case
  if (document.body.getAttribute('data-is-desktop-toris') === 'true') {
    return false;
  }
  
  return (
    document.body.getAttribute('data-is-mobile') === 'true' || 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
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
