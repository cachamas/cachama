import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessageDisplay() {
  const [message, setMessage] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHelpText, setIsHelpText] = useState(false);

  useEffect(() => {
    const handleShowMessage = (e: CustomEvent) => {
      const { message, duration = 2000, flash = false, helpText = false } = e.detail;
      setMessage(message);
      setIsFlashing(flash);
      setIsHelpText(helpText);
      
      // Clear message after duration
      setTimeout(() => {
        setMessage(null);
        setIsFlashing(false);
        setIsHelpText(false);
      }, duration);
    };

    window.addEventListener('show-message', handleShowMessage as EventListener);
    return () => {
      window.removeEventListener('show-message', handleShowMessage as EventListener);
    };
  }, []);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 ${
            isHelpText ? 'pointer-events-none' : ''
          }`}
        >
          <motion.div
            animate={isFlashing ? {
              opacity: [0.4, 1, 0.4],
              scale: [0.98, 1.02, 0.98],
            } : {}}
            transition={isFlashing ? {
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
            className={`${
              isHelpText 
                ? 'bg-black/60 text-white/90 px-4 py-2 rounded text-sm font-medium tracking-wide'
                : 'bg-black/80 text-white px-6 py-3 rounded-lg text-xl font-bold tracking-wider'
            }`}
          >
            {message}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 