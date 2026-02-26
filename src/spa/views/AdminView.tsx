import { AlertTriangle, Send, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount } from 'wagmi';

import DecryptedText from '../../components/DecryptedText';
import { getMintEvents, getUsers, patchMintEvent, postMint } from '../lib/api';
import type { MintEvent, MintEventStatus, UserEntry } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type Notice = { tone: 'success' | 'error'; text: string } | null;
const MISSING_HEADERS_ERROR = 'Missing Cloudflare Access authentication headers';

function getAdminAuthError(status: number, error: string | null): string | null {
  if (status !== 401 && status !== 403) {
    return null;
  }

  if ((error || '').includes(MISSING_HEADERS_ERROR)) {
    return MISSING_HEADERS_ERROR;
  }

  return error || 'Admin API denied request';
}

export function AdminView() {
  const { isConnected } = useAccount();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [events, setEvents] = useState<MintEvent[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('manual reward');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [failureReason, setFailureReason] = useState('manual failure');
  const [manualTxHash, setManualTxHash] = useState('');
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false);

  const [warning, setWarning] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [issuing, setIssuing] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  const normalizedFilterWallet = useMemo(() => filterWallet.trim().toLowerCase(), [filterWallet]);

  async function loadUsers() {
    setLoadingUsers(true);
    const result = await getUsers();

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok) {
      const authMessage = getAdminAuthError(result.status, result.error);
      if (authMessage) {
        setAuthError(authMessage);
        setNotice(null);
      } else {
        setNotice({ tone: 'error', text: result.error || 'Could not load users.' });
      }
      setUsers([]);
      setLoadingUsers(false);
      return;
    }

    setAuthError(null);
    setUsers(Array.isArray(result.data) ? result.data : []);
    setLoadingUsers(false);
  }

  async function loadEvents() {
    setLoadingEvents(true);
    const result = await getMintEvents({
      status: filterStatus || undefined,
      toWallet: normalizedFilterWallet || undefined,
      limit: 50,
    });

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok) {
      const authMessage = getAdminAuthError(result.status, result.error);
      if (authMessage) {
        setAuthError(authMessage);
        setNotice(null);
      } else {
        setNotice({ tone: 'error', text: result.error || 'Could not load mint events.' });
      }
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    setAuthError(null);
    setEvents(Array.isArray(result.data) ? result.data : []);
    setLoadingEvents(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadEvents();
    const timer = window.setInterval(loadEvents, 15_000);
    return () => window.clearInterval(timer);
  }, [filterStatus, normalizedFilterWallet]);

  async function handleIssueTokens(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!isConnected) {
      setNotice({ tone: 'error', text: 'Connect wallet to perform admin actions.' });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setNotice({ tone: 'error', text: 'Amount (Turkey Coins) must be greater than 0.' });
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount > 1000) {
      setNotice({ tone: 'error', text: 'Amount must be an integer between 1 and 1000.' });
      return;
    }

    if (!selectedWallet) {
      setNotice({ tone: 'error', text: 'Select a target wallet first.' });
      return;
    }

    setIssuing(true);

    const key = idempotencyKey.trim() || `${selectedWallet}-${parsedAmount}-${Date.now()}`;
    const result = await postMint({
      walletAddress: selectedWallet,
      amount: parsedAmount,
      reason: reason.trim() || 'manual reward',
      idempotencyKey: key,
    });

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok || !result.data?.ok) {
      setNotice({ tone: 'error', text: result.error || result.data?.error || 'Mint request failed.' });
      setIssuing(false);
      return;
    }

    setNotice({ tone: 'success', text: `Issued request queued (${result.data.eventId || 'unknown event'}).` });
    setIssuing(false);
    setAmount('');
    await loadEvents();
  }

  async function updateStatus(eventId: string, status: MintEventStatus, manualOverride: boolean) {
    setUpdatingEventId(eventId);

    const result = await patchMintEvent({
      eventId,
      status,
      txHash: status === 'submitted' ? manualTxHash.trim() || undefined : undefined,
      failureReason: failureReason.trim() || undefined,
      manualOverride,
    });

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok || !result.data?.ok) {
      setNotice({ tone: 'error', text: result.error || result.data?.error || 'Failed to update event.' });
      setUpdatingEventId(null);
      return;
    }

    setNotice({ tone: 'success', text: `Updated ${eventId.slice(0, 8)} to ${status}.` });
    setUpdatingEventId(null);
    await loadEvents();
  }

  if (authError) {
    return (
      <div className="view-grid narrow">
        <div className="view-header">
          <div>
            <h1 className="view-title admin-title">
              <Shield size={26} />
              <DecryptedText text="ADMIN CONTROL PANEL" animateOn="view" sequential speed={40} />
            </h1>
            <TerminalText as="p" className="muted-text">PRIVILEGED ACCESS ONLY</TerminalText>
          </div>
          <StatusBadge status="alert">ACCESS DENIED</StatusBadge>
        </div>

        <DataPanel status="alert" className="warning-panel">
          <div className="warning-row">
            <AlertTriangle size={18} />
            <div>
              <TerminalText className="terminal-text glow">ACCESS DENIED</TerminalText>
              <TerminalText as="p" className="muted-text">
                {authError}
              </TerminalText>
            </div>
          </div>
        </DataPanel>
      </div>
    );
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title admin-title">
            <Shield size={26} />
            <DecryptedText text="ADMIN CONTROL PANEL" animateOn="view" sequential speed={40} />
          </h1>
          <TerminalText as="p" className="muted-text">PRIVILEGED ACCESS ONLY</TerminalText>
        </div>
        <StatusBadge status={authError ? 'alert' : 'alert'}>ADMIN MODE</StatusBadge>
      </div>

      <DataPanel status="alert" className="warning-panel">
        <div className="warning-row">
          <AlertTriangle size={18} />
          <div>
            <TerminalText className="terminal-text glow">SECURITY NOTICE</TerminalText>
            <TerminalText as="p" className="muted-text">
              All token issuance and status transition operations are auditable.
            </TerminalText>
          </div>
        </div>
      </DataPanel>

      {warning ? <p className="warning-text">{warning}</p> : null}
      {notice ? <p className={notice.tone === 'success' ? 'success-text' : 'error-text'}>{notice.text}</p> : null}

      <DataPanel title="[ TOKEN ISSUANCE ]" status="active">
        <form onSubmit={handleIssueTokens} className="form-stack">
          <label htmlFor="selectedWallet">Select User</label>
          <select
            id="selectedWallet"
            value={selectedWallet}
            onChange={(event) => setSelectedWallet(event.target.value)}
            required
          >
            <option value="">-- SELECT TARGET WALLET --</option>
            {users.map((user) => (
              <option key={user.walletAddress} value={user.walletAddress}>
                {user.handle} ({user.walletAddress})
              </option>
            ))}
          </select>

          <label htmlFor="amount">Amount (Turkey Coins)</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            min={1}
            step={1}
            placeholder="0"
            required
          />

          <label htmlFor="reason">Note / Reason</label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={120}
          />

          <label htmlFor="idempotencyKey">Idempotency key (optional)</label>
          <input
            id="idempotencyKey"
            type="text"
            value={idempotencyKey}
            onChange={(event) => setIdempotencyKey(event.target.value)}
            maxLength={180}
            placeholder="auto-generated if empty"
          />

          <button type="submit" className="primary-cta" disabled={issuing || loadingUsers || !isConnected}>
            {issuing ? 'PROCESSING...' : 'ISSUE TOKENS'} <Send size={16} />
          </button>
        </form>

        {loadingUsers ? <p className="muted-text">Loading users...</p> : null}
      </DataPanel>

      <DataPanel title="[ ISSUANCE LOG ]" status="idle">
        <div className="form-grid compact-grid">
          <label htmlFor="filterStatus">Filter status</label>
          <select id="filterStatus" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">all</option>
            <option value="queued">queued</option>
            <option value="submitted">submitted</option>
            <option value="confirmed">confirmed</option>
            <option value="failed">failed</option>
          </select>

          <label htmlFor="filterWallet">Filter wallet</label>
          <input
            id="filterWallet"
            type="text"
            value={filterWallet}
            onChange={(event) => setFilterWallet(event.target.value)}
            placeholder="0x..."
          />

          <label htmlFor="manualTxHash">Manual tx hash</label>
          <input
            id="manualTxHash"
            type="text"
            value={manualTxHash}
            onChange={(event) => setManualTxHash(event.target.value)}
            placeholder="0x..."
            maxLength={66}
          />

          <label htmlFor="failureReason">Failure reason</label>
          <input
            id="failureReason"
            type="text"
            value={failureReason}
            onChange={(event) => setFailureReason(event.target.value)}
            maxLength={180}
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={manualOverrideEnabled}
            onChange={(event) => setManualOverrideEnabled(event.target.checked)}
          />
          Enable manual override actions
        </label>

        {loadingEvents ? <p className="muted-text">Loading issuance log...</p> : null}

        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6}>No mint events yet.</td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.id.slice(0, 8)}</td>
                    <td>{event.toWallet}</td>
                    <td>{event.amountRaw}</td>
                    <td>{event.status}</td>
                    <td>{new Date(event.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="list-actions compact">
                        <button
                          type="button"
                          disabled={updatingEventId === event.id || !manualOverrideEnabled || event.status !== 'queued' || !manualTxHash.trim()}
                          onClick={() => updateStatus(event.id, 'submitted', true)}
                        >
                          Force Submitted
                        </button>
                        <button
                          type="button"
                          disabled={updatingEventId === event.id || !manualOverrideEnabled || event.status !== 'submitted'}
                          onClick={() => updateStatus(event.id, 'confirmed', true)}
                        >
                          Force Confirmed
                        </button>
                        <button
                          type="button"
                          disabled={
                            updatingEventId === event.id ||
                            !(event.status === 'queued' || event.status === 'submitted')
                          }
                          onClick={() => updateStatus(event.id, 'failed', false)}
                        >
                          Mark Failed
                        </button>
                        <button
                          type="button"
                          disabled={updatingEventId === event.id || !manualOverrideEnabled}
                          onClick={() => updateStatus(event.id, 'queued', true)}
                        >
                          Requeue
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="event-cards">
          {events.length === 0 ? (
            <p className="muted-text">No mint events yet.</p>
          ) : (
            events.map((event) => (
              <div key={`mobile-${event.id}`} className="event-card">
                <div className="event-card-row">
                  <span className="event-card-label">ID</span>
                  <span className="event-card-value">{event.id.slice(0, 8)}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Wallet</span>
                  <span className="event-card-value">{event.toWallet}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Amount</span>
                  <span className="event-card-value">{event.amountRaw}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Status</span>
                  <span className="event-card-value">{event.status}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Time</span>
                  <span className="event-card-value">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <div className="list-actions compact">
                  <button
                    type="button"
                    disabled={
                      updatingEventId === event.id ||
                      !manualOverrideEnabled ||
                      event.status !== 'queued' ||
                      !manualTxHash.trim()
                    }
                    onClick={() => updateStatus(event.id, 'submitted', true)}
                  >
                    Force Submitted
                  </button>
                  <button
                    type="button"
                    disabled={updatingEventId === event.id || !manualOverrideEnabled || event.status !== 'submitted'}
                    onClick={() => updateStatus(event.id, 'confirmed', true)}
                  >
                    Force Confirmed
                  </button>
                  <button
                    type="button"
                    disabled={updatingEventId === event.id || !(event.status === 'queued' || event.status === 'submitted')}
                    onClick={() => updateStatus(event.id, 'failed', false)}
                  >
                    Mark Failed
                  </button>
                  <button
                    type="button"
                    disabled={updatingEventId === event.id || !manualOverrideEnabled}
                    onClick={() => updateStatus(event.id, 'queued', true)}
                  >
                    Requeue
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DataPanel>
    </div>
  );
}
