import { useState, useEffect } from 'react';
import { TerminalText } from './TerminalPrimitives';
import turkeyCoinLogo from '/Users/josh/Downloads/Turkey Coin Dashboard/src/assets/047e7f0143813b060d8c81dbbbe658549ff761a6.png';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_MESSAGES = [
  '> INITIALIZING TURKEY COIN NODE...',
  '> CHECKING SYSTEM INTEGRITY... OK',
  '> LOADING BLOCKCHAIN DATA...',
  '> ESTABLISHING SECURE CHANNEL...',
  '> VERIFYING WALLET CONNECTIONS...',
  '> SYNCHRONIZING LEDGER... ',
  '> LOADING USER DATABASE...',
  '> SYSTEM READY',
  '> WAKING UP TURKEY COIN...',
  '> SUMMONING THE TURKEY...',
  '',
  '> TURKEY COIN v2.4.1',
  '> LINK ESTABLISHED',
];

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState<'wake' | 'lock' | 'reveal'>('wake');
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    // Phase 1: Wake - type out boot messages
    if (phase === 'wake') {
      if (currentLine < BOOT_MESSAGES.length) {
        const timer = setTimeout(() => {
          setLines((prev) => [...prev, BOOT_MESSAGES[currentLine]]);
          setCurrentLine((prev) => prev + 1);
        }, 150 + Math.random() * 150); // Variable timing
        return () => clearTimeout(timer);
      } else {
        // Move to lock phase
        const timer = setTimeout(() => setPhase('lock'), 500);
        return () => clearTimeout(timer);
      }
    }

    // Phase 2: Lock - signal animation
    if (phase === 'lock') {
      const timer = setTimeout(() => setPhase('reveal'), 1500);
      return () => clearTimeout(timer);
    }

    // Phase 3: Reveal - fade out and show main UI
    if (phase === 'reveal') {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, currentLine, onComplete]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (phase === 'reveal') {
    return (
      <div className="fixed inset-0 bg-[var(--bg-core)] z-[100] flex items-center justify-center animate-fadeOut">
        <div className="text-center space-y-6">
          {/* Turkey Coin Logo */}
          <div className="relative mx-auto w-48 h-48 animate-pulse">
            <img 
              src={turkeyCoinLogo} 
              alt="Turkey Coin" 
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,122,0,0.6)]"
            />
          </div>
          
          <TerminalText glow className="text-2xl">
            LAUNCHING TURKEY COIN
          </TerminalText>
          
          <TerminalText className="text-xs opacity-70">
            SYSTEM v2.4.1
          </TerminalText>
        </div>
      </div>
    );
  }

  if (phase === 'lock') {
    return (
      <div className="fixed inset-0 bg-[var(--bg-core)] z-[100] flex items-center justify-center">
        <div className="text-center space-y-8">
          {lines.slice(-3).map((line, i) => (
            <div key={i} className="opacity-30">
              <TerminalText className="text-xs">{line}</TerminalText>
            </div>
          ))}
          
          {/* Signal lock animation */}
          <div className="relative w-32 h-32 mx-auto">
            {/* Radar sweep */}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--phosphor-accent)] animate-ping opacity-40" />
            <div className="absolute inset-4 rounded-full border-2 border-[var(--phosphor-accent)] animate-pulse" />
            <div className="absolute inset-8 rounded-full border-2 border-[var(--phosphor-accent)]" />
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[var(--phosphor-accent)] rounded-full [box-shadow:var(--glow-strong)]" />
          </div>
          
          <TerminalText glow className="text-sm animate-pulse">
            ESTABLISHING LINK...
          </TerminalText>
        </div>
      </div>
    );
  }

  // Phase: wake
  return (
    <div className="fixed inset-0 bg-[var(--bg-core)] z-[100] flex items-start justify-start p-8">
      <div className="font-mono text-[var(--phosphor-primary)] text-sm space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="opacity-80">
            {line}
          </div>
        ))}
        {currentLine < BOOT_MESSAGES.length && showCursor && (
          <span className="inline-block w-2 h-4 bg-[var(--phosphor-primary)] [box-shadow:var(--glow-strength)]" />
        )}
      </div>
    </div>
  );
}