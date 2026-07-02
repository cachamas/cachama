'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAudioStore } from '@/stores/audioStore';
import { cn } from '@/lib/utils';
import { Slider } from '../ui/slider';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  X
} from 'lucide-react';

interface MusicPlayerProps {
  onClose?: () => void;
}

export function MusicPlayer({ onClose }: MusicPlayerProps) {
  const { 
    currentTrack, 
    isPlaying, 
    volume,
    setVolume,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    duration,
    currentTime
  } = useAudioStore();

  const [localVolume, setLocalVolume] = useState(volume);
  const playerRef = useRef<HTMLDivElement>(null);

  const handleVolumeChange = (value: number) => {
    setLocalVolume(value);
    setVolume(value);
  };

  const handleSeek = (value: number) => {
    seek(value);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      onMouseDown={(e: React.MouseEvent) => {
        console.log('🎵 MusicPlayer: Mouse down event on container');
        // Prevent event from bubbling to document
        e.stopPropagation();
      }}
    >
      <motion.div
        ref={playerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
          className="bg-black/40 backdrop-blur-md p-6 
                     text-white shadow-xl w-[400px] max-w-[90vw] rounded-none relative"
        onClick={(e: React.MouseEvent) => {
          console.log('🎵 MusicPlayer: Click on player window');
          e.stopPropagation();
        }}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-none"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Track Info */}
        <div className="mb-4 text-center">
          <h3 className="text-lg font-medium">{currentTrack?.title || 'No track selected'}</h3>
          <p className="text-sm text-white/70">{currentTrack?.artist || 'Unknown Artist'}</p>
        </div>

        {/* Album Art */}
        <div className="flex justify-center mb-4">
          <div className="relative w-48 h-48">
            <img 
              src={currentTrack?.coverArt || '/audio/music/coverart/CLUELESSV2.webp'} 
              alt="Album Art"
              className="w-full h-full object-cover rounded-none"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={(value) => handleSeek(value[0])}
            className="w-full [&_.slider-track]:rounded-none [&_.slider-range]:rounded-none [&_.slider-thumb]:rounded-none"
          />
          <div className="flex justify-between text-sm text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={previousTrack}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-none"
          >
            <SkipBack className="h-6 w-6" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center text-white hover:text-white/90 transition-colors rounded-none"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-none"
          >
            <SkipForward className="h-6 w-6" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Slider
            value={[localVolume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => handleVolumeChange(value[0] / 100)}
            className="w-32 [&_.slider-track]:rounded-none [&_.slider-range]:rounded-none [&_.slider-thumb]:rounded-none"
          />
        </div>
      </motion.div>
    </div>
  );
} 