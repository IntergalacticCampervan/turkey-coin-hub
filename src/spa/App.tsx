import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAccount, useReconnect } from 'wagmi';

import Web3Provider from '../components/web3/Web3Provider';
import { AppShell } from './components/AppShell';
import { BootSequence } from './components/BootSequence';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { FXOverlay } from './components/FXOverlay';
import { DataPanel, TerminalText } from './components/TerminalPrimitives';
import { getLeaderboardWithHeaders } from './lib/api';
import { AdminView } from './views/AdminView';
import { DashboardView } from './views/DashboardView';
import { OnboardingView } from './views/OnboardingView';
import { StatusView } from './views/StatusView';

import './styles/app.css';

type GateState = 'checking' | 'needsOnboarding' | 'authenticating' | 'ready';
type GateReason = 'wallet_disconnected' | 'wallet_not_onboarded' | 'verification_failed' | null;

function hasWalletOnboarded(rows: unknown[], walletAddress: string): boolean {
  const normalizedWallet = walletAddress.trim().toLowerCase();
  return rows.some((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }

    const value = row as Record<string, unknown>;
    const candidate = String(value.walletAddress ?? '').trim().toLowerCase();
    return candidate !== '' && candidate === normalizedWallet;
  });
}

function PlatformGate() {
  const { address, isConnected } = useAccount();
  const { reconnectAsync } = useReconnect();
  const [gateState, setGateState] = useState<GateState>('checking');
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    let isRunning = false;

    const resumeSession = async () => {
      if (!active || isRunning) {
        return;
      }

      isRunning = true;
      try {
        // Mobile wallet deep links can return focus without propagating connection state.
        await reconnectAsync();
      } catch {
        // Ignore reconnect errors and allow gate check to handle state.
      } finally {
        if (active) {
          setRefreshToken((value) => value + 1);
        }
        isRunning = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void resumeSession();
      }
    };

    const onWindowFocus = () => {
      void resumeSession();
    };

    const onPageShow = () => {
      void resumeSession();
    };

    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [reconnectAsync]);

  useEffect(() => {
    let cancelled = false;
    let authTimer = 0;

    if (!isConnected || !address) {
      setGateState('needsOnboarding');
      setGateReason('wallet_disconnected');
      setGateError(null);
      return () => {
        cancelled = true;
      };
    }

    setGateState('checking');
    setGateReason(null);
    setGateError(null);

    void (async () => {
      const result = await getLeaderboardWithHeaders();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setGateState('needsOnboarding');
        setGateReason('verification_failed');
        setGateError(result.error || 'Could not verify wallet onboarding status.');
        return;
      }

      if (hasWalletOnboarded(result.rows, address)) {
        setGateState('authenticating');
        authTimer = window.setTimeout(() => {
          if (!cancelled) {
            setGateState('ready');
          }
        }, 700);
        return;
      }

      setGateState('needsOnboarding');
      setGateReason('wallet_not_onboarded');
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(authTimer);
    };
  }, [isConnected, address, refreshToken]);

  if (gateState === 'checking' || gateState === 'authenticating') {
    return (
      <div className="onboarding-gate">
        <div className="gate-progress" aria-hidden="true">
          <span className="done">BOOT</span>
          <span className="active">AUTH</span>
          <span>READY</span>
        </div>
        <div className="view-grid narrow onboarding-fullscreen">
          <DataPanel status="syncing">
            <div className="onboard-center">
              <TerminalText className="panel-heading glow">
                {gateState === 'authenticating' ? 'WALLET RECOGNIZED' : 'VERIFYING WALLET ACCESS...'}
              </TerminalText>
              <TerminalText className="muted-text">
                {gateState === 'authenticating'
                  ? 'Entering platform...'
                  : 'Checking wallet onboarding state.'}
              </TerminalText>
            </div>
          </DataPanel>
        </div>
      </div>
    );
  }

  if (gateState === 'needsOnboarding') {
    return (
      <div className="onboarding-gate">
        <div className="gate-progress" aria-hidden="true">
          <span className="done">BOOT</span>
          <span className="active">AUTH</span>
          <span>READY</span>
        </div>
        <OnboardingView
          fullscreen
          gateReason={gateReason}
          gateError={gateError}
          onOnboardingComplete={() => setRefreshToken((value) => value + 1)}
          onRetryGateCheck={() => setRefreshToken((value) => value + 1)}
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardView />} />
          <Route path="onboard" element={<Navigate to="/" replace />} />
          <Route path="admin" element={<AdminView />} />
          <Route path="status" element={<StatusView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    // Failsafe: never let boot animation block the app indefinitely.
    if (bootDone) {
      return;
    }

    const failsafeTimer = window.setTimeout(() => setBootDone(true), 9000);
    return () => window.clearTimeout(failsafeTimer);
  }, [bootDone]);

  return (
    <Web3Provider>
      <FXOverlay />
      {bootDone ? (
        <AppErrorBoundary>
          <PlatformGate />
        </AppErrorBoundary>
      ) : (
        <BootSequence onComplete={() => setBootDone(true)} />
      )}
    </Web3Provider>
  );
}
