import { CheckCircle2, HelpCircle, User, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

import { ConnectButton } from '@rainbow-me/rainbowkit';

import { postOnboard } from '../lib/api';
import { StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type Step = 'welcome' | 'wallet' | 'callsign' | 'authorization' | 'complete';

type OnboardingViewProps = {
  fullscreen?: boolean;
  gateReason?: 'wallet_disconnected' | 'wallet_not_onboarded' | 'verification_failed' | null;
  gateError?: string | null;
  onOnboardingComplete?: () => void;
  onRetryGateCheck?: () => void;
};

function validateHandle(handle: string): string | null {
  const trimmed = handle.trim();
  if (!trimmed) {
    return 'Use 3-24 characters: letters, numbers, underscore.';
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) {
    return 'Handle must be 3-24 letters, numbers, or underscore.';
  }

  return null;
}

function normalizeHandleInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
}

function shortWallet(wallet: string): string {
  return wallet.length > 16 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function OnboardingView({
  fullscreen = false,
  gateReason = null,
  gateError = null,
  onOnboardingComplete,
  onRetryGateCheck,
}: OnboardingViewProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [step, setStep] = useState<Step>(isConnected ? 'wallet' : 'welcome');
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('CALLSIGN AVAILABLE');
  const [authorizationProgress, setAuthorizationProgress] = useState(0);

  const handleError = useMemo(() => validateHandle(handle), [handle]);
  const handleReady = handle.trim().length > 0 && !handleError;
  const protocolStep = step === 'wallet' ? '1/3' : step === 'callsign' ? '2/3' : step === 'authorization' ? '3/3' : null;

  useEffect(() => {
    const interval = window.setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step !== 'welcome') {
      return;
    }

    const fullText = 'INITIATING ONBOARDING PROTOCOL';
    setTypedText('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, 42);

    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (isConnected && step === 'welcome') {
      setStep('wallet');
    }
  }, [isConnected, step]);

  useEffect(() => {
    if (!isConnected && step !== 'welcome') {
      setStep('wallet');
    }
  }, [isConnected, step]);

  useEffect(() => {
    if (!handle.trim()) {
      setStatusText('CALLSIGN AVAILABLE');
      return;
    }

    setStatusText(handleError ? (error ?? handleError) : 'CALLSIGN AVAILABLE');
  }, [error, handleError, handle]);

  useEffect(() => {
    if (step !== 'authorization') {
      setAuthorizationProgress(0);
      return;
    }

    setAuthorizationProgress(0);
    const timer = window.setInterval(() => {
      setAuthorizationProgress((value) => (value >= 96 ? value : value + 4));
    }, 60);

    return () => window.clearInterval(timer);
  }, [step]);

  const gateReasonLabel =
    gateReason === 'wallet_disconnected'
      ? 'Wallet not connected.'
      : gateReason === 'wallet_not_onboarded'
        ? 'Wallet not onboarded yet.'
        : gateReason === 'verification_failed'
          ? 'Verification failed.'
          : null;

  async function submitOnboard(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Connect your wallet before continuing.');
      setStep('wallet');
      return;
    }

    const candidateHandleError = validateHandle(handle);
    if (candidateHandleError) {
      setError(candidateHandleError);
      setStep('callsign');
      return;
    }

    setStep('authorization');

    const startedAt = Date.now();
    const result = await postOnboard({ walletAddress: address, handle: handle.trim() });
    const elapsed = Date.now() - startedAt;

    if (elapsed < 1200) {
      await delay(1200 - elapsed);
    }

    if (!result.ok || !result.data?.ok) {
      setError(result.error || result.data?.error || 'Network authorization failed.');
      setStatusText(result.error || result.data?.error || 'NETWORK AUTHORIZATION FAILED');
      setStep('callsign');
      return;
    }

    setAuthorizationProgress(100);
    await delay(250);
    setStep('complete');
  }

  return (
    <div className={`protocol-onboarding ${fullscreen ? 'protocol-onboarding-fullscreen' : ''}`.trim()}>
      <div className="protocol-grid" aria-hidden="true" />

      <div className="protocol-onboarding-shell">
        <div className="protocol-status-left">
          <StatusBadge status={step === 'authorization' ? 'syncing' : 'online'}>
            {step === 'authorization' ? 'PROCESSING' : 'ACTIVE'}
          </StatusBadge>
        </div>

        {protocolStep ? (
          <div className="protocol-status-right">
            <TerminalText>PROTOCOL STEP {protocolStep}</TerminalText>
          </div>
        ) : null}

        <a className="protocol-help" href="/help/wallet-setup" aria-label="Wallet setup guide">
          <HelpCircle size={22} />
        </a>

        <div className="protocol-stage">
          <img src="/Turkeycoin.svg" alt="" aria-hidden="true" className={`protocol-logo ${step === 'complete' ? 'complete' : ''}`} />

          {step === 'welcome' ? (
            <>
              <div className="protocol-title-wrap">
                <h1 className="protocol-title">
                  {typedText}
                  <span className={`protocol-cursor ${showCursor ? 'visible' : ''}`} aria-hidden="true" />
                </h1>
                <TerminalText className="protocol-subtitle">TURKEY COIN NETWORK ACCESS SYSTEM</TerminalText>
              </div>

              <section className="protocol-panel protocol-panel-intro">
                <ul className="protocol-checklist">
                  <li><CheckCircle2 size={18} /> SECURE WALLET LINKAGE</li>
                  <li><CheckCircle2 size={18} /> CALLSIGN REGISTRATION</li>
                  <li><CheckCircle2 size={18} /> NETWORK AUTHORIZATION</li>
                </ul>
              </section>

              <button type="button" className="protocol-primary-btn protocol-hero-btn" onClick={() => setStep('wallet')}>
                BEGIN INITIATION
              </button>

              <TerminalText className="protocol-footer-copy">AUTHORIZED PERSONNEL ONLY</TerminalText>
            </>
          ) : null}

          {step === 'wallet' ? (
            <>
              <div className="protocol-title-wrap">
                <div className="protocol-heading-row">
                  <Wifi size={26} className="protocol-accent-icon" />
                  <h1 className="protocol-title protocol-title-static">WALLET LINKAGE</h1>
                </div>
                <TerminalText className="protocol-subtitle">CONNECT YOUR BLOCKCHAIN WALLET</TerminalText>
              </div>

              <section className="protocol-panel">
                <TerminalText className="protocol-panel-label">WALLET CONNECTION</TerminalText>

                {isConnected && address ? (
                  <div className="protocol-wallet-connected">
                    <div className="protocol-wallet-copy">
                      <TerminalText className="muted-text">CONNECTED WALLET</TerminalText>
                      <TerminalText>{shortWallet(address)}</TerminalText>
                    </div>
                    <button type="button" className="protocol-outline-btn protocol-disconnect-btn" onClick={() => disconnect()}>
                      DISCONNECT
                    </button>
                  </div>
                ) : null}

                <div className="protocol-wallet-action">
                  <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                      const ready = mounted;
                      const connected = ready && !!account && !!chain;

                      if (connected) {
                        return (
                          <button type="button" className="protocol-primary-btn protocol-block-btn" disabled>
                            CONNECTED
                          </button>
                        );
                      }

                      return (
                        <button type="button" className="protocol-primary-btn protocol-block-btn" onClick={openConnectModal}>
                          <Wifi size={20} />
                          CONNECT WALLET
                        </button>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              </section>

              <div className="protocol-actions">
                <button type="button" className="protocol-outline-btn" onClick={() => setStep('welcome')}>
                  ← BACK
                </button>
                <button
                  type="button"
                  className="protocol-primary-btn"
                  onClick={() => setStep('callsign')}
                  disabled={!isConnected || !address}
                >
                  CONTINUE →
                </button>
              </div>

              <div className="protocol-divider" />
              <TerminalText className="protocol-footer-copy">YOUR WALLET CONNECTION IS ENCRYPTED AND SECURED</TerminalText>
            </>
          ) : null}

          {step === 'callsign' ? (
            <>
              <div className="protocol-title-wrap">
                <div className="protocol-heading-row">
                  <User size={26} className="protocol-accent-icon" />
                  <h1 className="protocol-title protocol-title-static">CALLSIGN ASSIGNMENT</h1>
                </div>
                <TerminalText className="protocol-subtitle">CHOOSE YOUR NETWORK IDENTIFIER</TerminalText>
              </div>

              <form className="protocol-panel" onSubmit={submitOnboard}>
                <TerminalText className="protocol-panel-label">CALLSIGN</TerminalText>

                <label htmlFor="protocol-callsign" className="sr-only">
                  Callsign
                </label>
                <input
                  id="protocol-callsign"
                  className="protocol-input"
                  type="text"
                  value={handle}
                  onChange={(event) => {
                    setError(null);
                    setHandle(normalizeHandleInput(event.target.value.toUpperCase()));
                  }}
                  placeholder="ENTER_CALLSIGN"
                  pattern="[A-Z0-9_]{3,24}"
                  title="Use 3-24 letters, numbers, or underscore."
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  minLength={3}
                  maxLength={24}
                  required
                />

                <TerminalText className="protocol-input-help">3-24 characters • Letters, numbers, underscore</TerminalText>

                <div className={`protocol-availability ${handleReady ? 'ready' : 'pending'} ${error ? 'error' : ''}`}>
                  {statusText}
                </div>
              </form>

              <div className="protocol-actions">
                <button type="button" className="protocol-outline-btn" onClick={() => setStep('wallet')}>
                  ← BACK
                </button>
                <button type="button" className="protocol-primary-btn" onClick={() => void submitOnboard()} disabled={!handleReady}>
                  CONTINUE →
                </button>
              </div>

              <div className="protocol-divider" />
              <TerminalText className="protocol-footer-copy">YOUR CALLSIGN WILL BE VISIBLE TO OTHER NETWORK MEMBERS</TerminalText>
            </>
          ) : null}

          {step === 'authorization' ? (
            <>
              <div className="protocol-title-wrap protocol-title-wrap-complete">
                <h1 className="protocol-title protocol-title-auth">AUTHORIZING ACCESS</h1>
                <TerminalText className="protocol-subtitle">VERIFYING WALLET LINKAGE AND CALLSIGN REGISTRATION</TerminalText>
              </div>

              <section className="protocol-panel protocol-panel-intro">
                <ul className="protocol-checklist protocol-checklist-active">
                  <li className={authorizationProgress >= 20 ? 'done' : ''}><CheckCircle2 size={18} /> SECURE WALLET LINKAGE</li>
                  <li className={authorizationProgress >= 60 ? 'done' : ''}><CheckCircle2 size={18} /> CALLSIGN REGISTRATION</li>
                  <li className={authorizationProgress >= 96 ? 'done' : ''}><CheckCircle2 size={18} /> NETWORK AUTHORIZATION</li>
                </ul>
                <div className="protocol-progress-bar">
                  <div className="protocol-progress-fill" style={{ width: `${authorizationProgress}%` }} />
                </div>
              </section>
            </>
          ) : null}

          {step === 'complete' ? (
            <>
              <div className="protocol-title-wrap protocol-title-wrap-complete">
                <h1 className="protocol-title protocol-title-granted">ACCESS GRANTED</h1>
                <TerminalText className="protocol-subtitle">WELCOME TO TURKEY COIN NETWORK</TerminalText>
              </div>

              <section className="protocol-summary">
                <div className="protocol-summary-row">
                  <TerminalText>CALLSIGN:</TerminalText>
                  <TerminalText>{handle.trim() || '-'}</TerminalText>
                </div>
                <div className="protocol-summary-row">
                  <TerminalText>WALLET:</TerminalText>
                  <TerminalText>{address ? shortWallet(address) : '-'}</TerminalText>
                </div>
                <div className="protocol-summary-row">
                  <TerminalText>STATUS:</TerminalText>
                  <TerminalText>AUTHORIZED</TerminalText>
                </div>
                <div className="protocol-summary-row">
                  <TerminalText>BALANCE:</TerminalText>
                  <TerminalText>0 TC</TerminalText>
                </div>
              </section>

              {onOnboardingComplete ? (
                <button type="button" className="protocol-primary-btn protocol-hero-btn" onClick={onOnboardingComplete}>
                  ENTER SYSTEM →
                </button>
              ) : (
                <a className="protocol-primary-btn protocol-hero-btn" href="/">
                  ENTER SYSTEM →
                </a>
              )}
            </>
          ) : null}
        </div>

        {(error || gateReasonLabel || gateError) && step !== 'complete' ? (
          <div className="protocol-message-row">
            {error ? <p className="error-text">{error}</p> : null}
            {!error && gateReasonLabel ? <p className="warning-text">{gateReasonLabel}</p> : null}
            {!error && !gateReasonLabel && gateError ? <p className="warning-text">{gateError}</p> : null}
            {gateReason === 'verification_failed' && onRetryGateCheck ? (
              <button type="button" className="protocol-outline-btn protocol-retry-btn" onClick={onRetryGateCheck}>
                RETRY STATUS CHECK
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
