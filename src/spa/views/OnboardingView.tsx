import { ArrowRight, CheckCircle2, Link2, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount } from 'wagmi';

import ConnectWalletButton from '../../components/web3/ConnectWalletButton';
import { postOnboard } from '../lib/api';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type Step = 'welcome' | 'wallet' | 'verify' | 'complete';

export function OnboardingView() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('welcome');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submitOnboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Connect your wallet before verifying.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(handle.trim())) {
      setError('Handle must be 3-24 letters, numbers, or underscore.');
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
    <div className="view-grid narrow">
      <div className="onboard-hero">
        <h1 className="view-title">TURKEY COIN</h1>
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
            <button type="button" className="primary-cta" onClick={() => setStep('wallet')}>
              BEGIN ONBOARDING <ArrowRight size={18} />
            </button>
          </div>
        </DataPanel>
      ) : null}

      {step === 'wallet' ? (
        <DataPanel title="[ WALLET CONNECTION ]" status="active">
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

            <label>Wallet Address</label>
            <div className="wallet-connect-row source-wallet-row">
              <input
                type="text"
                value={isConnected && address ? address : ''}
                readOnly
                placeholder="Connect wallet to populate"
              />
              <ConnectWalletButton />
            </div>

            <TerminalText className="muted-text">Use the Connect action to link your wallet.</TerminalText>

            <button type="submit" className="primary-cta" disabled={!isConnected}>
              VERIFY WALLET <Link2 size={16} />
            </button>
          </form>

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
            <a className="primary-cta" href="/">
              ENTER SYSTEM
            </a>
          </div>
        </DataPanel>
      ) : null}
    </div>
  );
}
