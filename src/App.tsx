import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, PointerLockControls } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import { EffectComposer } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Effect } from 'postprocessing';
import { extend } from '@react-three/fiber';
import { Uniform } from 'three';
import * as THREE from 'three';
import './App.css';
import { useInteractionStore } from './stores/interactionStore';
import ObjectInfo from './components/ui/ObjectInfo';
import { NowPlaying } from '@/components/audio/NowPlaying';
import { MusicPlayer } from '@/components/audio/MusicPlayer';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { useLoadingStore } from './stores/loadingStore';
import { useDebugStore } from './stores/debugStore';
import { applyBrowserOptimizations } from './lib/browserOptimizations';
import { useMapStore } from './lib/mapStore';

// Game components
import Player from './components/game/Player';
import World from './components/game/World';
import Crosshair from './components/ui/Crosshair';
import PositionDisplay from './components/ui/PositionDisplay';
import DebugConsole from './components/ui/DebugConsole';
import DebugOverlay from './components/ui/DebugOverlay';
import SimpleViewmodel from './components/ui/SimpleViewmodel';
import MobileControls from './components/ui/MobileControls';
import { useMobileControls } from './hooks/useMobileControls';
import { MobileControlsDebugger } from './components/ui/MobileControlsDebugger';
import MobileToriSlideshow from './components/ui/MobileToriSlideshow';
import MobileMapSlideshow from './components/ui/MobileMapSlideshow';

// Fragment shader
const fragmentShader = `
  uniform float time;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // PSX-style vertex wobble
    vec2 wobbleUv = uv;
    wobbleUv.x += sin(uv.y * 10.0 + time) * 0.001;
    wobbleUv.y += cos(uv.x * 10.0 + time) * 0.001;
    
    // Simulate lower resolution by pixelating UVs
    vec2 texSize = vec2(320.0, 240.0); // Half of PSX resolution for more pixelation
    vec2 texel = 1.0 / texSize;
    vec2 pixelatedUv = floor(wobbleUv * texSize) / texSize;
    
    vec4 color = texture(inputBuffer, pixelatedUv);
    float brightness = max(max(color.r, color.g), color.b);
    vec3 normalized = color.rgb / (brightness + 0.00001);
    
    // Sharpen edges by increasing contrast locally
    vec4 n = texture(inputBuffer, pixelatedUv + vec2(0.0, -texel.y));
    vec4 s = texture(inputBuffer, pixelatedUv + vec2(0.0, texel.y));
    vec4 e = texture(inputBuffer, pixelatedUv + vec2(texel.x, 0.0));
    vec4 w = texture(inputBuffer, pixelatedUv + vec2(-texel.x, 0.0));
    vec4 sharp = 5.0 * color - n - s - e - w;
    color = sharp;
    
    // Recalculate after sharpening
    brightness = max(max(color.r, color.g), color.b);
    normalized = color.rgb / (brightness + 0.00001);
    
    // Add harsh dithering
    float dither = fract(sin(dot(pixelatedUv, vec2(12.9898, 78.233))) * 43758.5453);
    brightness += (dither - 0.5) * 0.05;

    vec3 finalColor;
    
    // Klein Blue (002FA7) for darker blue tones
    if (normalized.b > 0.6 && normalized.r < 0.3 && normalized.g < 0.3) {
      finalColor = vec3(0.0, 0.184, 0.655);
      // Make it harsher based on brightness
      if (brightness < 0.4) {
        finalColor = vec3(0.0, 0.184, 0.655); // Pure Klein blue
      }
    }
    // Harsh Cyan (00FFFF) for lighter blue tones
    else if (normalized.b > 0.7 && brightness > 0.5 && normalized.r < 0.3) {
      finalColor = vec3(0.0, 1.0, 1.0); // Pure cyan
    }
    // Bright Green (#00FF00)
    else if (normalized.g > 0.7 && normalized.r < 0.3 && normalized.b < 0.3) {
      finalColor = vec3(0.0, 1.0, 0.0);
    }
    // Yellow (FFFF00) - more prevalent
    else if (normalized.r > 0.5 && normalized.g > 0.5 && normalized.b < 0.4) {
      finalColor = vec3(1.0, 1.0, 0.0);
    }
    // Magenta (EA0FAD) - increased presence
    else if ((normalized.r > 0.5 || normalized.b > 0.4) && normalized.g < 0.4) {
      finalColor = vec3(0.918, 0.059, 0.678);
    }
    // White - increased presence
    else if (brightness > 0.6) { // Even lower threshold for more white
      finalColor = vec3(1.0);
    }
    // Black for very dark areas - now pure black for really dark spots
    else if (brightness < 0.06) { // Even more selective threshold
      finalColor = vec3(0.0); // Pure black
    }
    // Dark areas
    else if (brightness < 0.15) {
      finalColor = vec3(0.1); // Dark gray for semi-dark areas
    }
    // Enhanced contrast for mid tones and dark areas
    else {
      finalColor = color.rgb;
      // Boost mid tones while preserving dark details
      float midToneBoost = smoothstep(0.15, 0.7, brightness);
      finalColor = mix(finalColor * 0.9, pow(finalColor, vec3(0.9)), midToneBoost);
      finalColor *= 0.95; // Slightly darker overall
    }
    
    // Add edge detection for more separation between colors
    float edge = length(n.rgb - s.rgb) + length(e.rgb - w.rgb);
    edge = smoothstep(0.0, 0.8, edge);
    
    // Apply weaker dithering to final color
    finalColor += (dither - 0.5) * 0.04;
    
    // Darken edges slightly for better separation
    finalColor *= (1.0 - edge * 0.35);
    
    // Final contrast adjustment - slightly darker
    finalColor = pow(finalColor, vec3(1.05));
    
    outputColor = vec4(finalColor, color.a);
  }
`;

// Custom CMYK effect
class CMYKEffect extends Effect {
  constructor() {
    super('CMYKEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['time', new Uniform(0)]])
    });
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number) {
    this.uniforms.get('time')!.value += deltaTime;
  }
}

// Register the custom effect
extend({ CMYKEffect });

const controls = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'shoot', keys: ['KeyF'] },
];

// Add this at the top of the file, after imports
declare global {
  interface Window {
    browserType: string;
    __btrMapOpen?: boolean;
  }
}

export default function App() {
  const [filterEnabled, setFilterEnabled] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showIntroText, setShowIntroText] = useState(false);
  const { selectedObject, setSelectedObject } = useInteractionStore();
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const pointerLockTimeout = useRef<number | null>(null);
  const { isLoading, currentVideo, setLoading, setCurrentVideo } = useLoadingStore();
  const mobileControls = useMobileControls();
  const [mobileAppReady, setMobileAppReady] = useState(false);
  const toggleDebugMode = useDebugStore(state => state.toggleDebugMode);
  const [isMobile, setIsMobile] = useState(false);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [lookX, setLookX] = useState(0);
  const [lookY, setLookY] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const { currentMap } = useMapStore();
  const [showMapInstruction, setShowMapInstruction] = useState(false);
  const mapInstructionTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Basic mobile detection and map handling
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    if (isMobileDevice) {
      // Set up mobile environment
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.position = 'fixed';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      // Add data attribute to body to help with mobile detection
      document.body.setAttribute('data-is-mobile', 'true');
      
      console.log('📱 Mobile device detected - setting up mobile environment');
      // Rest of existing code...
      
      // Set mobile flag
      document.body.setAttribute('data-is-mobile', 'true');
      setIsMobile(true);
      
      // Simple map change listener for toris
      const handleMapChange = (e: CustomEvent) => {
        if (e.detail?.map === 'toris') {
          // Trigger the mobile tori slideshow immediately
          console.log('🎮 App: Map changed to Toris - firing immediate trigger');
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          
          // Set auto-open flag directly
          document.body.setAttribute('data-toris-auto-open', 'true');
          
          // Fire multiple times to ensure it works
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 100);
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 500);
        }
      };
      
      window.addEventListener('map-changed', handleMapChange as EventListener);
      
      // Also listen for map-ready event for Toris as a backup
      const handleMapReady = (e: CustomEvent) => {
        if (e.detail?.map === 'toris' && e.detail?.isMobile) {
          // Trigger the mobile tori slideshow immediately
          console.log('🎮 App: Map ready with Toris - firing immediate trigger');
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          
          // Set auto-open flag directly
          document.body.setAttribute('data-toris-auto-open', 'true');
          
          // Fire multiple times to ensure it works
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 100);
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 500);
        }
      };
      
      window.addEventListener('map-ready', handleMapReady as EventListener);
      
      // Set mobile app ready
      setTimeout(() => {
        setMobileAppReady(true);
      }, 1000);
      
      return () => {
        window.removeEventListener('map-changed', handleMapChange as EventListener);
        window.removeEventListener('map-ready', handleMapReady as EventListener);
      };
    } else {
      // Desktop - no delay needed
      setMobileAppReady(true);
      
      // Add desktop-specific handling for Toris map
      const handleMapChange = (e: CustomEvent) => {
        if (e.detail?.map === 'toris') {
          console.log('💻 Desktop App: Map changed to Toris - NOT triggering slideshow');
          // Ensure desktop doesn't have auto-open flags
          document.body.removeAttribute('data-toris-auto-open');
          document.body.setAttribute('data-is-desktop-toris', 'true');
          // Ensure force open is disabled
          useInteractionStore.getState().setForceTorisOpen(false);
        }
      };
      
      window.addEventListener('map-changed', handleMapChange as EventListener);
      
      return () => {
        window.removeEventListener('map-changed', handleMapChange as EventListener);
      };
    }
  }, []);
  
  // Add to existing useEffect for initialization
  useEffect(() => {
    // Start with intro video
    setCurrentVideo('intro.mp4');
    setLoading(true);
    
    // Show intro text after 8 seconds
    const timer = setTimeout(() => {
      setShowIntroText(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLoadComplete = () => {
    if (currentVideo === 'intro.mp4') {
      setHasInteracted(true);
      setIsGameStarted(true);
      // Skip the central.mp4 video and go straight to the game
      setLoading(false);
      setShowIntroText(false);
    } else {
      setLoading(false);
    }
  };

  // Function to center mouse
  const centerMouse = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      window.scrollTo(0, 0);
      window.moveTo(centerX, centerY);
    }
  };

  // Enhanced pointer lock handling
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    let wasEscapePressed = false;
    let isClickHandled = false;

    const acquirePointerLock = () => {
      if (!canvas || !canvas.isConnected) return;
      
      // Check if pointer is already locked, or we shouldn't lock
      const isBTRMapOpen = window.__btrMapOpen || document.body.getAttribute('data-map-open') === 'true';
      if (document.pointerLockElement || !hasInteracted || showMusicPlayer || isBTRMapOpen) return;

      console.log('🎮 App: Attempting to acquire pointer lock');
      try {
        centerMouse();
        canvas.requestPointerLock();
      } catch (err) {
        console.warn('🎮 App: Could not acquire pointer lock:', err);
        if (pointerLockTimeout.current) clearTimeout(pointerLockTimeout.current);
        pointerLockTimeout.current = window.setTimeout(acquirePointerLock, 500);
      }
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      const isBTRMapOpen = window.__btrMapOpen || document.body.getAttribute('data-map-open') === 'true';
      
      console.log('🎮 App: Pointer lock state changed:', {
        isLocked,
        element: document.pointerLockElement,
        canvas: canvas,
        wasEscapePressed,
        isClickHandled,
        hasInteracted,
        showMusicPlayer,
        isBTRMapOpen
      });
      
      setIsPointerLocked(isLocked);
      
      // Remove show-cursor class when pointer is locked again
      if (isLocked) {
        document.body.classList.remove('show-cursor');
      }
      
      // If we lose pointer lock and it wasn't due to escape or clicking an interactable
      // AND the music player is not open AND we've already interacted
      // AND the BTR map is not open
      if (!isLocked && hasInteracted && !wasEscapePressed && !isClickHandled && 
          !showMusicPlayer && !isLoading && !isMobile && !isBTRMapOpen) {
        console.log('🎮 App: Unexpected pointer lock loss, attempting to reacquire');
        if (pointerLockTimeout.current) clearTimeout(pointerLockTimeout.current);
        pointerLockTimeout.current = window.setTimeout(() => {
          if (canvas?.isConnected && !window.__btrMapOpen && !document.body.getAttribute('data-map-open')) {
            centerMouse();
            canvas.requestPointerLock();
          }
        }, 100);
      }
    };

    const handlePointerLockError = (e: Event) => {
      console.warn('🎮 App: Pointer lock error:', e);
      if (canvas?.isConnected) {
        if (pointerLockTimeout.current) clearTimeout(pointerLockTimeout.current);
        pointerLockTimeout.current = window.setTimeout(acquirePointerLock, 500);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check if map is open
        const isMapOpen = document.body.getAttribute('data-map-open') === 'true' || window.__btrMapOpen;
        
        // Only handle Escape normally if map is not open
        // The map component has its own Escape handler
        if (!isMapOpen) {
          console.log('🎮 App: Escape key pressed');
          wasEscapePressed = true;
          setIsPointerLocked(false);
          document.body.classList.add('show-cursor'); // Add show-cursor class
        } else {
          console.log('🎮 App: Escape pressed while map is open - deferring to map component');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('🎮 App: Escape key released');
        wasEscapePressed = false;
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      if (pointerLockTimeout.current) clearTimeout(pointerLockTimeout.current);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasInteracted, showMusicPlayer, isLoading]);

  // Handle music player visibility
  useEffect(() => {
    const handleToggleMusicPlayer = (event: CustomEvent) => {
      console.log('🎵 App: Toggling music player visibility:', event.detail);
      setShowMusicPlayer(event.detail.visible);
      
      // If we're showing the music player, ensure pointer is unlocked
      if (event.detail.visible) {
        console.log('🎵 App: Music player shown, attempting to unlock pointer');
        if (document.pointerLockElement) {
          console.log('🎵 App: Exiting pointer lock on music player hover');
          centerMouse();
          document.exitPointerLock();
        }
      }
    };

    window.addEventListener('toggle-music-player', handleToggleMusicPlayer as EventListener);
    
    return () => {
      window.removeEventListener('toggle-music-player', handleToggleMusicPlayer as EventListener);
    };
  }, []);

  // Only enable T key trigger on desktop for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyO') {
        setFilterEnabled(prev => prev === 1 ? 0 : 1);
      }
      
      if (e.code === 'KeyT' && !isMobile) {
        window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyJ') {
        toggleDebugMode();
        setFilterEnabled(prev => prev === 1 ? 0 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugMode]);

  // Update the useEffect that applies browser optimizations
  useEffect(() => {
    // Apply browser-specific optimizations
    if (!window.browserOptimizationsApplied) {
      applyBrowserOptimizations();
      
      // Set browserType for player movement adjustments
      const ua = navigator.userAgent;
      if (ua.indexOf('Vivaldi') > -1) {
        window.browserType = 'vivaldi';
      } else if (/Android/i.test(ua)) {
        window.browserType = 'android';
      } else if (ua.indexOf('Lemur') > -1) {
        window.browserType = 'lemur';
      } else if (/iPhone|iPad|iPod/i.test(ua)) {
        window.browserType = 'ios';
      } else if (ua.indexOf('SamsungBrowser') > -1) {
        window.browserType = 'samsung';
      } else {
        window.browserType = 'other';
      }
      
      console.log('Set browser type:', window.browserType);
      
      // Reset controls on page load to ensure a clean state
      window.dispatchEvent(new CustomEvent('reset-controls'));
    }
  }, []);

  // Inside the component, add this useEffect to reset controls when map changes
  useEffect(() => {
    // Get current map from document attribute
    const mapChangeHandler = () => {
      // Reset mobile controls
      console.log('Map changed - resetting mobile controls from App');
      window.dispatchEvent(new CustomEvent('reset-controls'));
    };
    
    // Enhance canvas unmount/remount handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible - resetting mobile controls');
        window.dispatchEvent(new CustomEvent('reset-controls'));
      }
    };
    
    // Handle interactable closed events with additional safety timeout
    const handleInteractableClosed = () => {
      // Reset mobile controls immediately
      window.dispatchEvent(new CustomEvent('reset-controls'));
      
      // Add an additional delayed reset as a safeguard for BTR map issue
      setTimeout(() => {
        console.log('Safety check: ensuring mobile controls are visible after interactable closed');
        window.dispatchEvent(new CustomEvent('reset-controls'));
        
        // Force mobile controls to be visible
        const mobileContainer = document.querySelector('.mobile-controls-container');
        if (mobileContainer) {
          mobileContainer.classList.remove('hidden');
          (mobileContainer as HTMLElement).style.opacity = '1';
          (mobileContainer as HTMLElement).style.pointerEvents = 'auto';
        }
      }, 1000);
    };
    
    window.addEventListener('map-change', mapChangeHandler);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('interactable-closed', handleInteractableClosed);
    
    // Monitor for heavy performance situations
    let lastCheckTime = performance.now();
    const performanceMonitor = setInterval(() => {
      const now = performance.now();
      
      // Calculate time since last check
      const elapsed = now - lastCheckTime;
      lastCheckTime = now;
      
      // If more than 100ms between performance checks, we might be experiencing lag
      if (elapsed > 200 && mobileControls.controls.isMobile) {
        console.log(`Performance issue detected: ${elapsed.toFixed(0)}ms between frames`);
        window.dispatchEvent(new CustomEvent('reset-controls'));
      }
    }, 100);
    
    return () => {
      window.removeEventListener('map-change', mapChangeHandler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interactable-closed', handleInteractableClosed);
      clearInterval(performanceMonitor);
    };
  }, [mobileControls.controls.isMobile]);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(isMobileDevice || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Log actions for testing
  const logAction = (action: string) => {
    setActionLog(prev => {
      const newLog = [action, ...prev];
      if (newLog.length > 5) newLog.pop();
      return newLog;
    });
  };

  // Handle mobile control actions
  const handleMove = (vector: { x: number; y: number }) => {
    setMoveX(vector.x);
    setMoveY(vector.y);
    logAction(`Move: ${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}`);
  };

  const handleLook = (vector: { x: number; y: number }) => {
    setLookX(vector.x);
    setLookY(vector.y);
    logAction(`Look: ${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}`);
  };

  const handleJump = () => {
    logAction('Jump!');
  };

  const handleShoot = () => {
    logAction('Shoot!');
  };

  const handleReload = () => {
    logAction('Reload!');
  };

  // Apply mobile optimizations
  if (!window.browserOptimizationsApplied) {
    applyBrowserOptimizations();
  }

  useEffect(() => {
    // Check if mobile
    const isMobile = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     document.body.getAttribute('data-is-mobile') === 'true';
    
    // Clear any potential auto-open flags on startup for desktop
    if (!isMobile) {
      console.log('💻 Desktop startup - ensuring no auto-open flags are set');
      document.body.removeAttribute('data-toris-auto-open');
      useInteractionStore.getState().setForceTorisOpen(false);
    }
                     
    if (isMobile) {
      // Set the mobile marker
      document.body.setAttribute('data-is-mobile', 'true');
      
      // Listen for map changes
      const handleMapChange = (e: CustomEvent) => {
        if (e.detail?.map === 'toris') {
          console.log('🎮 App detected Toris map change - immediate tori trigger (MOBILE ONLY)');
          
          // Set auto-open flag directly
          document.body.setAttribute('data-toris-auto-open', 'true');
          
          // Fire multiple triggers with different timing to ensure it works
          window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          
          // Create and show the first Tori directly from here using the imported THREE
          const obj = new THREE.Object3D();
          obj.name = 'TNPR0-100'; // First Tori variant
          
          // Use the store that's already imported at the top of the file
          useInteractionStore.getState().setSelectedObject(obj);
          useInteractionStore.getState().setShowInfo(true);
          useInteractionStore.getState().setForceTorisOpen(true);
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 300);
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('mobile-entered-toris'));
          }, 1000);
        }
      };
      
      window.addEventListener('map-changed', handleMapChange as EventListener);
    } else {
      console.log('💻 Desktop device detected - not setting up auto-open for Toris viewer');
      
      // For desktop, we don't want auto-opening behavior
      const handleMapChange = (e: CustomEvent) => {
        if (e.detail?.map === 'toris') {
          console.log('💻 Desktop entered Toris map - NOT auto-showing viewer');
          // Make sure desktop doesn't have auto-open flag set
          document.body.removeAttribute('data-toris-auto-open');
          useInteractionStore.getState().setForceTorisOpen(false);
          
          // Prevent any automated opening by adding a desktop-specific blocker
          window.dispatchEvent(new CustomEvent('desktop-entered-toris'));
          
          // Set an additional attribute to explicitly mark this as desktop mode
          document.body.setAttribute('data-is-desktop-toris', 'true');
        }
      };
      
      window.addEventListener('map-changed', handleMapChange as EventListener);
    }
  }, []);

  // Show map instruction after 3 seconds
  useEffect(() => {
    if (!mobileControls.controls.isMobile && isGameStarted) {
      const timer = setTimeout(() => {
        setShowMapInstruction(true);
        
        // Hide after 5 seconds
        mapInstructionTimeout.current = setTimeout(() => {
          setShowMapInstruction(false);
        }, 5000);
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        if (mapInstructionTimeout.current) {
          clearTimeout(mapInstructionTimeout.current);
        }
      };
    }
  }, [isGameStarted, mobileControls.controls.isMobile]);

  return (
    <>
      {isLoading && (
        <LoadingScreen
          videoSrc={currentVideo || ''}
          onLoadComplete={handleLoadComplete}
          isLoading={isLoading}
          preventSkip={currentVideo === 'intro.mp4' && !showIntroText}
        />
      )}
      
      {/* Only render game when mobile app is ready or this is a desktop */}
      {mobileAppReady && (
        <KeyboardControls map={controls}>
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
            dpr={0.5} // Always use mobile DPR setting regardless of device
            style={{
              imageRendering: 'pixelated',
              width: '100%',
              height: '100%'
            }}
          >
            <Physics debug={false} gravity={[0, -40, 0]}>
              <Suspense fallback={null}>
                <Player onPositionChange={setPosition} mobileControls={mobileControls.controls} />
                <World />
                {filterEnabled === 1 && (
                  <EffectComposer>
                    <primitive object={new CMYKEffect()} />
                  </EffectComposer>
                )}
              </Suspense>
              {isGameStarted && <PointerLockControls onLock={() => setIsPointerLocked(true)} onUnlock={() => setIsPointerLocked(false)} />}
            </Physics>
          </Canvas>
        </KeyboardControls>
      )}

      {/* UI Layer - Remains visible even when canvas is initializing */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
        <NowPlaying />
        <Crosshair isMobile={mobileControls.controls.isMobile} />
        <PositionDisplay position={position} />
        <DebugOverlay filterEnabled={filterEnabled} />
        <SimpleViewmodel />
        <DebugConsole />
        
        {/* Map instruction */}
        {showMapInstruction && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 
                         text-white text-2xl font-bytebounce bg-black/60 px-4 py-2 rounded-none
                         pointer-events-none z-[100005] animate-fade-in-out">
            Press 'M' to open map.
            {navigator.userAgent.includes('Firefox') && (
              <div className="text-sm mt-1 text-red-400">
                Firefox mouse SUCKS, use a chromium based browser for best experience.
              </div>
            )}
          </div>
        )}
        
        {/* Mobile Controls */}
        {mobileControls.controls.isMobile && mobileAppReady && (
          <MobileControls
            onMove={mobileControls.handlers.handleMove}
            onLook={mobileControls.handlers.handleLook}
            onJump={() => {}}
            onShoot={() => {}}
            onReload={() => {}}
          />
        )}
        
        {/* Loading message for mobile */}
        {mobileControls.controls.isMobile && !mobileAppReady && (
          <div className="fixed inset-0 bg-black flex items-center justify-center pointer-events-auto z-[9999]">
            <div className="text-white text-center">
              <h2 className="text-xl mb-4">Loading Game Environment...</h2>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-white animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Music Player */}
        {showMusicPlayer && (
          <div 
            className="pointer-events-auto fixed inset-0 z-[2000] show-cursor"
            onMouseEnter={() => {
              console.log('🎵 App: Mouse entered music player area');
              // Release pointer lock when hovering the music player
              if (document.pointerLockElement) {
                console.log('🎵 App: Exiting pointer lock on music player hover');
                centerMouse();
                document.exitPointerLock();
              }
            }}
          >
            <div id="music-player-mount" className="w-full h-full flex items-center justify-center">
              <MusicPlayer onClose={() => {
                console.log('🎵 App: Music player closing');
                setShowMusicPlayer(false);
                // Reacquire pointer lock when closing
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  console.log('🎵 App: Reacquiring pointer lock after music player close');
                  centerMouse();
                  canvas.requestPointerLock();
                }
              }} />
            </div>
          </div>
        )}

        {/* Object Info */}
        {selectedObject && (
          <div className="pointer-events-auto show-cursor">
            <ObjectInfo 
              object={selectedObject}
              onClose={() => setSelectedObject(null)}
            />
          </div>
        )}
        
        {/* Always render MobileToriSlideshow at the very end so it always appears on top */}
        <MobileToriSlideshow />
        {/* Use MobileMapSlideshow for all non-toris, non-central maps */}
        <div className="fixed inset-0 z-[999999] pointer-events-none">
          <div className="pointer-events-auto">
            <MobileMapSlideshow key={`map-slideshow-${currentMap}`} />
          </div>
        </div>
        <MobileControlsDebugger />
      </div>
    </>
  );
}