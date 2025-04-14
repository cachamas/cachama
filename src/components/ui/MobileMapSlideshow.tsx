import { useState, useCallback, useEffect, useRef } from 'react';
import { useMapStore } from '../game/World';
import { isMobileDevice } from '../../lib/utils';
import { useInteractionStore } from '../../stores/interactionStore';
import { useLoadingStore } from '../../stores/loadingStore';
import * as THREE from 'three';

// List of all GCT artworks and tattoos in order
const GCT_ARTWORKS = [
  // Art pieces
  'TOYOBOBO',
  'PODER',
  'LIFE OF HUGO',
  'MOTOTAXI',
  'SAN ISMAELITO',
  'LOCOS',
  'EL ANGEL DE LA GUARDIA',
  'CUARTEL DE LA MONTANA',
  'LA RATA',
  'LIBEREN A DORANGEL',
  'DARIEN',
  'CHIRIPERO',
  'GRAN POLO PATRIOTA',
  'HOMOSEXUAL',
  // Tattoo designs
  'LAS TRES GRACIAS',
  'CABALLO',
  'MARIA LIONZA',
  "IT'S YOUR MOVE",
  'SELKNAM',
  'CARICUAO'
];

// List of all Gallery artworks and paintings in order
const GALLERY_ARTWORKS = [
  'WEIWEI',
  'ENGINEER',
  'HAVEN',
  'MGS',
  'INDIOS',
  'LOML',
  'SELKNAM',
  'YEULE',
  'CH#1',
  'BONZI',
  'THE END OF IT ALL',
  'MINAMOTO',
  'THE DARK SEXTET',
  'NIKOLA',
  'MOTO',
  'TB WORLD CHAMPIONSHIP',
  'ANGEL',
  'ALAN SLEEVE',
  'MISSION CONTROLLED',
  'ROSITA YUQUITA',
  'DAGGERS',
  'CASE',
  'POOKIEPHANT',
  'LINDA EVANGELISTA',
  'MICKEY BOXING'
];

// Mapping of artwork names to their corresponding object names
const ARTWORK_TO_OBJECT_MAP: Record<string, string> = {
  'TOYOBOBO': 'Mesh_0',
  'PODER': 'Mesh_0002', // Fixed PODER mapping
  'LIFE OF HUGO': 'Mesh_0003',
  'MOTOTAXI': 'Mesh_0004',
  'SAN ISMAELITO': 'Mesh_0005',
  'LOCOS': 'Mesh_0006',
  'EL ANGEL DE LA GUARDIA': 'Mesh_0007',
  'CUARTEL DE LA MONTANA': 'Mesh_0012',
  'LA RATA': 'Mesh_0011',
  'LIBEREN A DORANGEL': 'Mesh_0010',
  'DARIEN': 'Mesh_0013',
  'CHIRIPERO': 'Mesh_0009',
  'GRAN POLO PATRIOTA': 'Mesh_0008',
  'HOMOSEXUAL': 'Mesh_0001',
  'LAS TRES GRACIAS': 'unnamed016',
  'CABALLO': 'unnamed015',
  'MARIA LIONZA': 'unnamed014',
  "IT'S YOUR MOVE": 'unnamed009',
  'SELKNAM': 'unnamed010',
  'CARICUAO': 'unnamed011'
};

// Mapping of gallery artwork names to their corresponding object names
const GALLERY_ARTWORK_TO_OBJECT_MAP: Record<string, string> = {
  'WEIWEI': 'Object_2005',
  'ENGINEER': 'engi',
  'HAVEN': 'mural',
  'MGS': 'mgs',
  'INDIOS': 'indios',
  'LOML': 'lolita',
  'SELKNAM': 'selknam',
  'YEULE': 'yeule',
  'CH#1': 'china',
  'BONZI': 'bonzi',
  'THE END OF IT ALL': 'dnd',
  'MINAMOTO': 'samurai',
  'THE DARK SEXTET': 'persona',
  'NIKOLA': 'tesla',
  'MOTO': 'moto',
  'TB WORLD CHAMPIONSHIP': 'toris',
  'ANGEL': 'angel',
  'ALAN SLEEVE': 'alan',
  'MISSION CONTROLLED': 'drg',
  'ROSITA YUQUITA': 'rosita',
  'DAGGERS': 'daggers',
  'CASE': 'forro',
  'POOKIEPHANT': 'elephant',
  'LINDA EVANGELISTA': 'linda',
  'MICKEY BOXING': 'mickey'
};

const MobileMapSlideshow = () => {
  const { currentMap } = useMapStore();
  const [isSlideShowOpen, setIsSlideShowOpen] = useState(false);
  const [currentGCTIndex, setCurrentGCTIndex] = useState(0);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [forceRender, setForceRender] = useState(0);
  
  // Only exclude toris map for regular slideshow
  const isValidMap = currentMap !== 'toris';
  const isMobile = isMobileDevice();
  
  // Explicitly check for GCT map - with extra safety check
  const isGCTMap = currentMap === 'gct';
  
  // Explicitly check for central map 
  const isCentralMap = currentMap === 'central';
  
  // Explicitly check for gallery map
  const isGalleryMap = currentMap === 'gallery';

  // Explicitly check for music map
  const isMusicMap = currentMap === 'music';

  // Explicitly check for overworld map
  const isOverworldMap = currentMap === 'overworld';
  
  // Show toggle button based on explicit map checks and mobile detection
  const showToggleButton = isValidMap && !isCentralMap && !isGCTMap && !isGalleryMap && !isMusicMap && !isOverworldMap && isMobileDevice();
  
  // Force re-render periodically to ensure controls stay visible on mobile
  useEffect(() => {
    if (isMobileDevice() && (isGCTMap || isGalleryMap) && isSlideShowOpen) {
      const timer = setInterval(() => {
        setForceRender(prev => prev + 1);
      }, 2000);
      
      return () => clearInterval(timer);
    }
  }, [isGCTMap, isGalleryMap, isSlideShowOpen]);
  
  // Get interaction store functions
  const { 
    setSelectedObject, 
    setShowInfo,
    selectedObject,
    showInfo 
  } = useInteractionStore();

  // Reference to BTR map object
  const [btrObject, setBtrObject] = useState<any>(null);
  const didMountRef = useRef(false);

  // Log current map for debugging
  useEffect(() => {
    console.log(`🌎 Current map changed to: ${currentMap}`);
    console.log(`🧪 Map state - isGCTMap: ${isGCTMap}, isCentralMap: ${isCentralMap}, isGalleryMap: ${isGalleryMap}`);
  }, [currentMap, isGCTMap, isCentralMap, isGalleryMap]);

  // Find and store the BTR map object reference
  useEffect(() => {
    if (isCentralMap) {
      // Find the Plane__0024 object in the scene
      const findBTRObject = () => {
        const scene = document.querySelector('canvas')?.parentElement;
        if (!scene) return null;
        
        // Use traverseVisible to find all objects
        let foundObject = null;
        window.dispatchEvent(new CustomEvent('find-object-by-name', {
          detail: {
            name: 'Plane__0024',
            callback: (object: any) => {
              if (object && object.name === 'Plane__0024') {
                foundObject = object;
                setBtrObject(object);
              }
            }
          }
        }));
        
        return foundObject;
      };

      findBTRObject();
    }
  }, [isCentralMap]);

  // Create and show artwork - updated to handle both GCT and Gallery artworks
  const createAndShowArtwork = useCallback((index: number, isGallery = false) => {
    const artworkArray = isGallery ? GALLERY_ARTWORKS : GCT_ARTWORKS;
    const objectMap = isGallery ? GALLERY_ARTWORK_TO_OBJECT_MAP : ARTWORK_TO_OBJECT_MAP;
    const eventName = isGallery ? 'gallery-opened' : 'gct-gallery-opened';

    console.log(`🎨 Creating ${isGallery ? 'Gallery' : 'GCT'} artwork: ${artworkArray[index]}`);
    
    // Create an object with the proper name that will trigger correct info
    const obj = new THREE.Object3D();
    obj.name = objectMap[artworkArray[index]] || artworkArray[index];
    
    console.log(`🎨 Created object with name: ${obj.name}`);
    
    // Always ensure clean state before showing new artwork
    setSelectedObject(null);
    setShowInfo(false);
    
    // Use a requestAnimationFrame to ensure the UI has updated before setting new state
    requestAnimationFrame(() => {
      // Small delay to ensure the state updates before showing the new object
      setTimeout(() => {
        // Directly apply the info to the store
        setSelectedObject(obj);
        setShowInfo(true);
        
        // Signal that gallery is open
        window.dispatchEvent(new CustomEvent(eventName));
      }, 50);
    });
    
    // Disable movement
    window.dispatchEvent(new CustomEvent('interactable-opened'));
  }, [setSelectedObject, setShowInfo]);

  // Navigation handlers
  const showPrevious = useCallback((isGallery = false) => {
    if (isGallery) {
      const isLooping = currentGalleryIndex <= 0;
      const newIndex = isLooping ? GALLERY_ARTWORKS.length - 1 : currentGalleryIndex - 1;
      console.log(`🎨 Showing previous gallery artwork: ${GALLERY_ARTWORKS[newIndex]}`);
      
      // Signal that gallery is still open when navigating
      window.dispatchEvent(new CustomEvent('gallery-opened'));
      
      // Don't close the gallery completely - just clear the selected object temporarily
      setSelectedObject(null);
      
      // Keep the slideshow open
      setIsSlideShowOpen(true);
      
      // Set the new index
      setCurrentGalleryIndex(newIndex);
      
      // Add a longer delay when looping from first to last item to ensure proper loading
      setTimeout(() => {
        createAndShowArtwork(newIndex, true);
      }, isLooping ? 250 : 50);
    } else {
      const isLooping = currentGCTIndex <= 0;
      const newIndex = isLooping ? GCT_ARTWORKS.length - 1 : currentGCTIndex - 1;
      console.log(`🎨 Showing previous GCT artwork: ${GCT_ARTWORKS[newIndex]}`);
      
      // Signal that gallery is still open when navigating
      window.dispatchEvent(new CustomEvent('gct-gallery-opened'));
      
      // Don't close the gallery completely - just clear the selected object temporarily
      setSelectedObject(null);
      
      // Keep the slideshow open
      setIsSlideShowOpen(true);
      
      // Set the new index
      setCurrentGCTIndex(newIndex);
      
      // Add a longer delay when looping from first to last item to ensure proper loading
      setTimeout(() => {
        createAndShowArtwork(newIndex);
      }, isLooping ? 250 : 50);
    }
  }, [currentGCTIndex, currentGalleryIndex, createAndShowArtwork, setSelectedObject]);

  const showNext = useCallback((isGallery = false) => {
    if (isGallery) {
      const isLooping = currentGalleryIndex >= GALLERY_ARTWORKS.length - 1;
      const newIndex = isLooping ? 0 : currentGalleryIndex + 1;
      console.log(`🎨 Showing next gallery artwork: ${GALLERY_ARTWORKS[newIndex]}`);
      
      // Signal that gallery is still open when navigating
      window.dispatchEvent(new CustomEvent('gallery-opened'));
      
      // Don't close the gallery completely - just clear the selected object temporarily
      setSelectedObject(null);
      
      // Keep the slideshow open
      setIsSlideShowOpen(true);
      
      // Set the new index
      setCurrentGalleryIndex(newIndex);
      
      // Add a longer delay when looping from last to first item to ensure proper loading
      setTimeout(() => {
        createAndShowArtwork(newIndex, true);
      }, isLooping ? 250 : 50);
    } else {
      const isLooping = currentGCTIndex >= GCT_ARTWORKS.length - 1;
      const newIndex = isLooping ? 0 : currentGCTIndex + 1;
      console.log(`🎨 Showing next GCT artwork: ${GCT_ARTWORKS[newIndex]}`);
      
      // Signal that gallery is still open when navigating
      window.dispatchEvent(new CustomEvent('gct-gallery-opened'));
      
      // Don't close the gallery completely - just clear the selected object temporarily
      setSelectedObject(null);
      
      // Keep the slideshow open
      setIsSlideShowOpen(true);
      
      // Set the new index
      setCurrentGCTIndex(newIndex);
      
      // Add a longer delay when looping from last to first item to ensure proper loading
      setTimeout(() => {
        createAndShowArtwork(newIndex);
      }, isLooping ? 250 : 50);
    }
  }, [currentGCTIndex, currentGalleryIndex, createAndShowArtwork, setSelectedObject]);

  // Return to the central map function
  const returnToCentral = useCallback(() => {
    console.log('🎨 Closing GCT artwork viewer and returning to central map');
    
    // Signal that GCT gallery is being closed
    window.dispatchEvent(new CustomEvent('gct-gallery-closed'));
    
    // Also signal that gallery is closed if we're in gallery map
    if (isGalleryMap) {
      window.dispatchEvent(new CustomEvent('gallery-closed'));
    }
    
    // Close the viewer first
    setSelectedObject(null);
    setShowInfo(false);
    
    // Remove any auto-open flags
    document.body.removeAttribute('data-toris-auto-open');
    
    // Set loading state in the loading store
    const loadingStore = useLoadingStore?.getState();
    if (loadingStore) {
      // Show loading screen with the proper video
      loadingStore.setLoading(true);
      loadingStore.setCurrentVideo('central.mp4');
    }
    
    // Mark that controls should be visible after teleport
    document.body.setAttribute('data-controls-visible', 'true');
    
    // Close the slideshow UI immediately
    setIsSlideShowOpen(false);
    
    // Reset indexes
    setCurrentGCTIndex(0);
    setCurrentGalleryIndex(0);
    
    // Dispatch map transition event first - important!
    window.dispatchEvent(new CustomEvent('map-transition', { 
      detail: { from: currentMap, to: 'central' } 
    }));
    
    // Dispatch the teleport event with proper source and destination details
    // This is the key event that triggers the actual map change in World.tsx
    window.dispatchEvent(new CustomEvent('teleport-to-central', { 
      detail: { from: currentMap, to: 'central' } 
    }));
    
    // Dispatch game initialization event to trigger "click to continue" text
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('game-fully-initialized'));
    }, 2000);
    
    // Provide haptic feedback if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Force mobile controls re-initialization with delays
    // First reset immediately
    window.dispatchEvent(new CustomEvent('reset-controls'));
    
    // Second reset after loading screen appears
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('reset-controls'));
      
      // Dispatch game initialization event again as a backup
      window.dispatchEvent(new CustomEvent('game-fully-initialized'));
    }, 1000);
    
    // Third reset after map change likely completed
    setTimeout(() => {
      // Re-enable mobile controls explicitly
      document.body.setAttribute('data-controls-visible', 'true');
      window.dispatchEvent(new CustomEvent('reset-controls'));
      
      // Dispatch the interactable-closed event which should restore UI visibility
      window.dispatchEvent(new CustomEvent('interactable-closed'));
      
      // Final attempt at ensuring "click to continue" appears
      window.dispatchEvent(new CustomEvent('game-fully-initialized'));
    }, 3000);
  }, [setSelectedObject, setShowInfo, setIsSlideShowOpen, currentMap, setCurrentGCTIndex, setCurrentGalleryIndex, isGalleryMap]);

  const toggleSlideshow = useCallback(() => {
    // Original slideshow toggle functionality for non-central maps
    setIsSlideShowOpen(prev => !prev);
  }, []);
  
  // Handle GCT slideshow opening - open first artwork
  const openGCTSlideshow = useCallback(() => {
    console.log('🎨 Opening GCT artwork slideshow');
    
    // First reset the state and index to ensure fresh start
    setCurrentGCTIndex(0);
    setSelectedObject(null);
    setShowInfo(false);
    setIsSlideShowOpen(true);
    
    // Exit pointer lock if needed for better interaction
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Provide haptic feedback if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Disable player movement
    window.dispatchEvent(new CustomEvent('interactable-opened'));
    
    // Specifically signal that GCT gallery is open
    window.dispatchEvent(new CustomEvent('gct-gallery-opened'));
    
    // Use requestAnimationFrame to ensure UI updates before showing artwork
    requestAnimationFrame(() => {
      // Show the first artwork after a delay to ensure clean state
      setTimeout(() => {
        createAndShowArtwork(0);
      }, 150);
    });
  }, [createAndShowArtwork, setSelectedObject, setShowInfo]);
  
  // New function to handle magnifying glass button click specifically for BTR map in central
  const handleBTRButtonClick = useCallback(() => {
    console.log('🗺️ BTR Map button clicked in central map');
    
    // Exit pointer lock if needed
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Create a synthetic object with the same structure as needed by ObjectInfo
    const synthObject = btrObject || {
      name: 'Plane__0024',
      type: 'Object3D'
    };
    
    // Set selected object and show info
    window.dispatchEvent(new CustomEvent('show-btr-map', {
      detail: {
        object: synthObject
      }
    }));
    
    // Set flags to indicate map is open
    document.body.setAttribute('data-map-open', 'true');
    window.__btrMapOpen = true;
  }, [btrObject]);

  // Handle GCT gallery button click
  const handleGCTGalleryButtonClick = useCallback(() => {
    console.log('🎨 GCT Gallery button clicked in GCT map');
    openGCTSlideshow();
  }, [openGCTSlideshow]);

  // Handle Gallery slideshow opening
  const openGallerySlideshow = useCallback(() => {
    console.log('🎨 Opening Gallery artwork slideshow');
    
    // First reset the state and index to ensure fresh start
    setCurrentGalleryIndex(0);
    setSelectedObject(null);
    setShowInfo(false);
    setIsSlideShowOpen(true);
    
    // Exit pointer lock if needed for better interaction
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Provide haptic feedback if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Disable player movement
    window.dispatchEvent(new CustomEvent('interactable-opened'));
    
    // Specifically signal that gallery is open
    window.dispatchEvent(new CustomEvent('gallery-opened'));
    
    // Use requestAnimationFrame to ensure UI updates before showing artwork
    requestAnimationFrame(() => {
      // Show the first artwork after a delay to ensure clean state
      setTimeout(() => {
        createAndShowArtwork(0, true);
      }, 150);
    });
  }, [createAndShowArtwork, setSelectedObject, setShowInfo]);

  // Handle Gallery button click
  const handleGalleryButtonClick = useCallback(() => {
    console.log('🎨 Gallery button clicked in Gallery map');
    openGallerySlideshow();
  }, [openGallerySlideshow]);

  // Close artwork viewer when leaving maps
  useEffect(() => {
    if (!isGCTMap && !isGalleryMap) {
      // Reset state if we were in GCT or gallery map before
      if (didMountRef.current && isSlideShowOpen) {
        console.log('Leaving map, cleaning up gallery state');
        
        // Full and complete reset of all gallery-related state
        setIsSlideShowOpen(false);
        setCurrentGCTIndex(0);
        setCurrentGalleryIndex(0);
        
        // Clear selection with a small delay to ensure proper cleanup
        setSelectedObject(null);
        setShowInfo(false);
        
        // Re-enable movement when leaving
        window.dispatchEvent(new CustomEvent('interactable-closed'));
      }
    }
    
    // Set didMountRef after first render
    if (!didMountRef.current) {
      didMountRef.current = true;
    }
  }, [isGCTMap, isGalleryMap, isSlideShowOpen, setSelectedObject, setShowInfo]);

  return (
    <>
      {/* BTR Map button - only in central map and on mobile */}
      {isCentralMap && isMobileDevice() && (
        <button 
          onClick={handleBTRButtonClick}
          className="fixed top-4 right-4 w-16 h-16 flex items-center justify-center bg-black/40 rounded-full active:opacity-80 hover:opacity-90 touch-manipulation shadow-lg border-2 border-white/50 z-[999999]"
          aria-label="Open BTR Map"
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            opacity: 1,
            visibility: 'visible',
            display: 'flex',
            minWidth: '4rem',
            minHeight: '4rem'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      )}
      
      {/* GCT Gallery button - only in GCT map and on mobile */}
      {isGCTMap && isMobileDevice() && (
        <button 
          onClick={handleGCTGalleryButtonClick}
          className="fixed top-4 right-4 w-16 h-16 flex items-center justify-center bg-black/40 rounded-full active:opacity-80 hover:opacity-90 touch-manipulation shadow-lg border-2 border-white/50 z-[999999]"
          aria-label="Open GCT Gallery"
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            opacity: 1,
            visibility: 'visible',
            display: 'flex',
            minWidth: '4rem',
            minHeight: '4rem'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
      )}

      {/* Gallery button - only in gallery map and on mobile */}
      {isGalleryMap && isMobileDevice() && (
        <button 
          onClick={handleGalleryButtonClick}
          className="fixed top-4 right-4 w-16 h-16 flex items-center justify-center bg-black/40 rounded-full active:opacity-80 hover:opacity-90 touch-manipulation shadow-lg border-2 border-white/50 z-[999999]"
          aria-label="Open Gallery Slideshow"
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            opacity: 1,
            visibility: 'visible',
            display: 'flex',
            minWidth: '4rem',
            minHeight: '4rem'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
      )}
      
      {/* Tap anywhere overlay to close GCT gallery - only when gallery is open and on mobile */}
      {isGCTMap && showInfo && isMobileDevice() && (
        <div 
          className="fixed inset-0 z-[5000] touch-manipulation"
          onClick={(e) => {
            // Stop propagation to prevent closing when tapping navigation buttons
            e.stopPropagation();
            
            console.log('🎨 Closing GCT gallery from tap overlay');
            setSelectedObject(null);
            setShowInfo(false);
            setIsSlideShowOpen(false);
            
            // Signal gallery is closed
            window.dispatchEvent(new CustomEvent('gct-gallery-closed'));
            window.dispatchEvent(new CustomEvent('interactable-closed'));
            
            // Provide haptic feedback if available on mobile
            if (navigator.vibrate) {
              navigator.vibrate([10, 10]);
            }
          }}
          style={{ 
            backgroundColor: 'transparent', 
            pointerEvents: 'auto',
            // Important: exclude the navigation area from the tap-to-close behavior
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 0% 80%)'
          }}
        />
      )}
      
      {/* Tap anywhere overlay to close gallery - only when gallery is open and on mobile */}
      {isGalleryMap && showInfo && isMobileDevice() && (
        <div 
          className="fixed inset-0 z-[5000] touch-manipulation"
          onClick={(e) => {
            // Stop propagation to prevent closing when tapping navigation buttons
            e.stopPropagation();
            
            console.log('🎨 Closing gallery from tap overlay');
            setSelectedObject(null);
            setShowInfo(false);
            setIsSlideShowOpen(false);
            
            // Signal gallery is closed
            window.dispatchEvent(new CustomEvent('gallery-closed'));
            window.dispatchEvent(new CustomEvent('interactable-closed'));
            
            // Provide haptic feedback if available on mobile
            if (navigator.vibrate) {
              navigator.vibrate([10, 10]);
            }
          }}
          style={{ 
            backgroundColor: 'transparent', 
            pointerEvents: 'auto',
            // Important: exclude the navigation area from the tap-to-close behavior
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 0% 80%)'
          }}
        />
      )}
      
      {/* Regular slideshow toggle button - for other maps and only on mobile */}
      {showToggleButton && isMobileDevice() && (
        <button 
          onClick={toggleSlideshow}
          className="fixed top-4 right-4 w-16 h-16 flex items-center justify-center bg-black/40 rounded-full active:opacity-80 hover:opacity-90 touch-manipulation shadow-lg border-2 border-white/50 z-[999999]"
          aria-label="Toggle Slideshow"
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            opacity: 1,
            visibility: 'visible',
            display: 'flex',
            minWidth: '4rem',
            minHeight: '4rem'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      )}
      
      {/* Full slideshow controls - only visible when active, NOT in central or GCT map, and on mobile */}
      {isSlideShowOpen && !isCentralMap && !isGCTMap && isMobileDevice() && (
        <div className="fixed left-0 right-0 flex justify-center items-center z-[99999] pointer-events-auto" style={{ position: 'fixed', bottom: '5%', zIndex: 99999 }}>
          <div className="flex items-center gap-16">
            <div className="flex flex-col items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showPrevious(isGalleryMap);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Previous Item"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  returnToCentral();
                }}
                className="w-20 h-20 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Return to Central"
                style={{minWidth: '5rem', minHeight: '5rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"></path>
                  <path d="M19 12l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showNext(isGalleryMap);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Next Item"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Gallery navigation controls - shown when in gallery map, info is visible, and on mobile */}
      {isGalleryMap && showInfo && isMobileDevice() && (
        <div className="fixed left-0 right-0 flex justify-center items-center z-[9999] pointer-events-auto" 
             style={{ position: 'fixed', bottom: '5%', zIndex: 9999 }}
             key={`gallery-controls-${forceRender}`} /* Key to force re-render */
             onClick={(e) => e.stopPropagation()} /* Prevent closing when tapping navigation area */
        >
          <div className="flex items-center gap-16" onClick={(e) => e.stopPropagation()}> {/* Large gap between buttons */}
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the prev handler but for gallery with true param
                  showPrevious(true);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Previous Artwork"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  returnToCentral();
                }}
                className="w-20 h-20 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Return to Central"
                style={{minWidth: '5rem', minHeight: '5rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"></path>
                  <path d="M19 12l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the next handler but for gallery with true param
                  showNext(true);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Next Artwork"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GCT Art Gallery navigation controls - only on mobile */}
      {isGCTMap && showInfo && isMobileDevice() && (
        <div className="fixed left-0 right-0 flex justify-center items-center z-[9999] pointer-events-auto" 
             style={{ position: 'fixed', bottom: '5%', zIndex: 9999 }}
             key={`controls-${forceRender}`} /* Key to force re-render */
             onClick={(e) => e.stopPropagation()} /* Prevent closing when tapping navigation area */
        >
          <div className="flex items-center gap-16" onClick={(e) => e.stopPropagation()}> {/* Large gap between buttons just like ToriViewer */}
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showPrevious();
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Previous Artwork"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  returnToCentral();
                }}
                className="w-20 h-20 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Return to Central"
                style={{minWidth: '5rem', minHeight: '5rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"></path>
                  <path d="M19 12l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                className="w-16 h-16 flex items-center justify-center rounded-full active:opacity-80 hover:opacity-90 touch-manipulation"
                aria-label="Next Artwork"
                style={{minWidth: '4rem', minHeight: '4rem'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMapSlideshow; 