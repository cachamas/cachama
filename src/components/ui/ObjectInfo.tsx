import { useEffect, useState, useRef, useCallback } from 'react';
import { Object3D } from 'three';
import { artworkData } from '../../lib/artworkData';
import ToriViewer from './ToriViewer';
import ModelViewer from './ModelViewer';
import TattooViewer from './TattooViewer';
import ImageViewer from './ImageViewer';
import { getObjectInfo } from '../../lib/interactionSystem';
import { useInteractionStore } from '../../stores/interactionStore';
import { isMobileDevice } from '../../lib/utils';
import { useMapStore } from '../../lib/mapStore';

// Add global type declaration
declare global {
  interface Window {
    __btrMapOpen?: boolean;
  }
}

interface ObjectInfoProps {
  object: Object3D;
  onClose: () => void;
}

export default function ObjectInfo({ object, onClose }: ObjectInfoProps) {
  const artworkInfo = artworkData[object.name];
  const toriInfo = getObjectInfo(object.name);
  const { isForceTorisOpen } = useInteractionStore();
  const [justClosedMap, setJustClosedMap] = useState(false);
  const { currentMap } = useMapStore();

  // Separate handling for GCT meshes vs toris
  const isGCTMesh = object.name.includes('Mesh_');
  const isTattoo = object.name.startsWith('unnamed');
  const isTori = !isGCTMesh && !isTattoo && Boolean(toriInfo.variant && toriInfo.showViewer);
  const isArtPiece = isGCTMesh && Boolean(toriInfo.variant && toriInfo.showViewer);
  const isBTR = object.name === 'Plane__0024';

  if (!artworkInfo && !isTori && !isArtPiece && !isTattoo && !isBTR) {
    return null;
  }

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Prevent pointer lock reacquisition for a brief period after closing the map
  useEffect(() => {
    if (justClosedMap) {
      // Handle pointer lock reacquisition attempts
      const preventRelock = (e: Event) => {
        console.log('🗺️ Preventing relock immediately after closing map');
        e.preventDefault();
        e.stopPropagation();
      };
      
      // Capture phase to ensure we catch it early
      document.addEventListener('mousedown', preventRelock, true);
      document.addEventListener('click', preventRelock, true);
      
      // Clear this state after a delay
      const timeout = setTimeout(() => {
        setJustClosedMap(false);
        document.removeEventListener('mousedown', preventRelock, true);
        document.removeEventListener('click', preventRelock, true);
      }, 500);
      
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', preventRelock, true);
        document.removeEventListener('click', preventRelock, true);
      };
    }
  }, [justClosedMap]);

  // Unlock mouse pointer when map is opened and prevent auto relock
  useEffect(() => {
    if (isBTR) {
      // Exit pointer lock
      document.exitPointerLock?.();
      
      // Add flags to document to indicate map is open
      document.body.setAttribute('data-map-open', 'true');
      
      // Global flag to prevent relock when clicking the map
      window.__btrMapOpen = true;
      
      // Listen for click events to prevent immediate relock
      const preventRelock = (e: MouseEvent) => {
        // Allow clicks on SVG areas for highlighting
        const target = e.target as HTMLElement;
        const isMapContainer = target.closest('.bg-black\\/40') === null && 
                             !target.closest('.absolute.inset-0');
        
        // Only prevent propagation for clicks inside the map container
        if (isMapContainer) {
          e.stopPropagation();
        }
      };
      
      // Capture phase to intercept clicks before they trigger pointer lock
      document.addEventListener('mousedown', preventRelock, true);
      
      return () => {
        // Clean up
        document.body.removeAttribute('data-map-open');
        window.__btrMapOpen = false;
        document.removeEventListener('mousedown', preventRelock, true);
      };
    }
  }, [isBTR]);

  // Handle map closing and pointer lock restoration
  const handleClose = useCallback(() => {
    // Check if this is auto-opened in Toris map
    const isTorisAutoOpen = document.body.getAttribute('data-toris-auto-open') === 'true';
    const isMobile = isMobileDevice();
    
    // Only prevent closing if this is an auto-opened Tori on mobile - allow closing on desktop
    if ((isTorisAutoOpen || isForceTorisOpen) && isMobile && isTori) {
      console.log('Auto-opened Tori viewer on mobile - preventing close');
      return;
    }
    
    // Special handling for BTR map closing
    if (isBTR) {
      // For BTR map, mark that we just closed the map
      setJustClosedMap(true);
      
      // Clean up map-related flags
      document.body.removeAttribute('data-map-open');
      window.__btrMapOpen = false;
      
      // Reset mobile controls when map is closed on mobile
      if (isMobile) {
        console.log('🎮 Resetting mobile controls after BTR map close');
        // Reset controls explicitly
        window.dispatchEvent(new CustomEvent('reset-controls'));
        // Ensure mobile UI is visible again
        window.dispatchEvent(new CustomEvent('interactable-closed'));
      }
      
      // Wait before allowing pointer lock to be reacquired
      setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas && !document.pointerLockElement && !window.__btrMapOpen) {
          console.log('🗺️ Reacquiring pointer lock after map was closed');
          canvas.requestPointerLock();
        }
        
        // Additional reset for mobile controls after a delay
        if (isMobile) {
          window.dispatchEvent(new CustomEvent('reset-controls'));
          window.dispatchEvent(new CustomEvent('interactable-closed'));
        }
      }, 700);
    }
    
    // Proceed with normal close
    onClose();
  }, [isBTR, isTori, isForceTorisOpen, onClose]);

  // Prevent normal behavior for closing via escape key for BTR map
  useEffect(() => {
    if (!isBTR) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // For BTR map, we want to handle the escape key ourselves
        e.stopPropagation();
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isBTR, handleClose]);

  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    // Initial update
    updateLayout();
    
    // Update on resize
    window.addEventListener('resize', updateLayout);
    
    // Create ResizeObserver to watch container size changes
    const observer = new ResizeObserver(updateLayout);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateLayout);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        // Check if this is auto-opened in Toris map before closing
        const isTorisAutoOpen = document.body.getAttribute('data-toris-auto-open') === 'true';
        const isMobile = isMobileDevice();
        
        // Only prevent closing if this is an auto-opened Tori on mobile - allow closing on desktop
        if ((isTorisAutoOpen || isForceTorisOpen) && isMobile && isTori) {
          console.log('Auto-opened Tori viewer on mobile - preventing close from keyboard');
          return;
        }
        
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isTori, isForceTorisOpen]);

  // Add explicit check on component mount to ensure desktop can always close
  useEffect(() => {
    // Check if we're on desktop
    const isMobile = isMobileDevice();
    
    if (!isMobile) {
      console.log('💻 ObjectInfo mounted on desktop - ensuring close is allowed');
      document.body.removeAttribute('data-toris-auto-open');
      
      // Check if this is a Tori
      if (isTori) {
        console.log('💻 Tori viewer on desktop - making sure closing is allowed');
      }
    }
  }, [isTori]);

  const info = isTattoo ? toriInfo : (isTori || isArtPiece ? toriInfo : artworkInfo);
  
  // Check if we're on mobile
  const isMobile = isMobileDevice();

  // Adjust height class based on device and content type
  const heightClass = isMobile && isTori ? 'max-h-[75vh] pb-24' : 'max-h-[90vh]';

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
      data-selected-object={object.name}
    >
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={(e) => {
          // For BTR map, we need to prevent immediate relock
          // when clicking the background overlay
          if (isBTR) {
            e.preventDefault();
            e.stopPropagation();
            
            // Reset mobile controls if on mobile device
            if (isMobile) {
              console.log('🎮 Resetting mobile controls after BTR map background click');
              window.dispatchEvent(new CustomEvent('reset-controls'));
              window.dispatchEvent(new CustomEvent('interactable-closed'));
            }
            
            handleClose();
          } else if (currentMap === 'gct' && (isArtPiece || isTattoo)) {
            // Special handling for GCT gallery background tap
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎨 Closing GCT gallery from background tap');
            // Signal gallery is closed
            window.dispatchEvent(new CustomEvent('gct-gallery-closed'));
            window.dispatchEvent(new CustomEvent('interactable-closed'));
            
            // Provide haptic feedback if available on mobile
            if (navigator.vibrate) {
              navigator.vibrate([10, 10]);
            }
            
            handleClose();
          } else {
            handleClose();
          }
        }} 
      />
      <div 
        ref={containerRef}
        className={`relative bg-black/40 max-w-4xl w-[95vw] ${heightClass} overflow-hidden flex flex-col`}
        onClick={(e) => {
          // Prevent clicks on the content container from bubbling up
          // This ensures tapping on the content doesn't close the gallery
          e.stopPropagation();
        }}
      >
        <div 
          className={`relative flex items-center justify-center ${isMobile && isTori ? 'h-[45vh]' : 'h-[60vh]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isBTR ? (
            <ImageViewer 
              imagePath="/images/map/map.webp"
              title={toriInfo.title}
              description={toriInfo.description}
              variant={toriInfo.variant}
            />
          ) : isTori ? (
            <ToriViewer variant={toriInfo.variant || ''} />
          ) : isArtPiece ? (
            <ModelViewer modelPath={`/models/${toriInfo.variant || ''}.glb`} />
          ) : isTattoo ? (
            <TattooViewer variant={toriInfo.variant || ''} />
          ) : (
            artworkInfo?.previewPath && (
              <div 
                className="w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  ref={imageRef}
                  src={artworkInfo.previewPath}
                  alt={artworkInfo.title}
                  className={`max-w-full max-h-full object-contain ${
                    object.name === 'Cube005' || object.name === 'qr_cube' 
                      ? 'w-full h-full' 
                      : ''
                  }`}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    requestAnimationFrame(() => {
                      if (imageRef.current) {
                        imageRef.current.style.maxHeight = object.name === 'Cube005' || object.name === 'qr_cube'
                          ? '70vh'
                          : '60vh';
                      }
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )
          )}
        </div>
        <div 
          className="w-full px-4 flex flex-col justify-center items-start py-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
            {info.title}
          </h2>
          <p className="text-base text-gray-300 mb-0.5">
            {info.subtitle}
          </p>
          <p className="text-base text-white">
            {info.description}
          </p>
        </div>
      </div>
    </div>
  );
} 