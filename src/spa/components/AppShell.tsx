import { BookOpenText, CircleHelp, Shield, Trophy, Code } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import ConnectWalletButton from '../../components/web3/ConnectWalletButton';
import { APP_CHAIN_META } from '../../lib/chain';
import { StatusBadge, TerminalText } from './TerminalPrimitives';

const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', icon: Trophy },
  { to: '/admin', label: 'ADMIN', icon: Shield, external: true },
  { to: '/turkey-lore', label: 'TURKEY LORE', icon: BookOpenText },
  { to: '/api-specs', label: 'API SPECS', icon: Code },
  { to: '/help/wallet-setup', label: 'HELP', icon: CircleHelp, external: true },
];

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
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
  );
}

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
            <span className="mobile-menu-label">MENU</span>
          </button>
          <TerminalText glow className="sys-title sys-name">
            TURKEY_COIN_SYS_v2.4.1
          </TerminalText>
          <HeaderClock />
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
          <div className="sidebar-dismiss">
            <button
              type="button"
              className="sidebar-dismiss-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              CLOSE
            </button>
          </div>
          <div className="nav-items">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.label === 'ADMIN'
                  ? location.pathname === '/admin'
                  : item.label === 'TURKEY LORE'
                    ? location.pathname === '/turkey-lore'
                  : item.label === 'HELP'
                    ? location.pathname.startsWith('/help')
                    : location.pathname === item.to;
              return (
                item.external ? (
                  <a key={item.to} href={item.to} className={`nav-link ${active ? 'active' : ''}`}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link key={item.to} to={item.to} className={`nav-link ${active ? 'active' : ''}`}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
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
