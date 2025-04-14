declare global {
  interface Window {
    __hasMobileControls__?: boolean;
    __btrMapOpen?: boolean;
    currentMap?: string;
  }
}

export {}; 