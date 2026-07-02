'use client';

import { useEffect, useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { motion, AnimatePresence } from 'framer-motion';

export function NowPlaying() {
  const { currentTrack, isPlaying } = useAudioStore();
  const [isVisible, setIsVisible] = useState(false);

  // Handle visibility with fade timer
  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout;

    const showDisplay = () => {
      setIsVisible(true);
      if (fadeTimeout) clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => setIsVisible(false), 6000);
    };

    if (currentTrack && isPlaying) {
      showDisplay();
    }

    const handleMapChange = () => showDisplay();
    window.addEventListener('map-change', handleMapChange);

    const handleGameStart = () => showDisplay();
    window.addEventListener('game-started', handleGameStart);

    return () => {
      if (fadeTimeout) clearTimeout(fadeTimeout);
      window.removeEventListener('map-change', handleMapChange);
      window.removeEventListener('game-started', handleGameStart);
    };
  }, [currentTrack, isPlaying]);

  // Debug state changes
  useEffect(() => {
    console.log('🎵 NowPlaying Component State:', {
      hasTrack: !!currentTrack,
      trackTitle: currentTrack?.title,
      isPlaying,
      isVisible
    });
  }, [currentTrack, isPlaying, isVisible]);

  if (!currentTrack || !isPlaying) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '8px',
            zIndex: 100000,
            fontFamily: 'ByteBounce',
            pointerEvents: 'none',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: 'fit-content'
          }}
        >
          {/* Album Art */}
          <img 
            src={currentTrack?.coverArt || '/audio/music/coverart/CLUELESSV2.webp'} 
            alt="Album Art"
            style={{
              width: '54px',
              height: '54px',
              objectFit: 'cover'
            }}
          />
          
          {/* Text Content */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '2px', letterSpacing: '0.5px' }}>NOW PLAYING</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '2px' }}>{currentTrack.title}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>artist: bzk</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 