import { CheckCircle2, Link2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount } from 'wagmi';

import ConnectWalletButton from '../../components/web3/ConnectWalletButton';
import DecryptedText from '../../components/DecryptedText';
import { postOnboard } from '../lib/api';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type Step = 'welcome' | 'wallet' | 'verify' | 'complete';

type OnboardingViewProps = {
  fullscreen?: boolean;
  gateReason?: 'wallet_disconnected' | 'wallet_not_onboarded' | 'verification_failed' | null;
  gateError?: string | null;
  onOnboardingComplete?: () => void;
  onRetryGateCheck?: () => void;
};

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

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

export function OnboardingView({
  fullscreen = false,
  gateReason = null,
  gateError = null,
  onOnboardingComplete,
  onRetryGateCheck,
}: OnboardingViewProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>(isConnected ? 'wallet' : 'welcome');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastWallet, setLastWallet] = useState('');
  const handleError = useMemo(() => validateHandle(handle), [handle]);

  useEffect(() => {
    if (isConnected) {
      setStep('wallet');
    }
  }, [isConnected]);

  useEffect(() => {
    if (!address) {
      return;
    }

    window.localStorage.setItem('turkeycoin:lastWallet', address);
    setLastWallet(address);
  }, [address]);

  useEffect(() => {
    if (address) {
      return;
    }

    const stored = window.localStorage.getItem('turkeycoin:lastWallet') || '';
    setLastWallet(stored);
  }, [address]);

  const gateReasonLabel =
    gateReason === 'wallet_disconnected'
      ? 'Wallet not connected.'
      : gateReason === 'wallet_not_onboarded'
        ? 'Wallet not onboarded yet.'
        : gateReason === 'verification_failed'
          ? 'Verification failed.'
          : null;

  async function submitOnboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Connect your wallet before verifying.');
      return;
    }

    const candidateHandleError = validateHandle(handle);
    if (candidateHandleError) {
      setError(candidateHandleError);
      return;
    }

    setStep('verify');
    const result = await postOnboard({ walletAddress: address, handle: handle.trim() });

    if (!result.ok || !result.data?.ok) {
      setError(result.error || result.data?.error || 'Onboarding failed');
      setStep('wallet');
      return;
    }

    setStep('complete');
  }

  return (
    <div className={`view-grid narrow ${fullscreen ? 'onboarding-fullscreen' : ''}`.trim()}>
      {gateReasonLabel ? (
        <div className="gate-notice">
          <TerminalText className="muted-text">{gateReasonLabel}</TerminalText>
          {gateReason === 'verification_failed' && onRetryGateCheck ? (
            <button type="button" className="source-connect-btn secondary" onClick={onRetryGateCheck}>
              RETRY STATUS CHECK
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="onboard-hero">
        <h1 className="view-title">
          <DecryptedText text="TURKEY COIN" animateOn="view" sequential speed={40} />
        </h1>
        <TerminalText as="p" className="muted-text">
          WALLET ONBOARDING SEQUENCE
        </TerminalText>
        <StatusBadge status={step === 'complete' ? 'online' : 'syncing'}>
          {step === 'complete' ? 'CONNECTED' : 'INITIALIZING'}
        </StatusBadge>
      </div>

      <div className="progress-row">
        {['welcome', 'wallet', 'verify', 'complete'].map((name, index) => {
          const done = ['welcome', 'wallet', 'verify', 'complete'].indexOf(step) > index || step === 'complete';
          const active = step === name;
          return (
            <div key={name} className="progress-item">
              <div className={`progress-dot ${active ? 'active' : done ? 'done' : ''}`}>{index + 1}</div>
              {index < 3 ? <div className={`progress-line ${done ? 'done' : ''}`} /> : null}
            </div>
          );
        })}
      </div>

      {step === 'welcome' ? (
        <DataPanel status="active">
          <div className="onboard-center">
            <Wallet size={56} className="accent-icon" />
            <h2 className="panel-heading">WELCOME TO TURKEY COIN</h2>
            <TerminalText as="p" className="muted-text">
              Turkey Coin is our internal system for recognizing contributions and rewarding execution.
            </TerminalText>
            <div className="onboard-cta-stack onboard-sticky-cta">
              <ConnectWalletButton />
              <button type="button" className="source-connect-btn secondary" onClick={() => setStep('wallet')}>
                NEED ONBOARDING? START SETUP
              </button>
            </div>
            {lastWallet ? (
              <TerminalText as="p" className="muted-text">Last used: {shortWallet(lastWallet)}</TerminalText>
            ) : null}
          </div>
        </DataPanel>
      ) : null}

      {step === 'wallet' ? (
        <DataPanel title="[ WALLET CONNECTION ]" status="active">
          {!isConnected ? (
            <div className="onboard-center">
              <TerminalText className="panel-heading glow">WALLET REQUIRED</TerminalText>
              <TerminalText className="muted-text">
                Connect your wallet to continue. If this wallet was already onboarded, you will skip setup.
              </TerminalText>
              <ConnectWalletButton />
            </div>
          ) : (
            <form onSubmit={submitOnboard} className="form-stack">
              <label htmlFor="handle">Username / Handle</label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="Enter your username..."
                minLength={3}
                maxLength={24}
                required
              />
              <TerminalText className={`muted-text ${handleError ? 'handle-help-error' : ''}`}>
                {handleError || 'Handle format looks good.'}
              </TerminalText>

              <label>Wallet Address</label>
              <div className="wallet-connect-row source-wallet-row">
                <input type="text" value={address || ''} readOnly />
                <ConnectWalletButton />
              </div>

              <TerminalText className="muted-text">Use the Verify action to finish onboarding.</TerminalText>

              <button type="submit" className="primary-cta onboard-sticky-cta" disabled={Boolean(handleError)}>
                VERIFY WALLET <Link2 size={16} />
              </button>
            </form>
          )}

          {gateError && !gateReasonLabel ? <p className="warning-text">{gateError}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DataPanel>
      ) : null}

      {step === 'verify' ? (
        <DataPanel status="syncing">
          <div className="onboard-center">
            <TerminalText className="panel-heading glow">VERIFYING WALLET...</TerminalText>
            <TerminalText className="muted-text">Submitting onboarding request to server.</TerminalText>
          </div>
        </DataPanel>
      ) : null}

      {step === 'complete' ? (
        <DataPanel status="active">
          <div className="onboard-center">
            <CheckCircle2 size={58} className="accent-icon" />
            <h2 className="panel-heading">CONNECTION ESTABLISHED</h2>
            <div className="summary-box">
              <div>
                <TerminalText className="muted-text">USERNAME</TerminalText>
                <TerminalText>{handle.trim()}</TerminalText>
              </div>
              <div>
                <TerminalText className="muted-text">WALLET</TerminalText>
                <TerminalText>{address || '-'}</TerminalText>
              </div>
            </div>
            {onOnboardingComplete ? (
              <button type="button" className="primary-cta" onClick={onOnboardingComplete}>
                ENTER SYSTEM
              </button>
            ) : (
              <a className="primary-cta" href="/">
                ENTER SYSTEM
              </a>
            )}
          </div>
        </DataPanel>
      ) : null}
    </div>
  );
}
