import { useState, useEffect, useCallback, useRef } from 'react';
import { useMapStore } from '../../lib/mapStore';
import { useInteractionStore } from '../../stores/interactionStore';
import { isMobileDevice } from '../../lib/utils';
import * as THREE from 'three';

// ************ CRITICAL FIX FOR TORI INFO DISPLAY ************
// This fixes the issue of all models showing info for TNPR0-100
// regardless of which model is displayed

// List of all Tori variants in order
const TORI_VARIANTS = [
  'TNPR0-100',
  'THE FLAYED ONE',
  'GOJO',
  'TOOL',
  'DEATH MONARCH',
  'BAKI',
  'COSMIC GOLEM',
  'SHO NUFF',
  'KILL BILL',
  'AKALI',
  'HELLRAISER I',
  'DMT',
  'ABADDON',
  'THUNDER GOD',
  'OLIVA',
  'Y-M3 v1',
  'HELLRAISER II',
  'SAGE',
  'KITSUNE',
  'TRIBAL1',
  'TRIBAL2',
  'COTTAGE FAIRY',
  'DUALITY',
  'ASURA',
  'PAIN',
  'SECOND KING',
  'THE DISCIPLE',
  'RIDE',
  'RODTANG',
  'KING',
  'DEATH',
  'RED',
  'XIII ARCANUM',
  'ASSASSIN',
  'PICKLE',
  'ICE',
  'CRUSADER',
  'BIRDMAN',
  'ATLANTEAN',
  'MAD DEATH',
  'THE DUKE',
  'KIRITO',
  'GOKU',
  'HISOKA',
  'MOROHA',
  'MUMMY',
  'SAMURAI'
];

// Mapping from Tori variants to their base sphere numbers
const TORI_SPHERE_NUMBERS = {
  'TNPR0-100': 'sphere10171',
  'THE FLAYED ONE': 'sphere101812',
  'GOJO': 'sphere10876',
  'TOOL': 'sphere10245',
  'DEATH MONARCH': 'sphere10199',
  'BAKI': 'sphere10447',
  'COSMIC GOLEM': 'sphere10759',
  'SHO NUFF': 'sphere10639',
  'KILL BILL': 'sphere10678',
  'AKALI': 'sphere10315',
  'HELLRAISER I': 'sphere101692',
  'DMT': 'sphere10135',
  'ABADDON': 'sphere101341',
  'THUNDER GOD': 'sphere101873',
  'OLIVA': 'sphere10564',
  'Y-M3 v1': 'sphere10366',
  'HELLRAISER II': 'sphere101653',
  'SAGE': 'sphere101770',
  'KITSUNE': 'sphere10001',
  'TRIBAL1': 'sphere10603', // Special case, shares with KITSUNE
  'TRIBAL2': 'sphere10904',
  'COTTAGE FAIRY': 'sphere10291',
  'DUALITY': 'sphere101076',
  'ASURA': 'sphere101536',
  'PAIN': 'sphere101263',
  'SECOND KING': 'sphere101185',
  'THE DISCIPLE': 'sphere10472',
  'RIDE': 'sphere101156',
  'RODTANG': 'sphere101109',
  'KING': 'sphere101834',
  'DEATH': 'sphere10053',
  'RED': 'sphere101451',
  'XIII ARCANUM': 'sphere10020',
  'ASSASSIN': 'sphere101025',
  'PICKLE': 'sphere101614',
  'ICE': 'sphere101011',
  'CRUSADER': 'sphere101575',
  'BIRDMAN': 'sphere10709',
  'ATLANTEAN': 'sphere101731',
  'MAD DEATH': 'sphere101497',
  'THE DUKE': 'sphere10522',
  'KIRITO': 'sphere10795',
  'GOKU': 'sphere10837',
  'HISOKA': 'sphere101419',
  'MOROHA': 'sphere101302',
  'MUMMY': 'sphere101380',
  'SAMURAI': 'sphere101224'
};

const MobileToriSlideshow = () => {
  const { currentMap } = useMapStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { 
    setSelectedObject, 
    setShowInfo, 
    selectedObject, 
    isForceTorisOpen,
    setForceTorisOpen,
    showInfo
  } = useInteractionStore();
  const didMountRef = useRef(false);
  const [forceRender, setForceRender] = useState(0);
  
  // Force re-render periodically to ensure visibility
  useEffect(() => {
    // If we're in the toris map and on mobile, periodically force re-render
    if (currentMap === 'toris' && isMobileDevice()) {
      const timer = setInterval(() => {
        setForceRender(prev => prev + 1);
        console.log('🔄 Forcing re-render of MobileToriSlideshow controls');
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentMap]);
  
  // Simple function to create and show a Tori
  const createAndShowTori = useCallback((index: number) => {
    // *** IMPORTANT FIX: When we create Tori objects, we need to use the actual sphere naming convention
    // that triggers proper info display in getObjectInfo() ***

    console.log(`Creating Tori: ${TORI_VARIANTS[index]}`);
    
    // Create actual sphere object with proper naming
    const obj = new THREE.Object3D();
    
    // Use these sphere object names to get correct information display
    // Format: sphere<baseNumber>_<index>
    const baseNames: Record<string, string> = {
      'TNPR0-100': 'sphere10171_1',
      'THE FLAYED ONE': 'sphere101812_1',
      'GOJO': 'sphere10876_1',
      'TOOL': 'sphere10245_1',
      'DEATH MONARCH': 'sphere10199_1',
      'BAKI': 'sphere10447_1',
      'COSMIC GOLEM': 'sphere10759_1',
      'SHO NUFF': 'sphere10639_1',
      'KILL BILL': 'sphere10678_1',
      'AKALI': 'sphere10315_1',
      'HELLRAISER I': 'sphere101692_1',
      'DMT': 'sphere10135_1',
      'ABADDON': 'sphere101341_1',
      'THUNDER GOD': 'sphere101873_1',
      'OLIVA': 'sphere10564_1',
      'Y-M3 v1': 'sphere10366_1',
      'HELLRAISER II': 'sphere101653_1',
      'SAGE': 'sphere101770_1',
      'KITSUNE': 'sphere10001_1',
      'TRIBAL1': 'sphere10603_39', // Special case: TRIBAL1 uses index > 38
      'TRIBAL2': 'sphere10904_1',
      'COTTAGE FAIRY': 'sphere10291_1',
      'DUALITY': 'sphere101076_1',
      'ASURA': 'sphere101536_1',
      'PAIN': 'sphere101263_1',
      'SECOND KING': 'sphere101185_1',
      'THE DISCIPLE': 'sphere10472_1',
      'RIDE': 'sphere101156_1',
      'RODTANG': 'sphere101109_1',
      'KING': 'sphere101834_1',
      'DEATH': 'sphere10053_1',
      'RED': 'sphere101451_1',
      'XIII ARCANUM': 'sphere10020_1',
      'ASSASSIN': 'sphere101025_1',
      'PICKLE': 'sphere101614_1',
      'ICE': 'sphere101011_1',
      'CRUSADER': 'sphere101575_1',
      'BIRDMAN': 'sphere10709_1',
      'ATLANTEAN': 'sphere101731_1',
      'MAD DEATH': 'sphere101497_1',
      'THE DUKE': 'sphere10522_1',
      'KIRITO': 'sphere10795_1',
      'GOKU': 'sphere10837_1',
      'HISOKA': 'sphere101419_1',
      'MOROHA': 'sphere101302_1',
      'MUMMY': 'sphere101380_1',
      'SAMURAI': 'sphere101224_1'
    };
    
    // Set the proper sphere name that will trigger correct info
    obj.name = baseNames[TORI_VARIANTS[index]] || TORI_VARIANTS[index];
    console.log(`Created object with name: ${obj.name}`);
    
    setSelectedObject(obj);
    setShowInfo(true);
    
    // Set the force open flag
    setForceTorisOpen(true);
    
    // Set the auto-open flag on the document body
    document.body.setAttribute('data-toris-auto-open', 'true');
    
    // Disable movement
    window.dispatchEvent(new CustomEvent('interactable-opened'));
  }, [setSelectedObject, setShowInfo, setForceTorisOpen]);

  // Component mount effect - triggers on first mount if in Toris map
  useEffect(() => {
    console.log('MobileToriSlideshow component mounted, map:', currentMap);
    
    // Always check on mount, not just first time
    if (currentMap === 'toris') {
      const mobile = isMobileDevice();
      
      // Only proceed if this is a mobile device - strict check
      if (mobile) {
        console.log('👁️ MobileToriSlideshow mounted in toris map - showing tori IMMEDIATELY');
        createAndShowTori(0);
        setCurrentIndex(0);
        
        // Set flags to prevent accidental closing
        document.body.setAttribute('data-toris-auto-open', 'true');
        setForceTorisOpen(true);
        
        // Multiple attempts with delays to ensure it works
        setTimeout(() => {
          if (!selectedObject) {
            console.log('📱 Retry showing Tori after 200ms');
            createAndShowTori(0);
          }
        }, 200);
        
        setTimeout(() => {
          if (!selectedObject) {
            console.log('📱 Retry showing Tori after 500ms');
            createAndShowTori(0);
          }
        }, 500);
      } else {
        console.log('💻 Desktop device - NOT auto-showing Tori viewer');
        // Explicitly remove attributes for desktop
        document.body.removeAttribute('data-toris-auto-open');
        setForceTorisOpen(false);
      }
    }
  }, [currentMap, createAndShowTori, selectedObject, setForceTorisOpen]);

  // Force open when currentMap changes to 'toris'
  useEffect(() => {
    if (currentMap === 'toris') {
      const mobile = isMobileDevice();
      
      // Only proceed if this is a mobile device - strict check
      if (mobile) {
        console.log('🔵 Map changed to toris - FORCING Tori viewer to open on mobile');
        createAndShowTori(0);
        setCurrentIndex(0);
        
        // Set flags to prevent accidental closing
        setForceTorisOpen(true);
        document.body.setAttribute('data-toris-auto-open', 'true');
      } else {
        console.log('💻 Desktop device - NOT auto-showing Tori viewer');
        // Explicitly remove attributes for desktop
        document.body.removeAttribute('data-toris-auto-open');
        setForceTorisOpen(false);
      }
    }
  }, [currentMap, createAndShowTori, setForceTorisOpen]);

  // Auto-show when entering toris map
  useEffect(() => {
    if (currentMap === 'toris') {
      // Mobile check using utility
      const mobile = isMobileDevice();
      
      if (mobile) {
        console.log('Mobile device detected in toris map - showing slideshow');
        // Show first tori immediately to ensure it opens as soon as map is loaded
        createAndShowTori(0);
        setCurrentIndex(0);
      } else {
        console.log('💻 Desktop device in Toris map - NOT auto-showing viewer');
        // Make sure we don't have auto-open attributes set for desktop
        document.body.removeAttribute('data-toris-auto-open');
        setForceTorisOpen(false);
      }
    }
  }, [currentMap, createAndShowTori, setForceTorisOpen]);

  // Listen for the mobile-entered-toris event as a backup
  useEffect(() => {
    const handleEvent = () => {
      if (currentMap === 'toris') {
        // Only proceed if this is a mobile device - strict check
        const mobile = isMobileDevice();
        
        if (mobile) {
          console.log('Received mobile-entered-toris event on mobile device');
          createAndShowTori(0);
          setCurrentIndex(0);
          // Set the auto-open flag to prevent accidental closing
          document.body.setAttribute('data-toris-auto-open', 'true');
        } else {
          console.log('💻 Desktop received mobile-entered-toris event - IGNORING');
          // Explicitly remove attributes for desktop
          document.body.removeAttribute('data-toris-auto-open');
          setForceTorisOpen(false);
        }
      }
    };

    window.addEventListener('mobile-entered-toris', handleEvent);
    return () => window.removeEventListener('mobile-entered-toris', handleEvent);
  }, [currentMap, createAndShowTori, setForceTorisOpen]);

  // Listen for the desktop-entered-toris event to make absolutely sure we don't open on desktop
  useEffect(() => {
    const handleDesktopEvent = () => {
      console.log('💻 Desktop-specific Toris event detected - ensuring slideshow stays closed');
      
      // Force close any open slideshow on desktop
      if (selectedObject) {
        setSelectedObject(null);
      }
      
      if (showInfo) {
        setShowInfo(false);
      }
      
      // Remove all auto-open flags
      document.body.removeAttribute('data-toris-auto-open');
      setForceTorisOpen(false);
      
      // Set desktop-specific flag to block mobile triggers
      document.body.setAttribute('data-is-desktop-toris', 'true');
    };

    window.addEventListener('desktop-entered-toris', handleDesktopEvent);
    return () => window.removeEventListener('desktop-entered-toris', handleDesktopEvent);
  }, [selectedObject, showInfo, setSelectedObject, setShowInfo, setForceTorisOpen]);

  // Navigation handlers
  const showPrevious = () => {
    const newIndex = currentIndex <= 0 ? TORI_VARIANTS.length - 1 : currentIndex - 1;
    console.log(`Showing previous tori: ${TORI_VARIANTS[newIndex]}`);
    setCurrentIndex(newIndex);
    createAndShowTori(newIndex);
  };

  const showNext = () => {
    const newIndex = currentIndex >= TORI_VARIANTS.length - 1 ? 0 : currentIndex + 1;
    console.log(`Showing next tori: ${TORI_VARIANTS[newIndex]}`);
    setCurrentIndex(newIndex);
    createAndShowTori(newIndex);
  };

  const returnToCentral = () => {
    console.log('Returning to central with full teleport experience');
    // Remove the auto-open flag when explicitly returning
    document.body.removeAttribute('data-toris-auto-open');
    // Reset the force open flag
    setForceTorisOpen(false);
    setSelectedObject(null);
    setShowInfo(false);
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Trigger the full teleport experience with loading screen
    window.dispatchEvent(new CustomEvent('trigger-teleport', { 
      detail: { targetMap: 'central', fromMap: 'toris' } 
    }));
  };

  // Only show on mobile and only in toris map
  if (currentMap !== 'toris' || !isMobileDevice()) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 flex justify-center items-center z-[9999] pointer-events-auto" style={{ position: 'fixed', bottom: '5%', zIndex: 9999 }}>
      <div className="bg-black rounded-2xl px-8 py-4 flex items-center gap-8 shadow-2xl border-2 border-white/50">
        <button 
          onClick={showPrevious}
          className="w-20 h-20 flex items-center justify-center bg-white/70 rounded-full active:bg-white hover:bg-white/90 touch-manipulation shadow-lg"
          aria-label="Previous Statue"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <button 
          onClick={returnToCentral}
          className="w-24 h-24 flex items-center justify-center bg-white rounded-full active:bg-white/80 hover:bg-white/90 touch-manipulation shadow-lg"
          aria-label="Return to Central"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
        <button 
          onClick={showNext}
          className="w-20 h-20 flex items-center justify-center bg-white/70 rounded-full active:bg-white hover:bg-white/90 touch-manipulation shadow-lg"
          aria-label="Next Statue"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MobileToriSlideshow;
