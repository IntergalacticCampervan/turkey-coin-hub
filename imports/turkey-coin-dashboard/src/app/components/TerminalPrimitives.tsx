import { ReactNode } from 'react';

interface TerminalTextProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  blink?: boolean;
}

export function TerminalText({ children, className = '', glow = false, blink = false }: TerminalTextProps) {
  const glowClass = glow ? '[text-shadow:var(--glow-strength)]' : '';
  const blinkClass = blink ? 'animate-pulse' : '';
  
  return (
    <span className={`font-mono ${glowClass} ${blinkClass} ${className}`}>
      {children}
    </span>
  );
}

interface DataPanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  status?: 'idle' | 'active' | 'alert' | 'syncing';
}

export function DataPanel({ children, title, className = '', status = 'idle' }: DataPanelProps) {
  const statusColors = {
    idle: 'border-[var(--phosphor-primary)]',
    active: 'border-[var(--phosphor-accent)]',
    alert: 'border-[var(--phosphor-warning)]',
    syncing: 'border-[var(--phosphor-accent)] animate-pulse'
  };

  return (
    <div className={`border ${statusColors[status]} bg-[var(--bg-panel)] p-4 ${className}`}>
      {title && (
        <div className="mb-3 pb-2 border-b border-[var(--phosphor-primary)] opacity-50">
          <TerminalText className="text-xs uppercase tracking-wider">{title}</TerminalText>
        </div>
      )}
      {children}
    </div>
  );
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'syncing' | 'alert' | 'compromised';
  children?: ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'text-[var(--phosphor-accent)]', symbol: '●' },
    offline: { color: 'text-gray-600', symbol: '●' },
    syncing: { color: 'text-[var(--phosphor-accent)] animate-pulse', symbol: '◐' },
    alert: { color: 'text-[var(--phosphor-warning)]', symbol: '▲' },
    compromised: { color: 'text-[var(--phosphor-warning)] animate-pulse', symbol: '✕' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs ${config.color}`}>
      <span>{config.symbol}</span>
      {children || status.toUpperCase()}
    </span>
  );
}

interface SignalMeterProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
}

export function SignalMeter({ value, label, showValue = true }: SignalMeterProps) {
  const bars = 10;
  const filledBars = Math.round((value / 100) * bars);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {label && <TerminalText className="text-xs opacity-70 min-w-[56px] sm:min-w-[80px]">{label}</TerminalText>}
      <div className="flex gap-0.5">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-4 border border-[var(--phosphor-primary)] ${
              i < filledBars ? 'bg-[var(--phosphor-primary)]' : 'bg-transparent'
            } ${i < filledBars ? '[box-shadow:var(--glow-strength)]' : ''}`}
          />
        ))}
      </div>
      {showValue && (
        <TerminalText className="text-xs min-w-[32px] sm:min-w-[40px]">{value}%</TerminalText>
      )}
    </div>
  );
}
