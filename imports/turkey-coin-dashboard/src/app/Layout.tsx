import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { TerminalText, StatusBadge } from './components/TerminalPrimitives';
import { LayoutDashboard, Shield, UserPlus, Activity, Menu, X } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigation = [
    { name: 'DASHBOARD', path: '/', icon: LayoutDashboard },
    { name: 'ADMIN', path: '/admin', icon: Shield },
    { name: 'ONBOARD', path: '/onboard', icon: UserPlus },
  ];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navItems = navigation.map((item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`block p-3 border transition-all ${
          isActive
            ? 'border-[var(--phosphor-accent)] bg-[var(--phosphor-accent)] bg-opacity-10 [box-shadow:var(--glow-strength)]'
            : 'border-[var(--phosphor-primary)] border-opacity-30 hover:border-[var(--phosphor-primary)] hover:bg-[var(--bg-core)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--phosphor-accent)]' : ''}`} />
          <TerminalText className={`text-sm ${isActive ? 'text-white' : ''}`}>
            {item.name}
          </TerminalText>
        </div>
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-[var(--bg-core)] text-[var(--phosphor-primary)]">
      {/* Top System Bar */}
      <div className="border-b border-[var(--phosphor-primary)] bg-[var(--bg-panel)] px-3 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center border border-[var(--phosphor-primary)] border-opacity-30 md:hidden"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <TerminalText glow className="text-xs">
              TURKEY_COIN_SYS_v2.4.1
            </TerminalText>
            <div className="hidden items-center gap-2 sm:flex">
              <Activity className="w-3 h-3 text-[var(--phosphor-accent)] animate-pulse" />
              <TerminalText className="text-xs opacity-70">
                {new Date().toLocaleString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
              </TerminalText>
            </div>
          </div>
          <StatusBadge status="online" />
        </div>
      </div>

      <div className="relative flex">
        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            aria-label="Close menu overlay"
          />
        )}
        <nav
          id="mobile-navigation"
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-[var(--phosphor-primary)] bg-[var(--bg-panel)] p-4 transition-transform md:hidden ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="space-y-2">{navItems}</div>
        </nav>

        {/* Sidebar Navigation */}
        <nav className="hidden w-64 border-r border-[var(--phosphor-primary)] bg-[var(--bg-panel)] p-4 md:block md:min-h-[calc(100vh-53px)]">
          <div className="space-y-2">{navItems}</div>

          {/* System Info */}
          <div className="mt-8 pt-8 border-t border-[var(--phosphor-primary)] border-opacity-30 space-y-3">
            <div>
              <TerminalText className="text-xs opacity-50 block mb-1">
                NODE STATUS
              </TerminalText>
              <TerminalText className="text-xs">
                OPERATIONAL
              </TerminalText>
            </div>
            <div>
              <TerminalText className="text-xs opacity-50 block mb-1">
                NETWORK
              </TerminalText>
              <TerminalText className="text-xs">
                TURKEY_NET_001
              </TerminalText>
            </div>
            <div>
              <TerminalText className="text-xs opacity-50 block mb-1">
                SYNC STATUS
              </TerminalText>
              <TerminalText className="text-xs text-[var(--phosphor-accent)]">
                98.4% ◐
              </TerminalText>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 pb-6 sm:p-6 md:p-8 md:pb-16">
          <Outlet />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <div className="hidden fixed bottom-0 left-0 right-0 border-t border-[var(--phosphor-primary)] bg-[var(--bg-panel)] px-6 py-2 md:block">
        <div className="flex items-center justify-between">
          <TerminalText className="text-xs opacity-50">
            © 2026 TURKEY COIN SYSTEM - INTERNAL USE ONLY
          </TerminalText>
          <div className="flex items-center gap-6">
            <TerminalText className="text-xs opacity-50">
              UPTIME: 99.8%
            </TerminalText>
            <TerminalText className="text-xs opacity-50">
              LATENCY: 12ms
            </TerminalText>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-[var(--phosphor-accent)] [box-shadow:var(--glow-strength)]" />
              <TerminalText className="text-xs opacity-50">
                CONNECTED
              </TerminalText>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Status Footer */}
      <div className="border-t border-[var(--phosphor-primary)] bg-[var(--bg-panel)] px-3 py-2 md:hidden">
        <div className="flex items-center justify-between">
          <TerminalText className="text-xs opacity-50">UPTIME: 99.8%</TerminalText>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[var(--phosphor-accent)] [box-shadow:var(--glow-strength)]" />
            <TerminalText className="text-xs opacity-50">CONNECTED</TerminalText>
          </div>
        </div>
      </div>
    </div>
  );
}
