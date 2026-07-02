import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAudioStore, unlockiOSAudio } from '@/stores/audioStore';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three-stdlib';
import './LoadingScreen.css';
import { preloadViewmodelImages } from '../../utils/viewmodelPreloader';
import { INTRO_VIDEO_URL } from '../../utils/videoUtils';

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
  const [allowClick, setAllowClick] = useState(false);
  const [showClickBlocker, setShowClickBlocker] = useState(true);
  const [portfolioTextVisible, setPortfolioTextVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isIntroVideo = videoSrc === INTRO_VIDEO_URL;
  const { pause: pauseMusic, play: playMusic } = useAudioStore();
  const loadingManager = new THREE.LoadingManager();
  const loadedItems = useRef(0);
  const totalItems = useRef(0);
  const loadStartTime = useRef<number | null>(null);
  const [showIOSContinue, setShowIOSContinue] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const shouldAutoLoad = false;
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(true);
  const [hasIOSInteracted, setHasIOSInteracted] = useState(false);
  const [isIOSVideoPlaying, setIsIOSVideoPlaying] = useState(false);
  const [gifFadingOut, setGifFadingOut] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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
        // Video is ready, start the gif fade out process
        console.log('🎮 Video is ready to play, starting transition');
        setIsVideoReady(true);
        setAllowClick(false);
        setGifFadingOut(true);
        
        // Wait for the fade out animation to complete before hiding the gif
        setTimeout(() => {
          setShowLoadingGif(false);
        }, 1000); // 1 second fade out
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
    // Wait for the video to be loaded before showing it
    if (videoRef.current) {
      // Initially hide the video until ready
      videoRef.current.style.opacity = '0';
      
      const playVideoWhenReady = async () => {
        // Ensure video is visible and playing immediately
        if (videoRef.current) {
          try {
            // For non-intro videos, ensure they play immediately with sound
            if (!isIntroVideo) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
            }
            
            // Wait until the loading gif has fully faded out
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  await videoRef.current.play();
                  console.log(`Video ${videoSrc} started playing successfully`);
                } catch (err) {
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
                }
              }
            }, 800); // Start playing video slightly before gif fully disappears (1000ms fade time)
          } catch (error) {
            console.error('Error preparing video:', error);
          }
        }
      };
      
      // Start the video preparation process
      playVideoWhenReady();
      
      // Load metadata quickly by setting playbackRate temporarily high
      videoRef.current.playbackRate = 2.0;
      setTimeout(() => {
        if (videoRef.current) videoRef.current.playbackRate = 1.0;
      }, 100);
    }
    
  }, [videoSrc, isIntroVideo]);

  // Show intro text after 3 seconds of video playing
  useEffect(() => {
    if (isIntroVideo && videoRef.current) {
      const handleVideoPlaying = () => {
        console.log('🎮 Intro video started playing');
        setIsVideoPlaying(true);
        setTimeout(() => {
          setShowIntroText(true);
          // Mark portfolio text as visible for click blocker logic
          setPortfolioTextVisible(true);
          // Remove click blocker after a short delay when portfolio text is visible
          setTimeout(() => {
            setShowClickBlocker(false);
          }, 500);
        }, 2000);
      };
      
      // Listen for both playing and canplaythrough events to ensure the video is ready
      videoRef.current.addEventListener('playing', handleVideoPlaying, { once: true });
      
      // Also check if video is already playing
      if (!videoRef.current.paused && videoRef.current.currentTime > 0) {
        handleVideoPlaying();
      }
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('playing', handleVideoPlaying);
        }
      };
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

  // Add useEffect to enable clicks after 3 seconds when gif disappears
  useEffect(() => {
    if (isVideoReady && !allowClick) {
      console.log('🎮 Setting click delay timer after gif disappears');
      const timer = setTimeout(() => {
        console.log('🎮 Clicks now allowed');
        setAllowClick(true);
      }, 2200);
      
      return () => clearTimeout(timer);
    }
  }, [isVideoReady, allowClick]);

  // Handle intro text click and pointer lock click
  const handleIntroClick = (e: React.MouseEvent | React.TouchEvent) => {
    // iOS: unlock audio synchronously during this user gesture
    unlockiOSAudio();

    // Don't prevent default on iOS to allow native behavior
    if (!isIOS) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Only process click if allowed or if we're skipping intro
    if ((allowClick || !isVideoReady) && isIntroVideo && !preventSkip) {
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
    } else if (isVideoReady && !allowClick) {
      console.log('🎮 Click blocked - waiting for delay timer');
    }
  };

  // Handle any click when pointer is locked
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (!isIntroVideo || preventSkip || isMuted || !allowClick) return;
      handlePortfolioActivation();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: false });
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isIntroVideo, preventSkip, isMuted, allowClick]);

  // Centralized function to handle portfolio activation
  const handlePortfolioActivation = () => {
    // iOS: unlock audio synchronously during this user gesture
    unlockiOSAudio();

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
      console.log('🎮 iOS/WebKit detected - bypassing loading sequence');
      handlePortfolioActivation();
    }
  }, [shouldAutoLoad]);

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

  // Initialize video for iOS/WebKit
  useEffect(() => {
    if (videoRef.current && shouldAutoLoad) {
      const video = videoRef.current;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('x5-playsinline', '');
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-player-fullscreen', 'false');
      video.setAttribute('x5-video-orientation', 'portraint');
      
      // Try to play immediately
      const playVideo = async () => {
        try {
          await video.play();
          console.log('🎮 iOS/WebKit: Video playing successfully');
          setIsIOSVideoPlaying(true);
        } catch (err) {
          console.error('🎮 iOS/WebKit: Video play error:', err);
          // If video fails to play, just continue without it
          handlePortfolioActivation();
        }
      };

      playVideo();
    }
  }, [shouldAutoLoad, videoSrc]);

  // Handle video transitions for iOS/WebKit
  useEffect(() => {
    if (shouldAutoLoad && videoRef.current) {
      const video = videoRef.current;
      
      // Reset video state
      video.currentTime = 0;
      video.muted = true;
      video.playsInline = true;
      
      // Try to play the video
      const playVideo = async () => {
        try {
          await video.play();
          console.log('🎮 iOS/WebKit: Transition video playing successfully');
        } catch (err) {
          console.error('🎮 iOS/WebKit: Transition video play error:', err);
          // If video fails to play, just continue without it
          handlePortfolioActivation();
        }
      };

      playVideo();
    }
  }, [videoSrc, shouldAutoLoad]);

  // Bypass loading sequence for iOS/WebKit
  useEffect(() => {
    if (shouldAutoLoad) {
      console.log('🎮 iOS/WebKit detected - bypassing loading sequence');
      handlePortfolioActivation();
    }
  }, [shouldAutoLoad]);

  // Add this useEffect to improve video playback and loading gif transition
  useEffect(() => {
    if (videoRef.current && isIntroVideo) {
      const video = videoRef.current;
      
      // Ensure video has proper attributes for better playback
      video.playsInline = true;
      video.muted = true;
      
      const playVideo = async () => {
        try {
          // Start playing the video as soon as possible
          await video.play();
          console.log('🎮 Intro video play started successfully');
          
          // Make video visible
          video.style.opacity = '1';
          
          // Start fading out the loading gif once video is playing
          setGifFadingOut(true);
          
          // Hide loading gif after fade out
          setTimeout(() => {
            setShowLoadingGif(false);
          }, 1000);
          
          // Mark video as ready
          setIsVideoReady(true);
        } catch (error) {
          console.error('Failed to play intro video:', error);
          // Fallback: Make portfolio text appear even if video playback fails
          setTimeout(() => {
            setShowIntroText(true);
            setPortfolioTextVisible(true);
            setShowClickBlocker(false);
          }, 3000);
        }
      };
      
      // Try to play video
      playVideo();
    }
  }, [isIntroVideo]);

  return (
    <div 
      className="loading-screen" 
      style={{ 
        pointerEvents: shouldAutoLoad ? 'none' : 'auto', 
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        display: shouldAutoLoad ? 'none' : 'flex'
      }}
    >
      {/* Click blocker overlay */}
      {!shouldAutoLoad && showClickBlocker && (
        <div 
          className="absolute inset-0 z-[9999] bg-transparent cursor-none"
          style={{
            pointerEvents: 'all'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎮 Clicks blocked during initial loading sequence');
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎮 Touch blocked during initial loading sequence');
          }}
        />
      )}
      
      {!shouldAutoLoad && showLoadingGif && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <img 
              src={isIntroVideo ? "/images/introgif.gif" : "/images/vv.gif"} 
              alt="Loading..." 
              className={isIntroVideo ? "max-w-[200px] h-auto" : "w-full h-full object-contain"}
              style={{
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                animation: isIntroVideo 
                  ? gifFadingOut 
                    ? 'fadeOut 1s forwards' 
                    : 'fadeIn 2s forwards'
                  : 'none',
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
            {isIntroVideo && (
              <div 
                className="pixel-font mt-4"
                style={{
                  color: 'white',
                  textShadow: '2px 2px 0 #000',
                  animation: 'pulse 2s infinite ease-in-out',
                  userSelect: 'none'
                }}
              >
                LOADING
              </div>
            )}
          </div>
        </div>
      )}
      
      {!shouldAutoLoad && (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          playsInline
          muted
          loop={isIntroVideo}
          preload="metadata"
          style={{ 
            pointerEvents: 'none',
            opacity: isVideoReady ? 1 : 0,
            visibility: 'visible',
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            touchAction: 'none',
            transition: 'opacity 1s ease-in-out'
          }}
        />
      )}

      {/* For iOS/WebKit, show a simple loading indicator during transitions */}
      {shouldAutoLoad && isLoading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-2xl mb-4">Loading...</div>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {!shouldAutoLoad && isIntroVideo && !preventSkip && (
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
                WebkitTapHighlightColor: 'transparent',
                display: showIntroText ? 'flex' : 'none'
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