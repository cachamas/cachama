import { useState, useEffect, useRef } from 'react';
import { useMapStore } from '../game/World';
import { useGameStore } from '../../lib/gameStore';

interface Command {
  name: string;
  description: string;
  execute: (...args: string[]) => void;
}

export default function DebugConsole() {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCurrentMap } = useMapStore();
  const clearEnemies = useGameStore(state => state.clearEnemies);

  const executeCommand = (commandInput: string) => {
    const args = commandInput.trim().toLowerCase().split(' ');
    const command = commands.find(cmd => cmd.name === args[0]);
    if (command) {
      command.execute(...args.slice(1));
      // Add confirmation message
      setOutputLines([`Executed: ${args[0]}`]);
      // Clear console and restore game state after a brief delay
      setTimeout(() => {
        setIsVisible(false);
        setInput('');
        setOutputLines([]);
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.requestPointerLock();
      }, 100);
    } else if (commandInput.trim() !== '') {
      setOutputLines([`Unknown command: ${args[0]}`]);
    }
  };

  // Available commands
  const commands: Command[] = [
    {
      name: 'toribash',
      description: 'Teleport to Toris map',
      execute: () => {
        clearEnemies();
        setCurrentMap('toris');
      }
    },
    {
      name: 'central',
      description: 'Teleport to Central map',
      execute: () => {
        clearEnemies();
        setCurrentMap('central');
      }
    },
    {
      name: 'gallery',
      description: 'Teleport to Gallery map',
      execute: () => {
        clearEnemies();
        setCurrentMap('gallery');
      }
    },
    {
      name: 'music',
      description: 'Teleport to Music map',
      execute: () => {
        clearEnemies();
        setCurrentMap('music');
      }
    },
    {
      name: 'gct',
      description: 'Teleport to GCT map',
      execute: () => {
        clearEnemies();
        setCurrentMap('gct');
      }
    },
    {
      name: 'help',
      description: 'Show available commands',
      execute: () => {
        const helpLines = commands.map(cmd => `${cmd.name}: ${cmd.description}`);
        setOutputLines(helpLines.slice(0, 8));
      }
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter to toggle console when it's not visible
      if (!isVisible && e.key === 'Enter') {
        e.preventDefault();
        setIsVisible(true);
        document.exitPointerLock();
        return;
      }

      // If console is visible, only prevent default for specific keys
      if (isVisible) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (input.trim() === '') {
            setIsVisible(false);
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.requestPointerLock();
          } else {
            executeCommand(input);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setIsVisible(false);
          setInput('');
          setOutputLines([]);
          const canvas = document.querySelector('canvas');
          if (canvas) canvas.requestPointerLock();
        }
        // Stop propagation for all keys when console is open
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, input]);

  // Focus input when console becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 font-bytebounce text-white flex flex-col items-end">
      {/* Output lines */}
      <div className="flex flex-col items-end mb-1">
        {outputLines.map((line, index) => (
          <div 
            key={index} 
            className="text-white/80 text-right px-2"
            style={{ maxWidth: '32ch' }}
          >
            {line}
          </div>
        ))}
      </div>
      {/* Input line with pixelated border */}
      <div className="relative">
        <div className="absolute inset-0 border border-white/20" style={{ imageRendering: 'pixelated' }} />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 32))}
          className="bg-transparent text-right w-auto max-w-[32ch] outline-none px-2"
          style={{ caretColor: 'white' }}
        />
      </div>
    </div>
  );
} 