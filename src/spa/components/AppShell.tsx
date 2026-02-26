import { Shield, Trophy, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import ConnectWalletButton from '../../components/web3/ConnectWalletButton';
import { APP_CHAIN_META } from '../../lib/chain';
import { StatusBadge, TerminalText } from './TerminalPrimitives';

const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', icon: Trophy },
  { to: '/admin', label: 'ADMIN', icon: Shield },
  { to: '/status', label: 'STATUS', icon: Activity },
];

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="site-nav"
            aria-label="Toggle navigation"
          >
            <img src="/Turkeycoin.svg" alt="" aria-hidden="true" className="menu-box-icon" />
          </button>
          <TerminalText glow className="sys-title sys-name">
            TURKEY_COIN_SYS_v2.4.1
          </TerminalText>
          <TerminalText className="sys-title sys-time">
            {now.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </TerminalText>
          <TerminalText className="chain-pill">CHAIN: {APP_CHAIN_META.name}</TerminalText>
        </div>
        <div className="top-bar-right">
          <ConnectWalletButton />
          <StatusBadge status="online">ONLINE</StatusBadge>
        </div>
      </header>

      <div className="app-body">
        {mobileOpen ? <button type="button" className="mobile-backdrop" onClick={() => setMobileOpen(false)} /> : null}

        <nav id="site-nav" className={`sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="nav-items">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`nav-link ${active ? 'active' : ''}`}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <footer className="status-footer">
        <TerminalText className="muted-text">UPTIME: 99.8%</TerminalText>
        <TerminalText className="muted-text">LATENCY: 12ms</TerminalText>
        <StatusBadge status="online">CONNECTED</StatusBadge>
      </footer>
    </div>
  );
}
