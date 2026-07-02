import { useState, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PositionDisplayProps {
  position: {
    x: number;
    y: number;
    z: number;
  };
}

interface Props {
  position: { x: number; y: number; z: number };
}

export default function PositionDisplay({ position }: PositionDisplayProps) {
  return (
    <div className="fixed bottom-4 left-4 font-bytebounce text-lg" style={{ 
      textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
      imageRendering: 'pixelated',
      letterSpacing: '1px'
    }}>
      <div className="text-white">
        X: {position.x.toFixed(0)}<br/>
        Y: {position.y.toFixed(0)}<br/>
        Z: {position.z.toFixed(0)}
      </div>
    </div>
  );
} 