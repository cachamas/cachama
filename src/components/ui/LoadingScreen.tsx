import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAudioStore } from '@/stores/audioStore';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three-stdlib';
import './LoadingScreen.css';

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
  const [showUnmuteButton, setShowUnmuteButton] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const isIntroVideo = videoSrc === 'intro.mp4';
  const { pause: pauseMusic, play: playMusic } = useAudioStore();
  const loadingManager = new THREE.LoadingManager();
  const loadedItems = useRef(0);
  const totalItems = useRef(0);
  const loadStartTime = useRef<number | null>(null);

  // Set up loading manager
  useEffect(() => {
    if (!isIntroVideo && isLoading) {
      loadedItems.current = 0;
      totalItems.current = 0;
      loadStartTime.current = Date.now();
      setCanContinue(false);

      let isGameInitialized = false;
      let areModelsLoaded = false;

      // Function to check if we can show continue
      const checkShowContinue = () => {
        console.log('🎮 Checking if we can show continue:', { isGameInitialized, areModelsLoaded });
        if (isGameInitialized && areModelsLoaded) {
          console.log('🎮 Both game initialized and models loaded, showing continue in 2s');
          setTimeout(() => {
            console.log('🎮 Setting canContinue to true');
            setCanContinue(true);
            // Trigger forward motion when continue text appears
            const forwardEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
            window.dispatchEvent(forwardEvent);
            setTimeout(() => {
              const forwardUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
              window.dispatchEvent(forwardUpEvent);
            }, 100);
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
      // Only mute for intro video
      videoRef.current.muted = isIntroVideo;
      videoRef.current.volume = 1.0;
      pauseMusic();

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

  // Show intro text after unmute
  useEffect(() => {
    if (isIntroVideo && !isMuted) {
      setShowIntroText(false);
    }
  }, [isIntroVideo, isMuted]);

  // Show unmute button after 1 second
  useEffect(() => {
    if (isIntroVideo && isMuted) {
      const timer = setTimeout(() => {
        setShowUnmuteButton(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isIntroVideo, isMuted]);

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
          setShowIntroText(true);
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
          setShowIntroText(true);
        }
      );
    }
  }, [isIntroVideo, isMuted]);

  // Handle intro text click and pointer lock click
  const handleIntroClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIntroVideo && showIntroText && !preventSkip) {
      handlePortfolioActivation();
    }
  };

  // Handle any click when pointer is locked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isIntroVideo || !showIntroText || preventSkip || isMuted) return;
      handlePortfolioActivation();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isIntroVideo, showIntroText, preventSkip, isMuted]);

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

    const handleClick = () => {
      if (canContinue) {
        playMusic();
        onLoadComplete();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('mousedown', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [canContinue, onLoadComplete, isIntroVideo, playMusic, preventSkip]);

  const handleUnmute = () => {
    if (videoRef.current && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  return (
    <div className="loading-screen" style={{ pointerEvents: 'auto' }}>
      <video
        ref={videoRef}
        src={`/videos/${videoSrc}`}
        autoPlay
        playsInline
        muted={isIntroVideo}
        loop
        preload="auto"
        style={{ pointerEvents: 'none' }}
        onClick={(e) => e.preventDefault()}
        onError={(e) => console.error('Video loading error:', e)}
        onLoadedData={(e) => {
          const video = e.target as HTMLVideoElement;
          if (!isIntroVideo) {
            video.muted = false;
            video.volume = 1.0;
            video.play().catch(console.error);
          }
        }}
      />
      
      {isIntroVideo && isMuted && showUnmuteButton && (
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleUnmute}
          style={{ 
            userSelect: 'none',
            pointerEvents: 'auto',
            zIndex: 50
          }}
        >
          <motion.div 
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{ 
              top: '70%',
              opacity: 0
            }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <img 
              src="/images/sound.webp" 
              alt="Unmute"
              className="w-16 h-16"
              style={{
                imageRendering: 'pixelated',
                pointerEvents: 'none'
              }}
            />
          </motion.div>
        </div>
      )}

      {!isIntroVideo && (
        <div className="loading-overlay" style={{ pointerEvents: 'auto' }}>
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
              textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
              marginTop: '20px',
              userSelect: 'none'
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
          style={{ pointerEvents: 'none' }}
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
              backgroundColor: 'black'
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

      {isIntroVideo && showIntroText && !preventSkip && !isMuted && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={handleIntroClick}
        >
          <div 
            className="pixel-font text-center flex flex-col items-center justify-center pointer-events-none"
            style={{ 
              color: 'white',
              textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
              padding: '20px',
              userSelect: 'none',
              width: '400px',
              height: '150px',
              whiteSpace: 'nowrap',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="text-4xl mb-4">THIS IS A PORTFOLIO</div>
            <div className="text-2xl">CLICK TO ACCESS</div>
          </div>
        </div>
      )}
    </div>
  );
}