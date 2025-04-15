import { create } from 'zustand';
import { Howl } from 'howler';
import { playlist } from '@/lib/playlist';

export interface Track {
  title: string;
  author: string;
  artist?: string;
  duration: number;
  coverArt: string;
  audioFile: string;
}

interface AudioState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  howl: Howl | null;
  nextHowl: Howl | null;
  currentTrackIndex: number;
  currentTime: number;
  duration: number;
  setTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (time: number) => void;
}

const CROSSFADE_DURATION = 2000; // 2 seconds crossfade

// Add iOS audio context initialization
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
let audioContext: AudioContext | null = null;

if (isIOS) {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  audioContext = new AudioContext();
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 2.0, // Set default volume to 200%
  howl: null,
  nextHowl: null,
  currentTrackIndex: 0,
  currentTime: 0,
  duration: 0,

  setTrack: (track: Track) => {
    const { howl, nextHowl, volume } = get();
    
    // Clean up existing howls
    if (howl) {
      howl.unload();
    }
    if (nextHowl) {
      nextHowl.unload();
    }

    // For iOS, ensure audio context is resumed
    if (isIOS && audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('iOS audio context resumed');
      });
    }

    const newHowl = new Howl({
      src: [track.audioFile],
      volume: volume,
      autoplay: false,
      html5: isIOS, // Use HTML5 audio for iOS
      onend: () => {
        console.log('Track ended, playing next');
        get().nextTrack();
      },
      onplay: () => {
        console.log('Track started playing');
        set({ isPlaying: true });
        
        const updateTime = () => {
          if (get().isPlaying) {
            const howl = get().howl;
            if (howl) {
              set({ 
                currentTime: howl.seek() as number,
                duration: howl.duration()
              });
              requestAnimationFrame(updateTime);
            }
          }
        };
        updateTime();
      },
      onstop: () => {
        console.log('Track stopped');
        set({ isPlaying: false });
      },
      onpause: () => {
        console.log('Track paused');
        set({ isPlaying: false });
      },
      onload: () => {
        console.log('Track loaded:', track.title);
        set({ duration: newHowl.duration() });
      },
      onloaderror: (id, error) => {
        console.error('Failed to load track:', track.title, error);
        set({ isPlaying: false });
      }
    });

    set({ 
      currentTrack: { ...track, artist: track.author },
      howl: newHowl,
      nextHowl: null,
      isPlaying: false,
      currentTime: 0,
      duration: newHowl.duration()
    });
  },

  togglePlay: () => {
    const { howl, isPlaying, volume } = get();
    if (howl) {
      console.log('🎵 AudioStore: Toggling play state:', { currentState: isPlaying, newState: !isPlaying });
      if (isPlaying) {
        howl.pause();
        set({ isPlaying: false });
      } else {
        howl.volume(volume);
        howl.play();
        set({ isPlaying: true });
      }
    }
  },

  play: () => {
    const { howl, volume } = get();
    if (howl) {
      console.log('Playing track');
      
      // For iOS, ensure audio context is resumed
      if (isIOS && audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('iOS audio context resumed before play');
          howl.volume(volume);
          howl.play();
          set({ isPlaying: true });
        });
      } else {
        howl.volume(volume);
        howl.play();
        set({ isPlaying: true });
      }
    }
  },

  pause: () => {
    const { howl } = get();
    if (howl) {
      console.log('Pausing track');
      // Just pause without resetting position
      howl.pause();
      set({ isPlaying: false });
    }
  },

  seek: (time: number) => {
    const { howl } = get();
    if (howl) {
      howl.seek(time);
      set({ currentTime: time });
    }
  },

  setVolume: (volume: number) => {
    const { howl, nextHowl } = get();
    if (howl) howl.volume(volume);
    if (nextHowl) nextHowl.volume(volume);
    set({ volume });
  },

  nextTrack: () => {
    const { currentTrackIndex, volume } = get();
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    const nextTrack = playlist[nextIndex];
    
    // Create next howl
    const nextHowl = new Howl({
      src: [nextTrack.audioFile],
      volume: 0,
      autoplay: true,
      onend: () => {
        console.log('Next track ended, playing next');
        get().nextTrack();
      },
      onplay: () => {
        console.log('Next track started playing');
        set({ isPlaying: true });
        
        const updateTime = () => {
          if (get().isPlaying) {
            const howl = get().nextHowl;
            if (howl) {
              set({ 
                currentTime: howl.seek() as number,
                duration: howl.duration()
              });
              requestAnimationFrame(updateTime);
            }
          }
        };
        updateTime();
      },
      onload: () => {
        console.log('Next track loaded:', nextTrack.title);
        set({ duration: nextHowl.duration() });
      }
    });

    // Start crossfade
    const currentHowl = get().howl;
    if (currentHowl) {
      currentHowl.fade(volume, 0, CROSSFADE_DURATION);
      nextHowl.fade(0, volume, CROSSFADE_DURATION);
    }

    // Update state
    set({ 
      currentTrackIndex: nextIndex,
      currentTrack: { ...nextTrack, artist: nextTrack.author },
      howl: nextHowl,
      nextHowl: null,
      isPlaying: true
    });
  },

  previousTrack: () => {
    const { currentTrackIndex, volume } = get();
    const prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    const prevTrack = playlist[prevIndex];
    
    // Create previous howl
    const prevHowl = new Howl({
      src: [prevTrack.audioFile],
      volume: 0,
      autoplay: true,
      onend: () => {
        console.log('Previous track ended, playing next');
        get().nextTrack();
      },
      onplay: () => {
        console.log('Previous track started playing');
        set({ isPlaying: true });
        
        const updateTime = () => {
          if (get().isPlaying) {
            const howl = get().nextHowl;
            if (howl) {
              set({ 
                currentTime: howl.seek() as number,
                duration: howl.duration()
              });
              requestAnimationFrame(updateTime);
            }
          }
        };
        updateTime();
      },
      onload: () => {
        console.log('Previous track loaded:', prevTrack.title);
        set({ duration: prevHowl.duration() });
      }
    });

    // Start crossfade
    const currentHowl = get().howl;
    if (currentHowl) {
      currentHowl.fade(volume, 0, CROSSFADE_DURATION);
      prevHowl.fade(0, volume, CROSSFADE_DURATION);
    }

    // Update state
    set({ 
      currentTrackIndex: prevIndex,
      currentTrack: { ...prevTrack, artist: prevTrack.author },
      howl: prevHowl,
      nextHowl: null,
      isPlaying: true
    });
  },
})); 