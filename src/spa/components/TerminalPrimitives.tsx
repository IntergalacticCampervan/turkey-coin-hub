import type { PropsWithChildren } from 'react';

type TextProps = PropsWithChildren<{
  className?: string;
  glow?: boolean;
  as?: 'span' | 'p' | 'div';
}>;

export function TerminalText({ children, className = '', glow = false, as = 'span' }: TextProps) {
  const Component = as;
  return <Component className={`terminal-text${glow ? ' glow' : ''} ${className}`.trim()}>{children}</Component>;
}

type PanelProps = PropsWithChildren<{
  title?: string;
  status?: 'idle' | 'active' | 'alert' | 'syncing';
  className?: string;
}>;

export function DataPanel({ children, title, status = 'idle', className = '' }: PanelProps) {
  return (
    <section className={`data-panel status-${status} ${className}`.trim()}>
      {title ? (
        <header className="data-panel-header">
          <TerminalText className="panel-title">{title}</TerminalText>
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatusBadge({
  status,
  children,
}: PropsWithChildren<{ status: 'online' | 'offline' | 'syncing' | 'alert' }>) {
  const symbol = {
    online: '●',
    offline: '●',
    syncing: '◐',
    alert: '▲',
  }[status];

  return (
    <span className={`status-badge status-${status}`}>
      <span>{symbol}</span>
      <span>{children || status.toUpperCase()}</span>
    </span>
  );
}
