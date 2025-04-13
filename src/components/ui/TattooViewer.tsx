import { useState, useEffect } from 'react';

interface TattooViewerProps {
  variant: string;
}

export default function TattooViewer({ variant }: TattooViewerProps) {
  const [currentImage, setCurrentImage] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => prev === 1 ? 2 : 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        src={`/images/tatus/tatus/${variant}${currentImage}.webp`}
        alt={`Tattoo ${variant} Animation Frame ${currentImage}`}
        className="max-w-full max-h-full object-contain"
        style={{
          maxHeight: '60vh',
          width: 'auto',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
} 