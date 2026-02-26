import { useEffect, useState } from 'react';

import logo from '../assets/turkey-coin-logo.png';
import { TerminalText } from './TerminalPrimitives';

const BOOT_LINES = [
  '> INITIALIZING TURKEY COIN NODE...',
  '> CHECKING SYSTEM INTEGRITY... OK',
  '> LOADING BLOCKCHAIN DATA...',
  '> ESTABLISHING SECURE CHANNEL...',
  '> VERIFYING WALLET CONNECTIONS...',
  '> SYNCHRONIZING LEDGER...',
  '> SYSTEM READY',
  '> TURKEY COIN v2.4.1',
];

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'boot' | 'reveal'>('boot');
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (phase === 'reveal') {
      const doneTimer = window.setTimeout(onComplete, 800);
      return () => window.clearTimeout(doneTimer);
    }

    if (lines.length >= BOOT_LINES.length) {
      const revealTimer = window.setTimeout(() => setPhase('reveal'), 450);
      return () => window.clearTimeout(revealTimer);
    }

    const lineTimer = window.setTimeout(() => {
      setLines((prev) => [...prev, BOOT_LINES[prev.length]]);
    }, 110 + Math.round(Math.random() * 120));

    return () => window.clearTimeout(lineTimer);
  }, [lines, phase, onComplete]);

  if (phase === 'reveal') {
    return (
      <div className="boot-screen fade-out">
        <img src={logo.src} alt="Turkey Coin" className="boot-logo" />
        <TerminalText glow className="boot-title">
          LAUNCHING TURKEY COIN
        </TerminalText>
      </div>
    );
  }

  return (
    <div className="boot-screen">
      <div className="boot-lines" role="status" aria-live="polite">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
