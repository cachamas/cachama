import { useEffect, useState, useRef, useCallback } from 'react';
import { Object3D } from 'three';
import { artworkData, ArtworkInfo } from '../../lib/artworkData';
import ToriViewer from './ToriViewer';
import ModelViewer from './ModelViewer';
import TattooViewer from './TattooViewer';
import ImageViewer from './ImageViewer';
import MusicDiscViewer from './MusicDiscViewer';
import { getObjectInfo } from '../../lib/interactionSystem';
import { useInteractionStore } from '@/stores/interactionStore';
import { useMapStore } from '@/stores/mapStore';
import { isMobileDevice } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Disc } from 'lucide-react';
import { useLoadingStore } from '@/stores/loadingStore';
import { getVideoUrlForMap } from '@/utils/videoUtils';

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

// Patch: extend ArtworkInfo to allow floatingLabel for type safety
export type ArtworkInfoWithFloating = ArtworkInfo & { floatingLabel?: string };

// Map material names to vinyl texture numbers
const vinylMaterialToId: Record<string, string> = {
  'Box001_Material_#25_0027': '1', // Clark Terry
  'Box001_Material_#25_0028': '2',
  'Box001_Material_#25_0026': '4',
  'Box001_Material_#25_0024': '5',
  'Box001_Material_#25_0025': '6',
  'Box001_Material_#25_0023': '7',
  'Box001_Material_#25_0014': '9',
  'Box001_Material_#25_0020': '8',
  'Box001_Material_#25_0019': '12',
  'Box001_Material_#25_0018': '11',
  'Box001_Material_#25_0029': '17',
  'Box001_Material_#25_0031': '18',
  'Box001_Material_#25_0030': '19',
  'Box001_Material_#25_0032': '20',
  'Box001_Material_#25_0033': '21',
  'Box001_Material_#25_0035': '22',
  'Box001_Material_#25_0034': '25',
  'Box001_Material_#25_0036': '23',
  'Box001_Material_#25_0037': '26',
  'Box001_Material_#25_0039': '24',
  'Box001_Material_#25_0038': '27',
  'Box001_Material_#25_0054': '31',
  'Box001_Material_#25_0052': '32',
  'Box001_Material_#25_0053': '33',
  'Box001_Material_#25_0051': '34',
  'Box001_Material_#25_0050': '35',
  'Box001_Material_#25_0048': '36',
  'Box001_Material_#25_0049': '55',
  'Box001_Material_#25_0047': '37',
  'Box001_Material_#25_0046': '56',
  'Box001_Material_#25_0044': '38',
  'Box001_Material_#25_0045': '57',
  'Box001_Material_#25_0056': '39',
  'Box001_Material_#25_0057': '40',
  'Box001_Material_#25_0059': '46',
  'Box001_Material_#25_0058': '47',
  'Box001_Material_#25_0060': '48',
  'Box001_Material_#25_0066': '60',
  'Box001_Material_#25_0083': '41',
  'Box001_Material_#25_0061': '49',
  'Box001_Material_#25_0063': '50',
  'Box001_Material_#25_0062': '51',
  'Box001_Material_#25_0064': '53',
  'Box001_Material_#25_0065': '52',
  'Box001_Material_#25_0067': '54',
  'Box001_Material_#25_0082': '62',
  'Box001_Material_#25_0080': '63',
  'Box001_Material_#25_0081': '64',
  'Box001_Material_#25_0079': '66',
  'Box001_Material_#25_0078': '67',
  'Box001_Material_#25_0071': '71',
  'Box001_Material_#25_0070': '89',
  'Box001_Material_#25_0076': '68',
  'Box001_Material_#25_0077': '85',
  'Box001_Material_#25_0075': '69',
  'Box001_Material_#25_0074': '86',
  'Box001_Material_#25_0072': '70',
  'Box001_Material_#25_0073': '88',
  'Box001_Material_#25_0097': '42',
  'Box001_Material_#25_0096': '72',
  'Box001_Material_#25_0094': '73',
  'Box001_Material_#25_0095': '74',
  'Box001_Material_#25_0093': '75',
  'Box001_Material_#25_0092': '76',
  'Box001_Material_#25_0090': '77',
  'Box001_Material_#25_0091': '84',
  'Box001_Material_#25_0089': '78',
  'Box001_Material_#25_0088': '83',
  'Box001_Material_#25_0086': '79',
  'Box001_Material_#25_0087': '82',
  'Box001_Material_#25_0085': '80',
  'Box001_Material_#25_0084': '81',
  'Box001_Material_#25_0098': '43',
  'Box001_Material_#25_0099': '90',
  'Box001_Material_#25_0101': '44',
  'Box001_Material_#25_0100': '91',
  'Box001_Material_#25_0102': '92',
  'Box001_Material_#25_0103': '93',
  'Box001_Material_#25_0105': '94',
  'Box001_Material_#25_0104': '95',
  'Box001_Material_#25_0106': '96',
  'Box001_Material_#25_0107': '87',
  'Box001_Material_#25_0108': '99',
  'Box001_Material_#25_0004': '104',
  'Box001_Material_#25_0005': '105',
  'Box001_Material_#25_0007': '106',
  'Box001_Material_#25_0006': '108',
  'Box001_Material_#25_0110': '98',
  'Box001_Material_#25_0111': '100',
  'Box001_Material_#25_0': '117',
  'Box001_Material_#25_0001': '101',
  'Box001_Material_#25_0003': '102',
  'Box001_Material_#25_0002': '103',
  'Box001_Material_#25_0008': '107',
  'Box001_Material_#25_0009': '109',
  'Box001_Material_#25_0011': '110',
  'Box001_Material_#25_0010': '111',
  'Box001_Material_#25_0012': '112',
  'Box001_Material_#25_0013': '113',
  'Box001_Material_#25_0195': '161',
  'Box001_Material_#25_0194': '137',
  'Box001_Material_#25_0192': '138',
  'Box001_Material_#25_0193': '115',
  'Box001_Material_#25_0191': '116',
  'Box001_Material_#25_0190': '118',
  'Box001_Material_#25_0277': '119',
  'Box001_Material_#25_0189': '114',
  'Box001_Material_#25_0187': '120',
  'Box001_Material_#25_0186': '122',
  'Box001_Material_#25_0184': '121',
  'Box001_Material_#25_0185': '123',
  'Box001_Material_#25_0183': '124',
  'Box001_Material_#25_0182': '125',
  'Box001_Material_#25_0168': '146',
  'Box001_Material_#25_0169': '159',
  'Box001_Material_#25_0281': '126',
  'Box001_Material_#25_0170': '127',
  'Box001_Material_#25_0172': '128',
  'Box001_Material_#25_0173': '129',
  'Box001_Material_#25_0175': '130',
  'Box001_Material_#25_0174': '132',
  'Box001_Material_#25_0176': '131',
  'Box001_Material_#25_0177': '135',
  'Box001_Material_#25_0179': '133',
  'Box001_Material_#25_0178': '136',
  'Box001_Material_#25_0180': '134',
  'Box001_Material_#25_0181': '153',
  'Box001_Material_#25_0167': '172',
  'Box001_Material_#25_0166': '162',
  'Box001_Material_#25_0164': '140',
  'Box001_Material_#25_0165': '141',
  'Box001_Material_#25_0163': '142',
  'Box001_Material_#25_0162': '143',
  'Box001_Material_#25_0160': '144',
  'Box001_Material_#25_0161': '147',
  'Box001_Material_#25_0159': '145',
  'Box001_Material_#25_0158': '148',
  'Box001_Material_#25_0156': '149',
  'Box001_Material_#25_0157': '152',
  'Box001_Material_#25_0155': '151',
  'Box001_Material_#25_0154': '154',
  'Box001_Material_#25_0140': '150',
  'Box001_Material_#25_0141': '189',
  'Box001_Material_#25_0143': '155',
  'Box001_Material_#25_0142': '156',
  'Box001_Material_#25_0144': '157',
  'Box001_Material_#25_0145': '139',
  'Box001_Material_#25_0147': '158',
  'Box001_Material_#25_0146': '164',
  'Box001_Material_#25_0148': '160',
  'Box001_Material_#25_0149': '166',
  'Box001_Material_#25_0151': '169',
  'Box001_Material_#25_0150': '167',
  'Box001_Material_#25_0152': '170',
  'Box001_Material_#25_0153': '171',
  'Box001_Material_#25_0126': '163',
  'Box001_Material_#25_0127': '200',
  'Box001_Material_#25_0129': '173',
  'Box001_Material_#25_0128': '174',
  'Box001_Material_#25_0130': '175',
  'Box001_Material_#25_0131': '176',
  'Box001_Material_#25_0133': '177',
  'Box001_Material_#25_0132': '182',
  'Box001_Material_#25_0134': '178',
  'Box001_Material_#25_0135': '183',
  'Box001_Material_#25_0137': '180',
  'Box001_Material_#25_0136': '184',
  'Box001_Material_#25_0138': '181',
  'Box001_Material_#25_0125': '165',
  'Box001_Material_#25_0124': '168',
  'Box001_Material_#25_0122': '185',
  'Box001_Material_#25_0123': '186',
  'Box001_Material_#25_0121': '187',
  'Box001_Material_#25_0120': '188',
  'Box001_Material_#25_0118': '190',
  'Box001_Material_#25_0119': '192',
  'Box001_Material_#25_0117': '191',
  'Box001_Material_#25_0116': '194',
  'Box001_Material_#25_0114': '195',
  'Box001_Material_#25_0115': '198',
  'Box001_Material_#25_0113': '196',
  'Box001_Material_#25_0112': '199',
  'Box001_Material_#25_0209': '203',
  'Box001_Material_#25_0208': '197',
  'Box001_Material_#25_0206': '201',
  'Box001_Material_#25_0207': '204',
  'Box001_Material_#25_0205': '206',
  'Box001_Material_#25_0204': '207',
  'Box001_Material_#25_0202': '61',
  'Box001_Material_#25_0203': '58',
  'Box001_Material_#25_0201': '29',
  'Box001_Material_#25_0200': '15',
  'Box001_Material_#25_0210': '179',
  'Box001_Material_#25_0211': '205',
  'Box001_Material_#25_0213': '202',
  'Box001_Material_#25_0212': '16',
  'Box001_Material_#25_0214': '30',
  'Box001_Material_#25_0215': '14',
  'Box001_Material_#25_0217': '13',
  'Box001_Material_#25_0216': '28',
  // Add more mappings as needed
};

// --- Vinyl navigation helpers ---
const VINYL_KEYS = Object.keys(vinylMaterialToId);

function getVinylIndex(name) {
  return VINYL_KEYS.indexOf(name);
}

function getVinylByIndex(idx) {
  if (idx < 0) return VINYL_KEYS[VINYL_KEYS.length - 1];
  if (idx >= VINYL_KEYS.length) return VINYL_KEYS[0];
  return VINYL_KEYS[idx];
}

export default function ObjectInfo({ object, onClose }: ObjectInfoProps) {
  const artworkInfo: ArtworkInfoWithFloating = artworkData[object.name];
  const toriInfo = getObjectInfo(object.name);
  const { isForceTorisOpen, setSelectedObject, showInfo, setShowInfo } = useInteractionStore();
  const { currentMap } = useMapStore();
  const [justClosedMap, setJustClosedMap] = useState(false);

  // Separate handling for GCT meshes vs toris
  const isGCTMesh = object.name.includes('Mesh_');
  const isTattoo = object.name.startsWith('unnamed');
  const isTori = !isGCTMesh && !isTattoo && Boolean(toriInfo.variant && toriInfo.showViewer) && toriInfo.variant !== 'musicDisc';
  const isArtPiece = isGCTMesh && Boolean(toriInfo.variant && toriInfo.showViewer);
  const isBTR = object.name === 'Plane__0024';
  const isMusicDisc = toriInfo.variant === 'musicDisc';
  const isGalleryPainting = Boolean(artworkInfo && !isGCTMesh && !isTattoo && !isTori && !isBTR && !isMusicDisc);

  if (!artworkInfo && !isTori && !isArtPiece && !isTattoo && !isBTR && !isMusicDisc) {
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

  const info = isTattoo ? toriInfo : (isTori || isArtPiece || isMusicDisc ? toriInfo : artworkInfo);
  
  // Check if we're on mobile
  const isMobile = isMobileDevice();

  // Adjust height class based on device and content type
  const heightClass = isMobile && isTori ? 'max-h-[75vh] pb-24' : 'max-h-[90vh]';

  // --- Vinyl navigation logic ---
  const isVinyl = isMusicDisc;
  const vinylIdx = isVinyl ? getVinylIndex(object.name) : -1;

  // --- Add: open vinyl viewer from top-right button ---
  function openVinylViewer() {
    const obj = new Object3D();
    obj.name = VINYL_KEYS[0];
    setSelectedObject(obj);
  }

  const handleVinylNav = useCallback((dir: 'prev' | 'next') => {
    if (!isVinyl || vinylIdx === -1) return;
    const nextIdx = dir === 'prev' ? (vinylIdx - 1 + VINYL_KEYS.length) % VINYL_KEYS.length : (vinylIdx + 1) % VINYL_KEYS.length;
    const nextVinyl = getVinylByIndex(nextIdx);
    const obj = new Object3D();
    obj.name = nextVinyl;
    setSelectedObject(obj);
  }, [isVinyl, vinylIdx, setSelectedObject]);

  // Keyboard navigation for vinyls
  useEffect(() => {
    if (!isVinyl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleVinylNav('prev');
      } else if (e.key === 'ArrowRight') {
        handleVinylNav('next');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVinyl, handleVinylNav]);

  // Mobile swipe navigation (optional: tap left/right half)
  const touchStartX = useRef(0);
  useEffect(() => {
    if (!isVinyl) return;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx > 40) handleVinylNav('prev');
      else if (dx < -40) handleVinylNav('next');
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener('touchstart', onTouchStart);
      el.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      if (el) {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, [isVinyl, handleVinylNav]);

  // Add mobile button for vinyl viewer
  const isMusicMap = currentMap === 'music';

  // Handle vinyl viewer button click
  const handleVinylButtonClick = useCallback(() => {
    console.log('🎵 Opening vinyl viewer');
    
    // Exit pointer lock if needed
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Create a synthetic object with the same structure as needed by ObjectInfo
    const synthObject = new Object3D();
    synthObject.name = 'vinyl';
    
    // Set selected object and show info
    setSelectedObject(synthObject);
    setShowInfo(true);
    
    // Signal that an interactable is open
    window.dispatchEvent(new CustomEvent('interactable-opened'));
    
    // Provide haptic feedback if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }, [setSelectedObject, setShowInfo]);

  // Return to central function
  const returnToCentral = useCallback(() => {
    console.log('🎵 Returning to central from music map');
    
    // Close the viewer first
    setSelectedObject(null);
    setShowInfo(false);
    
    // Set loading state in the loading store
    const loadingStore = useLoadingStore?.getState();
    if (loadingStore) {
      // Show loading screen with the proper video
      loadingStore.setLoading(true);
      loadingStore.setCurrentVideo(getVideoUrlForMap('central'));
    }
    
    // Mark that controls should be visible after teleport
    document.body.setAttribute('data-controls-visible', 'true');
    
    // Dispatch map transition event first - important!
    window.dispatchEvent(new CustomEvent('map-transition', { 
      detail: { from: currentMap, to: 'central' } 
    }));
    
    // Trigger the actual map change
    window.dispatchEvent(new CustomEvent('trigger-teleport', { 
      detail: { targetMap: 'central', fromMap: currentMap } 
    }));
    
    // Signal that interactable is closed
    window.dispatchEvent(new CustomEvent('interactable-closed'));
    
    // Provide haptic feedback if available
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
  }, [currentMap, setSelectedObject, setShowInfo]);

  return (
    <>
      {/* Mobile button for vinyl viewer */}
      {isMusicMap && isMobile && (
        <button 
          onClick={handleVinylButtonClick}
          className="fixed top-4 right-4 w-16 h-16 flex items-center justify-center bg-black/40 rounded-full active:opacity-80 hover:opacity-90 touch-manipulation shadow-lg border-2 border-white/50 z-[999999]"
          aria-label="Open Vinyl Viewer"
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
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      )}

      {/* Tap anywhere overlay to close vinyl viewer - only when viewer is open and on mobile */}
      {isMusicMap && showInfo && isMobile && (
        <div 
          className="fixed inset-0 z-[5000] touch-manipulation"
          onClick={(e) => {
            // Stop propagation to prevent closing when tapping navigation buttons
            e.stopPropagation();
            
            console.log('🎵 Closing vinyl viewer from tap overlay');
            setSelectedObject(null);
            setShowInfo(false);
            
            // Signal viewer is closed
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

      <div 
        className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
        data-selected-object={object.name}
        onClick={isMobile ? onClose : undefined}
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
        >
          {/* Floating label at the top of the modal window */}
          {info.floatingLabel && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-bytebounce text-2xl drop-shadow-lg select-none pointer-events-none z-[1100]">
              {info.floatingLabel}
            </div>
          )}
          <div 
            className={`relative flex items-center justify-center ${isMobile && isTori ? 'h-[45vh]' : 'h-[60vh]'}`}
            onClick={(e) => {
              // Only stop propagation if not music disc on mobile, so that tapping anywhere inside the modal (even inside MusicDiscViewer) closes it on mobile.
              if (!(isMusicDisc && isMobile)) e.stopPropagation();
            }}
          >
            {/* Vinyl navigation arrows */}
            {isVinyl && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-[1200] bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center active:scale-95 touch-manipulation"
                  onClick={(e) => { e.stopPropagation(); handleVinylNav('prev'); }}
                  aria-label="Previous Vinyl"
                  style={{outline: 'none'}}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                {isMobile && (
                  <div className="fixed left-0 right-0 flex justify-center items-center z-[99999] pointer-events-auto" style={{ position: 'fixed', bottom: '5%', zIndex: 99999 }}>
                    <div className="flex items-center gap-16">
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={returnToCentral}
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
                    </div>
                  </div>
                )}
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-[1200] bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center active:scale-95 touch-manipulation"
                  onClick={(e) => { e.stopPropagation(); handleVinylNav('next'); }}
                  aria-label="Next Vinyl"
                  style={{outline: 'none'}}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            {isBTR ? (
              <ImageViewer 
                imagePath="/images/map/map.webp"
                title={toriInfo.title}
                description={toriInfo.description}
                variant={toriInfo.variant}
              />
            ) : isTori ? (
              <ToriViewer variant={toriInfo.variant} />
            ) : isArtPiece ? (
              <ModelViewer modelPath={`/models/${toriInfo.variant}.glb`} />
            ) : isTattoo ? (
              <TattooViewer variant={toriInfo.variant} />
            ) : isMusicDisc ? (
              <MusicDiscViewer vinylId={vinylMaterialToId[object.name] || object.name.split('_')[3]} />
            ) : isGalleryPainting ? (
              <ImageViewer 
                imagePath={artworkInfo.previewPath}
                title={artworkInfo.title}
                description={artworkInfo.description}
              />
            ) : null}
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
    </>
  );
}

// Helper for World.tsx: open first vinyl on 'i' in music map
export function openFirstVinyl(setSelectedObject) {
  const obj = new Object3D();
  obj.name = VINYL_KEYS[0];
  setSelectedObject(obj);
} 