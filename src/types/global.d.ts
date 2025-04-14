declare global {
  interface Window {
    __hasMobileControls__?: boolean;
    __btrMapOpen?: boolean;
    currentMap?: string;
    __preloadedSongAssets?: {
      audio: HTMLAudioElement;
      img: HTMLImageElement;
    };
    __preloadedBTRMap?: {
      mapImg: HTMLImageElement;
    };
  }
}

export {}; 