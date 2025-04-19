import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAudioStore } from '@/stores/audioStore';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three-stdlib';
import './LoadingScreen.css';
import { preloadViewmodelImages } from '../../utils/viewmodelPreloader';

interface LoadingScreenProps {
  videoSrc: string;
  onLoadComplete: () => void;
  isLoading: boolean;
  preventSkip?: boolean;
}

const loadedModelsCache = new Set<string>();

export function LoadingScreen({ videoSrc, onLoadComplete, isLoading, preventSkip }: LoadingScreenProps) {
  const [canContinue, setCanContinue] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showIntroText, setShowIntroText] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const isIntroVideo = videoSrc === 'intro.mp4';
  const { pause: pauseMusic, play: playMusic } = useAudioStore();
  const loadingManager = new THREE.LoadingManager();
  const loadedItems = useRef(0);
  const totalItems = useRef(0);
  const loadStartTime = useRef<number | null>(null);
  const [showIOSContinue, setShowIOSContinue] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const shouldAutoLoad = isIOS || isWebKit;
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(true);
  const [hasIOSInteracted, setHasIOSInteracted] = useState(false);
  const [isIOSVideoPlaying, setIsIOSVideoPlaying] = useState(false);

  // Set up loading manager
  useEffect(() => {
    if (!isIntroVideo && isLoading) {
      loadedItems.current = 0;
      totalItems.current = 0;
      loadStartTime.current = Date.now();
      setCanContinue(false);

      let isGameInitialized = false;
      let areModelsLoaded = false;

      // Start viewmodel preloading immediately
      preloadViewmodelImages();

      // Function to check if we can show continue
      const checkShowContinue = () => {
        console.log('🎮 Checking if we can show continue:', { isGameInitialized, areModelsLoaded });
        if (isGameInitialized && areModelsLoaded) {
          console.log('🎮 Both game initialized and models loaded, showing continue in 2s');
          setTimeout(() => {
            console.log('🎮 Setting canContinue to true');
            setCanContinue(true);
            // For iOS/WebKit, immediately trigger the game start
            if (shouldAutoLoad) {
              handlePortfolioActivation();
            } else {
              // Trigger forward motion when continue text appears
              const forwardEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
              window.dispatchEvent(forwardEvent);
              setTimeout(() => {
                const forwardUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
                window.dispatchEvent(forwardUpEvent);
              }, 100);
            }
          }, 2000);
        }
      };

      // Listen for game initialization completion
      const handleGameInit = () => {
        console.log('🎮 Game initialization complete event received');
        isGameInitialized = true;
        checkShowContinue();
      };

      // Check if models are already loaded in the cache
      const checkAlreadyLoaded = () => {
        const models = [
          '/models/overworld.glb',
          '/models/central.glb',
          '/models/gallery.glb',
          '/models/toris.glb',
          '/models/music.glb',
          '/models/gct.glb',
          '/models/can.glb'
        ];

        // Check if all models are already loaded in our cache
        const allLoaded = models.every(modelPath => loadedModelsCache.has(modelPath));

        if (allLoaded) {
          console.log('🎮 All models found in cache');
          setProgress(1);
          areModelsLoaded = true;
          checkShowContinue();
          return true;
        }
        console.log('🎮 Not all models found in cache, proceeding with loading');
        return false;
      };

      window.addEventListener('game-fully-initialized', handleGameInit);

      // If models aren't already loaded, set up loading manager
      if (!checkAlreadyLoaded()) {
        loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
          totalItems.current = itemsTotal;
          loadedItems.current = itemsLoaded;
          const newProgress = itemsLoaded / itemsTotal;
          setProgress(newProgress);
          
          if (itemsLoaded === itemsTotal) {
            console.log('🎮 All models loaded through manager');
            areModelsLoaded = true;
            checkShowContinue();
          }
        };

        // Load all models
        const gltfLoader = new GLTFLoader(loadingManager);
        const models = [
          '/models/overworld.glb',
          '/models/central.glb',
          '/models/gallery.glb',
          '/models/toris.glb',
          '/models/music.glb',
          '/models/gct.glb',
          '/models/can.glb'
        ];

        models.forEach(modelPath => {
          gltfLoader.load(modelPath, () => {
            loadedModelsCache.add(modelPath);
          }, undefined, (error: ErrorEvent) => {
            console.error('Error loading model:', modelPath, error);
          });
        });
      }

      return () => {
        window.removeEventListener('game-fully-initialized', handleGameInit);
      };
    }
  }, [isLoading, isIntroVideo]);

  // Preload all map videos when intro video is playing
  useEffect(() => {
    if (isIntroVideo) {
      console.log('🎮 Preloading all map videos during intro');
      const mapVideos = [
        'central.mp4',    // Preload central first as it's likely the first one needed
        'overworld.mp4',
        'gallery.mp4',
        'toris.mp4',
        'music.mp4',
        'gct.mp4'
      ];
      
      // Create video elements for preloading but don't add to DOM
      mapVideos.forEach(video => {
        const preloadVideo = document.createElement('video');
        preloadVideo.src = `/videos/${video}`;
        preloadVideo.preload = 'auto';
        preloadVideo.muted = true;
        preloadVideo.load();
        
        // Store reference to prevent garbage collection
        (window as any).__preloadedVideos = (window as any).__preloadedVideos || [];
        (window as any).__preloadedVideos.push(preloadVideo);
        
        console.log(`🎮 Preloading video: ${video}`);
      });
    }
  }, [isIntroVideo]);

  // Track mouse position for pointer lock clicks
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        // Update position based on movement
        setMousePosition(prev => ({
          x: Math.max(0, Math.min(window.innerWidth, prev.x + e.movementX)),
          y: Math.max(0, Math.min(window.innerHeight, prev.y + e.movementY))
        }));
      } else {
        // Direct position when not pointer locked
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle video audio and music
  useEffect(() => {
    if (videoRef.current) {
      // Always start muted for intro video
      videoRef.current.muted = isIntroVideo;
      videoRef.current.volume = 1.0;
      
      // Pause background music when video is playing
      pauseMusic();
      
      // Set playback quality to auto for better performance
      if ('playsInline' in videoRef.current) {
        (videoRef.current as any).playbackQuality = 'auto';
      }
      
      // Force load the video
      videoRef.current.load();

      const handleVideoEnd = () => {
        if (!isIntroVideo) {
          playMusic();
        }
      };

      videoRef.current.addEventListener('ended', handleVideoEnd);

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('ended', handleVideoEnd);
        }
        if (!isIntroVideo && !isLoading) {
          playMusic();
        }
      };
    }
  }, [pauseMusic, playMusic, isIntroVideo, isLoading]);

  // Add this new useEffect to handle video readiness
  useEffect(() => {
    if (videoRef.current) {
      const handleCanPlay = () => {
        setIsVideoReady(true);
        setShowLoadingGif(false);
      };

      videoRef.current.addEventListener('canplay', handleCanPlay);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('canplay', handleCanPlay);
        }
      };
    }
  }, []);

  // Add this new useEffect to handle video display
  useEffect(() => {
    // Force video to display immediately regardless of loading state
    if (videoRef.current) {
      // Ensure video is visible and playing immediately
      videoRef.current.style.opacity = '1';
      videoRef.current.style.visibility = 'visible';
      
      // For non-intro videos, ensure they play immediately with sound
      if (!isIntroVideo) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        
        // Try multiple play attempts with increasing priority
        const playVideo = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => console.log(`Video ${videoSrc} started playing successfully`))
              .catch(err => {
                console.error(`Error playing video ${videoSrc}:`, err);
                // Retry with high priority flag if available
                if ('priority' in HTMLMediaElement.prototype) {
                  try {
                    // @ts-ignore - This is a non-standard feature for some browsers
                    videoRef.current.priority = 'high';
                    videoRef.current.play().catch(console.error);
                  } catch (e) {
                    console.warn('Browser does not support priority attribute');
                  }
                }
              });
          }
        };
        
        // Immediate play attempt
        playVideo();
        
        // Secondary play attempt after a tiny delay (helps with some browsers)
        setTimeout(playVideo, 10);
        
        // Load metadata quickly by setting playbackRate temporarily high
        videoRef.current.playbackRate = 2.0;
        setTimeout(() => {
          if (videoRef.current) videoRef.current.playbackRate = 1.0;
        }, 100);
      }
    }
    
    // Preload the video for future use
    if (videoSrc && videoSrc !== 'intro.mp4') {
      const preloadVideo = document.createElement('video');
      preloadVideo.src = `/videos/${videoSrc}`;
      preloadVideo.preload = 'auto';
      preloadVideo.muted = true;
      preloadVideo.load();
      
      // Store reference to prevent garbage collection
      (window as any).__preloadedCurrentVideo = preloadVideo;
    }
  }, [videoSrc, isIntroVideo]);

  // Show intro text after 3 seconds of video playing
  useEffect(() => {
    if (isIntroVideo && videoRef.current) {
      const timer = setTimeout(() => {
        setShowIntroText(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isIntroVideo]);

  // Show loading bar after unmute
  useEffect(() => {
    if (isIntroVideo && !isMuted) {
      setShowLoadingBar(true);
      // Start loading the central map
      const gltfLoader = new GLTFLoader();
      gltfLoader.load('/models/central.glb', 
        // onLoad
        () => {
          setProgress(1);
          setShowLoadingBar(false);
        },
        // onProgress
        (xhr) => {
          if (xhr.lengthComputable) {
            setProgress(xhr.loaded / xhr.total);
          }
        },
        // onError
        (error) => {
          console.error('Error loading central map:', error);
          setShowLoadingBar(false);
        }
      );
    }
  }, [isIntroVideo, isMuted]);

  // Handle intro text click and pointer lock click
  const handleIntroClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't prevent default on iOS to allow native behavior
    if (!isIOS) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isIntroVideo && !preventSkip) {
      console.log('🎮 Touch/click detected on intro screen');
      
      // Simply unmute the video if it's muted
      if (videoRef.current && isMuted) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        setIsMuted(false);
      }
      
      // Start loading the central map
      setShowLoadingBar(true);
      const gltfLoader = new GLTFLoader();
      gltfLoader.load('/models/central.glb', 
        // onLoad
        () => {
          setProgress(1);
          setShowLoadingBar(false);
          handlePortfolioActivation();
        },
        // onProgress
        (xhr) => {
          if (xhr.lengthComputable) {
            setProgress(xhr.loaded / xhr.total);
          }
        },
        // onError
        (error) => {
          console.error('Error loading central map:', error);
          setShowLoadingBar(false);
          handlePortfolioActivation();
        }
      );
    }
  };

  // Handle any click when pointer is locked
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (!isIntroVideo || preventSkip || isMuted) return;
      handlePortfolioActivation();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: false });
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isIntroVideo, preventSkip, isMuted]);

  // Centralized function to handle portfolio activation
  const handlePortfolioActivation = () => {
    // Request pointer lock immediately for better UX
    if (!document.pointerLockElement) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    }

    // Delay the game transition by 1 second
    setTimeout(() => {
      onLoadComplete();
      
      // Add a small forward movement after portfolio activation
      setTimeout(() => {
        // Simulate pressing W key for a brief moment
        const forwardEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
        window.dispatchEvent(forwardEvent);
        
        // Release the key after 100ms for a small motion
        setTimeout(() => {
          const forwardUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
          window.dispatchEvent(forwardUpEvent);
        }, 100);
      }, 100); // Small delay to ensure pointer lock is active
    }, 1000); // 1 second delay before transitioning to game
  };

  // Handle video transitions
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (document.pointerLockElement && isIntroVideo && !preventSkip) {
        setShowIntroText(false);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isIntroVideo, preventSkip]);

  // Handle clicks ONLY for non-intro videos
  useEffect(() => {
    if (isIntroVideo || preventSkip) return;

    const handleClick = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (canContinue) {
        playMusic();
        onLoadComplete();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleClick);
    window.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleClick);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [canContinue, onLoadComplete, isIntroVideo, playMusic, preventSkip]);

  // Preload first song and BTR map assets after unmuting
  useEffect(() => {
    if (!isMuted && isIntroVideo) {
      console.log('🎵 Preloading first song assets and BTR map');
      
      // Preload first song (CORAZON VENEZOLANO)
      const preloadFirstSong = () => {
        // Preload audio
        const audio = new Audio('/audio/music/CORAZON VENEZOLANO.ogg');
        audio.preload = 'auto';
        audio.load();
        
        // Preload thumbnail
        const img = new Image();
        img.src = '/audio/music/coverart/CORAZON VENEZOLANO.webp';
        
        // Store references to prevent garbage collection
        (window as any).__preloadedSongAssets = {
          audio,
          img
        };
      };
      
      // Preload BTR map assets
      const preloadBTRMap = () => {
        // Preload map image
        const mapImg = new Image();
        mapImg.src = '/images/map.webp';
        
        // Preload QR code with high priority
        const qrImg = new Image();
        qrImg.src = '/images/qr2.webp';
        qrImg.fetchPriority = 'high';
        
        // Store references to prevent garbage collection
        (window as any).__preloadedBTRMap = {
          mapImg,
          qrImg
        };
      };
      
      // Execute preloading
      preloadFirstSong();
      preloadBTRMap();
      
      console.log('🎵 Preloading complete for first song and BTR map');
    }
  }, [isMuted, isIntroVideo]);

  // Simplified iOS/WebKit video initialization
  useEffect(() => {
    if (shouldAutoLoad) {
      // Start loading immediately for iOS/WebKit
      if (isIntroVideo) {
        setShowLoadingBar(true);
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('/models/central.glb', 
          () => {
            setProgress(1);
            setShowLoadingBar(false);
            handlePortfolioActivation();
          },
          (xhr) => {
            if (xhr.lengthComputable) {
              setProgress(xhr.loaded / xhr.total);
            }
          },
          (error) => {
            console.error('Error loading central map:', error);
            setShowLoadingBar(false);
            handlePortfolioActivation();
          }
        );
      }

      // Set up video if we have a ref
      if (videoRef.current) {
        const video = videoRef.current;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        
        // Try to play the video but don't wait for it
        video.play().catch(console.error);
      }
    }
  }, [shouldAutoLoad, isIntroVideo]);

  // Remove video ready state dependency
  useEffect(() => {
    if (shouldAutoLoad) {
      // Start loading immediately on mount
      setShowLoadingBar(true);
      const gltfLoader = new GLTFLoader();
      gltfLoader.load('/models/central.glb', 
        () => {
          setProgress(1);
          setShowLoadingBar(false);
          handlePortfolioActivation();
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            setProgress(xhr.loaded / xhr.total);
          }
        },
        (error) => {
          console.error('Error loading central map:', error);
          setShowLoadingBar(false);
          handlePortfolioActivation();
        }
      );
    }
  }, [shouldAutoLoad]);

  // Remove iOS/WebKit touch handler since we don't need it anymore
  const handleIOSTouch = useCallback(async (e: React.TouchEvent) => {
    if (!shouldAutoLoad) {
      e.preventDefault();
      e.stopPropagation();
      handleIntroClick(e);
    }
  }, [shouldAutoLoad]);

  // Add specific touch event listener for portfolio text
  useEffect(() => {
    const portfolioText = document.querySelector('.pixel-font');
    if (!portfolioText) return;

    const handlePortfolioTouch = (e: TouchEvent) => {
      if (isIOS && isIntroVideo && showIntroText && !preventSkip) {
        console.log('🎮 iOS: Touch detected on portfolio text');
        handlePortfolioActivation();
      }
    };

    portfolioText.addEventListener('touchstart', handlePortfolioTouch, { passive: true });
    portfolioText.addEventListener('touchend', handlePortfolioTouch, { passive: true });

    return () => {
      portfolioText.removeEventListener('touchstart', handlePortfolioTouch);
      portfolioText.removeEventListener('touchend', handlePortfolioTouch);
    };
  }, [isIOS, isIntroVideo, showIntroText, preventSkip]);

  return (
    <div 
      className="loading-screen" 
      style={{ 
        pointerEvents: shouldAutoLoad ? 'none' : 'auto', 
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {showLoadingGif && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <img 
            src={isIntroVideo ? "/images/introgif.gif" : "/images/vv.gif"} 
            alt="Loading..." 
            className={isIntroVideo ? "max-w-[200px] h-auto" : "w-full h-full object-contain"}
            style={{
              imageRendering: 'pixelated',
              pointerEvents: 'none',
              ...(isIntroVideo ? {} : { 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                minWidth: '100%',
                minHeight: '100%',
                width: 'auto',
                height: 'auto',
                maxWidth: 'none',
                maxHeight: 'none'
              })
            }}
          />
        </div>
      )}
      
      <video
        ref={videoRef}
        src={`/videos/${videoSrc}`}
        autoPlay
        playsInline
        muted
        loop={isIntroVideo}
        preload="auto"
        style={{ 
          pointerEvents: 'none',
          opacity: 1,
          visibility: 'visible',
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
      />

      {isIntroVideo && !preventSkip && !shouldAutoLoad && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            pointerEvents: 'auto', 
            touchAction: 'manipulation',
            zIndex: 20 
          }}
          onClick={handleIntroClick}
          onTouchStart={handleIOSTouch}
        >
          {showIntroText && (
            <motion.div 
              className="pixel-font text-center flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ 
                color: 'white',
                textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                padding: '20px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                width: '400px',
                height: '150px',
                whiteSpace: 'nowrap',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                zIndex: 1000,
                WebkitTapHighlightColor: 'transparent'
              }}
              onClick={handleIntroClick}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleIntroClick(e);
              }}
            >
              <div className="text-4xl">PORTFOLIO</div>
              <div className="text-2xl mt-1">
                <img 
                  src="/images/cursor.webp" 
                  alt="Click to continue" 
                  className="w-16 h-16 mx-auto"
                  style={{ 
                    imageRendering: 'pixelated',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!isIntroVideo && (
        <div className="loading-overlay" style={{ pointerEvents: 'auto', touchAction: 'none' }}>
          <div style={{
            width: '300px',
            height: '12px',
            border: '2px solid white',
            padding: '1px',
            imageRendering: 'pixelated',
            boxShadow: '0 0 0 2px black',
            position: 'relative',
            backgroundColor: 'black'
          }}>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'white',
                imageRendering: 'pixelated',
                boxShadow: '0 0 0 1px black',
                position: 'relative',
                zIndex: 1
              }}
            />
          </div>
          
          {canContinue && (
            <div className="pixel-font text-center" style={{ 
              color: 'white',
              marginTop: '20px',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}>
              <div className="text-3xl">CLICK TO CONTINUE</div>
              <div className="text-base mt-2">CACHAMA.COM / DM@HOMBRECHIVO.COM</div>
            </div>
          )}
        </div>
      )}

      {isIntroVideo && !isMuted && showLoadingBar && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            pointerEvents: 'none', 
            touchAction: 'none',
            zIndex: 10
          }}
        >
          <div 
            style={{
              width: '300px',
              height: '12px',
              border: '2px solid white',
              padding: '1px',
              imageRendering: 'pixelated',
              boxShadow: '0 0 0 2px black',
              position: 'relative',
              backgroundColor: 'black',
              opacity: 0.8
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'white',
                imageRendering: 'pixelated',
                boxShadow: '0 0 0 1px black',
                position: 'relative',
                zIndex: 1
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}