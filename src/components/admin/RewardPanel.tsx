import { useEffect, useMemo, useState } from 'react';

import ConnectWalletButton from '../web3/ConnectWalletButton';
import Web3Provider from '../web3/Web3Provider';

type User = {
  handle: string;
  walletAddress: string;
  createdAt: string;
};

type MintEvent = {
  id: string;
  toWallet: string;
  amountRaw: string;
  chainId: number;
  status: 'queued' | 'submitted' | 'confirmed' | 'failed' | string;
  idempotencyKey: string;
  txHash: string | null;
  requestedBySub: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

type MintResponse = {
  ok: boolean;
  eventId?: string;
  txHash: string | null;
  error?: string;
};

function shortHash(txHash: string | null): string {
  if (!txHash) {
    return '-';
  }
  return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
}

function RewardPanelInner() {
  const [users, setUsers] = useState<User[]>([]);
  const [mintEvents, setMintEvents] = useState<MintEvent[]>([]);
  const [reason, setReason] = useState('manual reward');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [failureReason, setFailureReason] = useState('manual failure');
  const [manualTxHash, setManualTxHash] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('');
  const [eventWalletFilter, setEventWalletFilter] = useState('');
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [mintingFor, setMintingFor] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  const filteredWallet = useMemo(() => eventWalletFilter.trim().toLowerCase(), [eventWalletFilter]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const authWarning = response.headers.get('x-auth-warning');
      setWarning(authWarning);

      if (response.status === 401 || response.status === 403) {
        let message = 'Protected route. Sign in via Cloudflare Access to use admin actions.';
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // keep fallback message
        }

        setAuthError(message);
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

  async function loadMintEvents() {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (eventStatusFilter) {
        params.set('status', eventStatusFilter);
      }
      if (filteredWallet) {
        params.set('to_wallet', filteredWallet);
      }

      const response = await fetch(`/api/admin/mint-events?${params.toString()}`);
      const authWarning = response.headers.get('x-auth-warning');
      setWarning(authWarning);

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }

      const json = (await response.json()) as MintEvent[];
      setMintEvents(Array.isArray(json) ? json : []);
    } catch {
      setResult('Could not load mint events history.');
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadMintEvents();
    const interval = window.setInterval(loadMintEvents, 15_000);
    return () => window.clearInterval(interval);
  }, [eventStatusFilter, filteredWallet]);

  async function mint(walletAddress: string, amount: number) {
    setMintingFor(walletAddress);
    setResult(null);

    const computedIdempotencyKey =
      idempotencyKey.trim() || `${walletAddress}-${amount}-${Date.now()}`;

    try {
      const response = await fetch('/api/admin/mint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          amount,
          reason,
          idempotencyKey: computedIdempotencyKey,
        }),
      });

      const authWarning = response.headers.get('x-auth-warning');
      setWarning(authWarning);

      const json = (await response.json()) as MintResponse;
      if (!response.ok || !json.ok) {
        setResult(json.error || 'Mint request failed.');
        return;
      }

      const txText = json.txHash ? `txHash: ${json.txHash}` : 'tx pending';
      setResult(`Queued event ${json.eventId || '(unknown)'}, ${txText}.`);
      await loadMintEvents();
    } catch {
      setResult('Network error while creating mint request.');
    } finally {
      setMintingFor(null);
    }
  }

  async function updateEventStatus(
    eventId: string,
    status: 'submitted' | 'confirmed' | 'failed' | 'queued',
    manualOverride: boolean,
  ) {
    setUpdatingEventId(eventId);
    setResult(null);

    try {
      const response = await fetch('/api/admin/mint-events', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId,
          status,
          txHash: status === 'submitted' ? manualTxHash.trim() || undefined : undefined,
          failureReason: failureReason.trim() || undefined,
          manualOverride,
        }),
      });

      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setResult(json.error || 'Failed to update mint status.');
        return;
      }

      setResult(`Updated event ${eventId} to ${status}.`);
      await loadMintEvents();
    } catch {
      setResult('Network error while updating mint status.');
    } finally {
      setUpdatingEventId(null);
    }
  }

  return (
    <section className="panel">
      <h2>Admin Reward Panel</h2>
      <p>Protected by Cloudflare Access at route and API level.</p>

      <div className="wallet-row">
        <ConnectWalletButton />
      </div>

      {warning ? <p className="hint">{warning}</p> : null}
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

        <label htmlFor="idempotency">Idempotency key (optional)</label>
        <input
          id="idempotency"
          type="text"
          value={idempotencyKey}
          onChange={(event) => setIdempotencyKey(event.target.value)}
          placeholder="auto-generated if empty"
          maxLength={180}
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

      <section className="panel" style="margin-top: 1rem;">
        <h3 style="margin-top: 0;">Mint Events</h3>
        <p className="hint">Newest first. Submitted/confirmed should come from worker, not normal UI flow.</p>

        <div className="stack" style="margin-bottom: 1rem;">
          <label htmlFor="filterStatus">Filter status</label>
          <select
            id="filterStatus"
            value={eventStatusFilter}
            onChange={(event) => setEventStatusFilter(event.target.value)}
          >
            <option value="">all</option>
            <option value="queued">queued</option>
            <option value="submitted">submitted</option>
            <option value="confirmed">confirmed</option>
            <option value="failed">failed</option>
          </select>

          <label htmlFor="filterWallet">Filter to wallet</label>
          <input
            id="filterWallet"
            type="text"
            value={eventWalletFilter}
            onChange={(event) => setEventWalletFilter(event.target.value)}
            placeholder="0x..."
          />

          <label htmlFor="failureReason">Failure reason (for failed/requeue)</label>
          <input
            id="failureReason"
            type="text"
            value={failureReason}
            onChange={(event) => setFailureReason(event.target.value)}
            maxLength={180}
          />
        </div>

        {loadingEvents ? <p>Loading mint events...</p> : null}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>To Wallet</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Tx Hash</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mintEvents.length === 0 ? (
              <tr>
                <td colSpan={7}>No mint events yet.</td>
              </tr>
            ) : (
              mintEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.id.slice(0, 8)}</td>
                  <td>{event.toWallet.slice(0, 6)}...{event.toWallet.slice(-4)}</td>
                  <td>{event.amountRaw}</td>
                  <td>{event.status}</td>
                  <td>{shortHash(event.txHash)}</td>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="actions">
                    {(event.status === 'queued' || event.status === 'submitted') ? (
                      <button
                        type="button"
                        disabled={updatingEventId === event.id}
                        onClick={() => updateEventStatus(event.id, 'failed', false)}
                      >
                        Mark Failed
                      </button>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <details style="margin-top: 1rem;">
          <summary>Danger Zone: Manual Overrides</summary>
          <div className="stack" style="margin-top: 0.75rem;">
            <label>
              <input
                type="checkbox"
                checked={manualOverrideEnabled}
                onChange={(event) => setManualOverrideEnabled(event.target.checked)}
              />{' '}
              Enable manual override actions
            </label>

            <label htmlFor="manualTx">Manual tx hash (for submitted/confirmed)</label>
            <input
              id="manualTx"
              type="text"
              value={manualTxHash}
              onChange={(event) => setManualTxHash(event.target.value)}
              placeholder="0x..."
              maxLength={66}
            />
          </div>

          <ul className="user-list" style="margin-top: 1rem;">
            {mintEvents.map((event) => (
              <li key={`override-${event.id}`}>
                <div>
                  <strong>{event.id.slice(0, 10)}</strong>
                  <div className="hint">status: {event.status}</div>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    disabled={!manualOverrideEnabled || updatingEventId === event.id}
                    onClick={() => updateEventStatus(event.id, 'submitted', true)}
                  >
                    Force Submitted
                  </button>
                  <button
                    type="button"
                    disabled={!manualOverrideEnabled || updatingEventId === event.id}
                    onClick={() => updateEventStatus(event.id, 'confirmed', true)}
                  >
                    Force Confirmed
                  </button>
                  <button
                    type="button"
                    disabled={!manualOverrideEnabled || updatingEventId === event.id}
                    onClick={() => updateEventStatus(event.id, 'queued', true)}
                  >
                    Requeue
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

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
