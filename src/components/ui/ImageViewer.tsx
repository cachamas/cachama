import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../../lib/mapStore';
import { useLoadingStore } from '../../stores/loadingStore';

interface ImageViewerProps {
  imagePath: string;
  title: string;
  description: string;
  variant?: string;
}

// SVG path coordinates data to generate accurate mobile tap areas
const SVG_AREAS = {
  gct: { centerX: '37%', centerY: '65%', width: '33%', height: '33%' },
  overworld: { centerX: '77%', centerY: '66%', width: '30%', height: '27%' },
  gallery: { centerX: '70%', centerY: '30%', width: '30%', height: '25%' },
  music: { centerX: '44%', centerY: '28%', width: '15%', height: '15%' },
  toris: { centerX: '25%', centerY: '43%', width: '23%', height: '27%' }
};

export default function ImageViewer({ imagePath, title, description, variant }: ImageViewerProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { currentMap } = useMapStore();
  const [hoveredMapArea, setHoveredMapArea] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(imagePath);
  
  // Check if this is a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Debug - log device detection
  useEffect(() => {
    console.log('Device detection:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Is Mobile?', isMobile);
    console.log('- Touch points:', navigator.maxTouchPoints);
    console.log('- Ontouchstart?', 'ontouchstart' in window);
  }, [isMobile]);

  // Handle container dimensions
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
  
  // Preload all images and run simple animation when map is opened
  useEffect(() => {
    if (variant === 'map') {
      // Preload all images first
      const images: Record<string, string> = {};
      const preloadImages = async () => {
        // Preload default image
        images['default'] = imagePath;
        
        // Preload all area images
        for (const area of Object.keys(SVG_AREAS)) {
          const src = `/images/map/highlighted${area}.webp`;
          images[area] = src;
          
          // Create image object to load it
          const img = new Image();
          img.src = src;
        }
        
        // Run the animation after preloading
        const areas = ['gallery', 'music', 'toris', 'gct', 'overworld'];
        let index = 0;
        
        // Start with default image
        setCurrentImage(imagePath);
        
        // Function to animate through areas
        const animateNext = () => {
          if (index < areas.length) {
            const area = areas[index];
            setCurrentImage(`/images/map/highlighted${area}.webp`);
            index++;
            setTimeout(animateNext, 300); // 0.3 seconds per highlight
          } else {
            // Return to default at the end
            setCurrentImage(imagePath);
          }
        };
        
        // Start animation after a small delay
        setTimeout(animateNext, 500);
      };
      
      preloadImages();
    }
  }, [variant, imagePath]);

  // Trigger full teleport experience when a map area is clicked
  const handleMapAreaTeleport = (targetMap: string) => {
    console.log(`🌐 Initiating teleport to ${targetMap} from map interface`);
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Set loading state in the loading store
    const loadingStore = useLoadingStore?.getState();
    if (loadingStore) {
      // Show loading screen
      loadingStore.setLoading(true);
      
      // Get the appropriate video for this map
      const correctVideo = loadingStore.getVideoForMap(targetMap);
      loadingStore.setCurrentVideo(correctVideo);
    }
    
    // Close the map UI
    document.body.setAttribute('data-map-open', 'false');
    
    // Special handling for Toris map - controls should be hidden
    if (targetMap === 'toris') {
      console.log('🔴 Toris destination detected - controls will be hidden');
      document.body.setAttribute('data-controls-visible', 'false');
      document.body.setAttribute('data-toris-auto-open', 'true');
    } 
    // For all other maps, ensure mobile controls stay visible
    else if (isMobile) {
      // Set controls to be visible before teleport
      document.body.setAttribute('data-controls-visible', 'true');
      
      // Add a special flag to prevent controls from being hidden during transition
      document.body.setAttribute('data-keep-controls', 'true');
    }
    
    // Dispatch the full teleport event to trigger the actual map change with loading screen
    window.dispatchEvent(new CustomEvent('trigger-teleport', { 
      detail: { targetMap, fromMap: currentMap } 
    }));
    
    // Only initialize controls for non-Toris destinations
    if (isMobile && targetMap !== 'toris') {
      // Immediate reset
      window.dispatchEvent(new CustomEvent('reset-controls'));
      
      // Schedule multiple control resets to ensure they stay visible
      const resetTimings = [500, 1000, 2000, 3000, 4000, 5000];
      
      resetTimings.forEach(timing => {
        setTimeout(() => {
          console.log(`🎮 Resetting mobile controls after ${timing}ms`);
          document.body.setAttribute('data-controls-visible', 'true');
          window.dispatchEvent(new CustomEvent('reset-controls'));
          
          // Fire map-interaction-complete event to ensure UI is properly restored
          window.dispatchEvent(new CustomEvent('map-interaction-complete'));
          
          // Fire the interactable-closed event to restore UI state
          window.dispatchEvent(new CustomEvent('interactable-closed'));
        }, timing);
      });
      
      // Final cleanup to remove the special flag
      setTimeout(() => {
        document.body.removeAttribute('data-keep-controls');
      }, 6000);
    }
  };
  
  // Handle hovering over map areas
  const handleMapAreaInteraction = (areaId: string) => {
    setHoveredMapArea(areaId);
    setCurrentImage(`/images/map/highlighted${areaId}.webp`);
  };
  
  // Clear hover state
  const clearHoveredArea = () => {
    setHoveredMapArea(null);
    setCurrentImage(imagePath);
  };
  
  // Handle clicking on map areas
  const handleMapAreaClick = (areaId: string) => {
    setHoveredMapArea(areaId);
    setCurrentImage(`/images/map/highlighted${areaId}.webp`);
    
    // Delay the teleport by 500ms to show the highlight first
    setTimeout(() => {
      // Trigger teleport to the selected area after showing highlight
      handleMapAreaTeleport(areaId);
    }, 500);
  };

  // For BTR map with interactive areas
  if (variant === 'map') {
    // MOBILE VIEW
    if (isMobile) {
      return (
        <div 
          ref={containerRef} 
          className="w-full h-full flex flex-col" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <img
              ref={imageRef}
              src={currentImage}
              alt={title}
              className="object-contain"
              style={{
                maxHeight: `${dimensions.height}px`,
                maxWidth: `${dimensions.width}px`,
                width: 'auto',
                height: 'auto',
                position: 'relative',
                zIndex: 1,
                transition: 'opacity 0.3s ease-in-out'
              }}
              onError={(e) => {
                console.error("Map image failed to load, falling back to main map");
                (e.target as HTMLImageElement).src = imagePath;
                setCurrentImage(imagePath);
              }}
            />
            
            {/* Mobile clickable areas - positioned based on SVG data */}
            <div className="absolute inset-0 pointer-events-auto">
              {/* Generate tap areas for each map location based on SVG data */}
              {Object.entries(SVG_AREAS).map(([id, area]) => (
                <div 
                  key={id}
                  className="absolute"
                  style={{
                    left: `calc(${area.centerX} - ${area.width} / 2)`,
                    top: `calc(${area.centerY} - ${area.height} / 2)`,
                    width: area.width,
                    height: area.height,
                    borderRadius: '50%',
                    background: hoveredMapArea === id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    zIndex: 2,
                    border: 'none'
                  }}
                  onClick={() => handleMapAreaClick(id)}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // DESKTOP VIEW 
    const desktopSizeMultiplier = 1.25;
    return (
      <div 
        ref={containerRef} 
        className="w-full h-full flex flex-col" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="flex-1 flex items-center justify-center p-4 relative" style={{ transform: 'translateY(-9%)' }}>
          <img
            ref={imageRef}
            src={currentImage}
            alt={title}
            className="object-contain"
            style={{
              maxHeight: `${dimensions.height * desktopSizeMultiplier}px`,
              maxWidth: `${dimensions.width * desktopSizeMultiplier}px`,
              width: 'auto',
              height: 'auto',
              position: 'relative',
              zIndex: 1,
              transition: 'opacity 0.3s ease-in-out'
            }}
            onError={(e) => {
              console.error("Map image failed to load, falling back to main map");
              (e.target as HTMLImageElement).src = imagePath;
              setCurrentImage(imagePath);
            }}
          />
          
          {/* Direct hover areas */}
          <div 
            className="absolute inset-0 pointer-events-auto" 
            style={{ zIndex: 3 }}
          >
            {Object.entries(SVG_AREAS).map(([id, area]) => (
              <div 
                key={id}
                className="absolute"
                style={{
                  left: `calc(${area.centerX} - ${area.width} / 2)`,
                  top: `calc(${area.centerY} - ${area.height} / 2)`,
                  width: area.width,
                  height: area.height,
                  borderRadius: '50%',
                  background: 'transparent',
                  cursor: 'pointer',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  handleMapAreaInteraction(id);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  clearHoveredArea();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMapAreaClick(id);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default image viewer for non-map images
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          ref={imageRef}
          src={imagePath}
          alt={title}
          className="object-contain"
          style={{
            maxHeight: `${dimensions.height * 0.9}px`,
            maxWidth: `${dimensions.width * 0.9}px`,
            width: 'auto',
            height: 'auto'
          }}
        />
      </div>
    </div>
  );
} 