import React from 'react';

interface CrosshairProps {
  isMobile?: boolean;
}

const Crosshair: React.FC<CrosshairProps> = ({ isMobile = false }) => {
  return (
    <div 
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000] ${isMobile ? 'mobile-crosshair' : ''}`}
      style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img 
        src="/images/thum.gif" 
        alt="Crosshair"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
};

export default Crosshair; 