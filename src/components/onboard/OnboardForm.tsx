import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount } from 'wagmi';

import ConnectWalletButton from '../web3/ConnectWalletButton';
import Web3Provider from '../web3/Web3Provider';

type APIResponse = {
  ok: boolean;
  error?: string;
};

function OnboardFormInner() {
  const { address, isConnected } = useAccount();
  const [handle, setHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const isHandleValid = useMemo(() => /^[a-zA-Z0-9_]{3,24}$/.test(handle), [handle]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address || !isConnected) {
      setMessage({ tone: 'error', text: 'Connect a wallet before onboarding.' });
      return;
    }

    if (!isHandleValid) {
      setMessage({
        tone: 'error',
        text: 'Handle must be 3-24 chars and use only letters, numbers, or underscore.',
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, handle }),
      });

      const json = (await response.json()) as APIResponse;
      if (!response.ok || !json.ok) {
        setMessage({ tone: 'error', text: json.error || 'Onboarding failed.' });
        return;
      }

      setMessage({ tone: 'success', text: 'Handle saved successfully.' });
    } catch {
      setMessage({ tone: 'error', text: 'Network error while onboarding.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Onboard</h2>
      <p>Connect your wallet and reserve your handle.</p>
      <div className="wallet-row">
        <ConnectWalletButton />
      </div>

      {!isConnected ? <p className="hint">Wallet connection is required to submit.</p> : null}

      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="handle">Handle</label>
        <input
          id="handle"
          type="text"
          value={handle}
          onChange={(event) => setHandle(event.target.value.trim())}
          placeholder="turkey_builder"
          minLength={3}
          maxLength={24}
          autoComplete="off"
          required
        />
        <button type="submit" disabled={isSubmitting || !isConnected || !isHandleValid}>
          {isSubmitting ? 'Saving...' : 'Save Handle'}
        </button>
      </form>

      {message ? (
        <p className={message.tone === 'success' ? 'msg ok' : 'msg err'}>{message.text}</p>
      ) : null}
    </section>
  );
}

export default function OnboardForm() {
  return (
    <Web3Provider>
      <OnboardFormInner />
    </Web3Provider>
  );
}
