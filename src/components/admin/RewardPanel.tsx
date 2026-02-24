import { useEffect, useState } from 'react';

import ConnectWalletButton from '../web3/ConnectWalletButton';
import Web3Provider from '../web3/Web3Provider';

type User = {
  handle: string;
  walletAddress: string;
  createdAt: string;
};

type MintResponse = {
  ok: boolean;
  txHash: string | null;
  error?: string;
};

function RewardPanelInner() {
  const [users, setUsers] = useState<User[]>([]);
  const [reason, setReason] = useState('manual reward');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [mintingFor, setMintingFor] = useState<string | null>(null);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.status === 401 || response.status === 403) {
        setAuthError('Protected route. Sign in via Cloudflare Access to use admin actions.');
        setUsers([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as User[];
      setUsers(Array.isArray(json) ? json : []);
      setAuthError(null);
    } catch {
      setAuthError('Could not load admin users.');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function mint(walletAddress: string, amount: number) {
    setMintingFor(walletAddress);
    setResult(null);

    try {
      const response = await fetch('/api/admin/mint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          amount,
          reason,
          idempotencyKey: `${walletAddress}-${amount}-${Date.now()}`,
        }),
      });

      const json = (await response.json()) as MintResponse;
      if (!response.ok || !json.ok) {
        setResult(json.error || 'Mint request failed.');
        return;
      }

      setResult(json.txHash ? `Queued. txHash: ${json.txHash}` : 'Queued mint request (tx pending).');
    } catch {
      setResult('Network error while creating mint request.');
    } finally {
      setMintingFor(null);
    }
  }

  return (
    <section className="panel">
      <h2>Admin Reward Panel</h2>
      <p>Protected by Cloudflare Access at route and API level.</p>

      <div className="wallet-row">
        <ConnectWalletButton />
      </div>

      {authError ? <p className="msg err">{authError}</p> : null}

      <div className="stack">
        <label htmlFor="reason">Reward reason</label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="manual reward"
          maxLength={120}
        />
      </div>

      {loadingUsers ? <p>Loading users...</p> : null}

      <ul className="user-list">
        {users.map((user) => (
          <li key={user.walletAddress}>
            <div>
              <strong>{user.handle}</strong>
              <div className="hint">{user.walletAddress}</div>
            </div>
            <div className="actions">
              <button
                type="button"
                disabled={mintingFor === user.walletAddress}
                onClick={() => mint(user.walletAddress, 10)}
              >
                Mint 10
              </button>
              <button
                type="button"
                disabled={mintingFor === user.walletAddress}
                onClick={() => mint(user.walletAddress, 50)}
              >
                Mint 50
              </button>
            </div>
          </li>
        ))}
      </ul>

      {result ? <p className="msg ok">{result}</p> : null}
    </section>
  );
}

export default function RewardPanel() {
  return (
    <Web3Provider>
      <RewardPanelInner />
    </Web3Provider>
  );
}
