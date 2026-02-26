import { useEffect, useState } from 'react';

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
  const logo = '/Turkeycoin.svg';
  const [phase, setPhase] = useState<'boot' | 'hold' | 'logo' | 'exit'>('boot');
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (phase === 'hold') {
      const holdTimer = window.setTimeout(() => setPhase('logo'), 850);
      return () => window.clearTimeout(holdTimer);
    }

    if (phase === 'logo') {
      const logoTimer = window.setTimeout(() => setPhase('exit'), 1800);
      return () => window.clearTimeout(logoTimer);
    }

    if (phase === 'exit') {
      const doneTimer = window.setTimeout(onComplete, 950);
      return () => window.clearTimeout(doneTimer);
    }

    if (lines.length >= BOOT_LINES.length) {
      const holdTimer = window.setTimeout(() => setPhase('hold'), 380);
      return () => window.clearTimeout(holdTimer);
    }

    const lineTimer = window.setTimeout(() => {
      setLines((prev) => [...prev, BOOT_LINES[prev.length]]);
    }, 110 + Math.round(Math.random() * 120));

    return () => window.clearTimeout(lineTimer);
  }, [lines, phase, onComplete]);

  if (phase === 'logo' || phase === 'exit') {
    return (
      <div className={`boot-screen ${phase === 'exit' ? 'fade-out' : ''}`}>
        <div className="boot-logo-wrap">
          <img src={logo} alt="Turkey Coin" className="boot-logo" />
          <TerminalText glow className="boot-title">
            LAUNCHING TURKEY COIN
          </TerminalText>
          <TerminalText className="boot-subtitle muted-text">SYSTEM LINK STABILIZED</TerminalText>
        </div>
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
