import { AlertTriangle, Send, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount } from 'wagmi';

import DecryptedText from '../../components/DecryptedText';
import { getMintEvents, getUsers, patchMintEvent, postMint } from '../lib/api';
import type { MintEvent, MintEventStatus, UserEntry } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type Notice = { tone: 'success' | 'error'; text: string } | null;
const MISSING_HEADERS_ERROR = 'Missing Cloudflare Access authentication headers';
const ACCESS_LOGIN_PATH = '/auth/admin-access';
const ISSUE_TYPES = ['ISSUED', 'REWARD', 'TRANSFER', 'BONUS', 'BOUNTY'] as const;
type IssueType = (typeof ISSUE_TYPES)[number];

const TURKEY_OPENINGS = [
  'The hand of the turkey reaches through hyperspace and',
  'Thus spoke the turkey at the end of the universe and',
  'From the intergalactic farmhouse, the turkey',
  'By decree of the cosmic turkey council, we',
  'One for the intergalactic lunchbox, we',
  'In the glow of the coop reactor, we',
  'By orbit of the ninth barn moon, the turkey',
  'The chrome-feathered oracle of Turkey Coin',
  'From the fires of Mount Gobble, the turkey',
  'In the halls beneath the Roost of Khazad Coop, we',
  'By oath of the Fellowship of the Wing, we',
  'From the green fields of the Shire Coop, the turkey',
  'At the black gate of Mordor Barn, we',
  'Under the white tree of Minas Turkeyth, we',
  'By lantern light in Rivencoop, the turkey',
  'From the towers of Isencoop, we',
  'In the shadow of Barad Drumstick, the turkey',
  'By command of the Steward of Second Breakfast, we',
  'With feathers raised at Helm Coop Deep, we',
  'As the eagles circle over the cooplands, the turkey',
  'From the Red Book of Turkeymark, we',
  'By rune and gravy, the turkey',
  'In the age of rings and roast, we',
  'By moon over Buckleberry Coop, the turkey',
  'From the road that goes ever on, we',
  'At dawn on the fifth day in the east coop, we',
  'By old songs of Gondor Gobbler Guard, we',
  'Through mist, mountain, and marketplace, the turkey',
];

const TURKEY_ACTIONS = [
  'blesses',
  'christeneth',
  'anoints',
  'endorses',
  'uplifts',
  'rewards',
  'commissions',
  'accelerates',
  'crowns',
  'consecrates',
  'ordains',
  'fortifies',
  'elevates',
  'provisions',
  'arms',
  'honors',
  'salutes',
  'vouches for',
  'ratifies',
  'upgrades',
  'amplifies',
  'anoints with second breakfast power for',
  'decrees abundance upon',
  'bestows barn-forged glory upon',
  'marches in support of',
  'entrusts with the one true drumstick',
  'sends forth in triumph',
  'marks as keeper of the coop flame',
];

const TURKEY_TARGETS = [
  'this wallet',
  'this callsign',
  'this brave operator',
  'this stellar contributor',
  'this mission crew',
  'the chosen account',
  'the lunchbox champion',
  'the coop vanguard',
  'the rider of roast-han',
  'the steward of turkeyor',
  'the fellowship quartermaster',
  'the shieldbearer of the shire coop',
  'the guardian of second breakfast',
  'the keeper of the beacon fires',
  'the goblin mode bug hunter',
  'the architect of barnside scaling',
  'the sage of commit mountain',
  'the ranger of the northern backlog',
  'the captain of the token watch',
  'the friend of all free-range peoples',
  'the hammer of flaky tests',
  'the tamer of deployment dragons',
  'the courier of hotfixes at dawn',
  'the scribe of clean diffs',
  'the champion of lunch and latency',
  'the last defender of production',
  'the scout of uncharted integrations',
  'the guardian of the golden gravy path',
];

const TURKEY_ENDINGS = [
  'for exemplary execution.',
  'for glorious contributions.',
  'for mission-critical heroics.',
  'for service to the flock.',
  'with one calibrated token payload.',
  'with righteous Turkey Coin energy.',
  'for proving worthy in the barnosphere.',
  'as foretold by the turkey stars.',
  'after a long road from bug to victory.',
  'for keeping the beacon of uptime lit.',
  'for courage under pager pressure.',
  'for surviving the mines of legacy code.',
  'for defending the realm from regressions.',
  'for deeds sung in the halls of roast.',
  'for carrying the sprint to Mount Deploy.',
  'with honor, haste, and hot gravy.',
  'by right of commit, review, and release.',
  'for standing fast at Helm Coop Deep.',
  'for uniting the fellowship of contributors.',
  'for a flawless push beyond the black gate.',
  'for restoring peace to the dashboard realm.',
  'for banishing dark bugs into Mordor.',
  'with the blessing of second breakfast.',
  'for answering the call of the beacon towers.',
  'for forging clean code in the fires of effort.',
  'for noble service to coop, coin, and country.',
  'for triumph in both backend and battlefield.',
  'for earning legend status in the turkey annals.',
];

function randomInt(max: number): number {
  if (max <= 0) {
    return 0;
  }

  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

function generateMintReason(input?: { handle?: string; walletAddress?: string; amount?: number }): string {
  const opening = TURKEY_OPENINGS[randomInt(TURKEY_OPENINGS.length)];
  const action = TURKEY_ACTIONS[randomInt(TURKEY_ACTIONS.length)];
  const baseTarget = TURKEY_TARGETS[randomInt(TURKEY_TARGETS.length)];
  const ending = TURKEY_ENDINGS[randomInt(TURKEY_ENDINGS.length)];
  const amountPart = input?.amount && Number.isFinite(input.amount) ? ` (${input.amount} TC)` : '';
  const target =
    input?.handle?.trim()
      ? `@${input.handle.trim()}`
      : input?.walletAddress?.trim()
        ? shortWallet(input.walletAddress.trim())
        : baseTarget;

  return `${opening} ${action} ${target}${amountPart} ${ending}`;
}

function generateIdempotencyKey(walletAddress: string, amount: string): string {
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${walletAddress}-${amount}-${uniquePart}`;
}

function getAdminAuthError(status: number, error: string | null, requiresAccessLogin?: boolean): string | null {
  if (!requiresAccessLogin && status !== 401 && status !== 403) {
    return null;
  }

  if ((error || '').includes(MISSING_HEADERS_ERROR)) {
    return MISSING_HEADERS_ERROR;
  }

  return error || 'Admin API denied request';
}

function formatMintFailure(error: string | null | undefined, stage?: string | null): string {
  if (!stage) {
    return error || 'Mint request failed.';
  }

  return `${error || 'Mint request failed.'} [stage: ${stage}]`;
}

function EventActionMenu(props: {
  event: MintEvent;
  updatingEventId: string | null;
  manualOverrideEnabled: boolean;
  manualTxHash: string;
  onUpdateStatus: (eventId: string, status: MintEventStatus, manualOverride: boolean) => void;
}) {
  const { event, updatingEventId, manualOverrideEnabled, manualTxHash, onUpdateStatus } = props;

  return (
    <details className="row-actions-menu">
      <summary>Actions</summary>
      <div className="list-actions compact">
        <button
          type="button"
          disabled={updatingEventId === event.id || !manualOverrideEnabled || event.status !== 'queued' || !manualTxHash.trim()}
          onClick={() => onUpdateStatus(event.id, 'submitted', true)}
        >
          Force Submitted
        </button>
        <button
          type="button"
          disabled={updatingEventId === event.id || !manualOverrideEnabled || event.status !== 'submitted'}
          onClick={() => onUpdateStatus(event.id, 'confirmed', true)}
        >
          Force Confirmed
        </button>
        <button
          type="button"
          disabled={updatingEventId === event.id || !(event.status === 'queued' || event.status === 'submitted')}
          onClick={() => onUpdateStatus(event.id, 'failed', false)}
        >
          Mark Failed
        </button>
        <button
          type="button"
          disabled={updatingEventId === event.id || !manualOverrideEnabled}
          onClick={() => onUpdateStatus(event.id, 'queued', true)}
        >
          Requeue
        </button>
      </div>
    </details>
  );
}

export function AdminView() {
  const { isConnected } = useAccount();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [events, setEvents] = useState<MintEvent[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState(() => generateMintReason());
  const [reasonTouched, setReasonTouched] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>('ISSUED');
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
  const mintSubmitLockRef = useRef(false);

  const normalizedFilterWallet = useMemo(() => filterWallet.trim().toLowerCase(), [filterWallet]);
  const selectedUser = useMemo(
    () => users.find((user) => user.walletAddress.toLowerCase() === selectedWallet.toLowerCase()),
    [users, selectedWallet],
  );

  useEffect(() => {
    if (reasonTouched) {
      return;
    }

    setReason(
      generateMintReason({
        handle: selectedUser?.handle,
        walletAddress: selectedWallet || undefined,
        amount: Number.isFinite(Number(amount)) ? Number(amount) : undefined,
      }),
    );
  }, [selectedUser?.handle, selectedWallet, amount, reasonTouched]);

  async function loadUsers() {
    setLoadingUsers(true);
    const result = await getUsers();

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok) {
      const authMessage = getAdminAuthError(result.status, result.error, result.requiresAccessLogin);
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
      const authMessage = getAdminAuthError(result.status, result.error, result.requiresAccessLogin);
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
    if (authError) {
      setLoadingEvents(false);
      return;
    }

    loadEvents();
    const timer = window.setInterval(loadEvents, 15_000);
    return () => window.clearInterval(timer);
  }, [filterStatus, normalizedFilterWallet, authError]);

  async function handleIssueTokens(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mintSubmitLockRef.current) {
      return;
    }

    mintSubmitLockRef.current = true;
    setNotice(null);

    if (!isConnected) {
      setNotice({ tone: 'error', text: 'Connect wallet to perform admin actions.' });
      mintSubmitLockRef.current = false;
      return;
    }

    const normalizedAmount = amount.trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(normalizedAmount)) {
      setNotice({ tone: 'error', text: 'Amount must be a valid number with up to 6 decimal places.' });
      mintSubmitLockRef.current = false;
      return;
    }

    const parsedAmount = Number(normalizedAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000) {
      setNotice({ tone: 'error', text: 'Amount must be greater than 0 and at most 1000.' });
      mintSubmitLockRef.current = false;
      return;
    }

    if (!selectedWallet) {
      setNotice({ tone: 'error', text: 'Select a target wallet first.' });
      mintSubmitLockRef.current = false;
      return;
    }

    setIssuing(true);

    const requestKey = idempotencyKey.trim() || generateIdempotencyKey(selectedWallet, normalizedAmount);

    const finalReason =
      reason.trim() ||
      generateMintReason({
        handle: selectedUser?.handle,
        walletAddress: selectedWallet,
        amount: parsedAmount,
      });
    const taggedReason = `[${issueType}] ${finalReason}`.trim();

    if (!reason.trim()) {
      setReason(finalReason);
    }

    let result = await postMint({
      walletAddress: selectedWallet,
      amount: normalizedAmount,
      reason: taggedReason,
      idempotencyKey: requestKey,
    });

    if (
      !result.ok &&
      result.status === 409 &&
      !idempotencyKey.trim() &&
      (result.error || '').toLowerCase().includes('duplicate idempotencykey')
    ) {
      result = await postMint({
        walletAddress: selectedWallet,
        amount: normalizedAmount,
        idempotencyKey: generateIdempotencyKey(selectedWallet, normalizedAmount),
        reason: taggedReason,
      });
    }

    if (result.warning) {
      setWarning(result.warning);
    }

    if (!result.ok || !result.data?.ok) {
      setNotice({
        tone: 'error',
        text: formatMintFailure(result.error || result.data?.error, result.data?.failureStage),
      });
      setIssuing(false);
      mintSubmitLockRef.current = false;
      return;
    }

    setNotice({ tone: 'success', text: `Issued request queued (${result.data.eventId || 'unknown event'}).` });
    setIssuing(false);
    mintSubmitLockRef.current = false;
    setAmount('');
    setReason(generateMintReason());
    setReasonTouched(false);
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
              {authError === MISSING_HEADERS_ERROR ? (
                <div className="admin-auth-actions">
                  <a href={ACCESS_LOGIN_PATH} className="primary-cta">
                    COMPLETE ADMIN ACCESS
                  </a>
                </div>
              ) : null}
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
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.000000"
            required
          />

          <label htmlFor="reason">Note / Reason</label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonTouched(true);
            }}
            maxLength={120}
          />

          <label htmlFor="issueType">Issuance Type</label>
          <select id="issueType" value={issueType} onChange={(event) => setIssueType(event.target.value as IssueType)}>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

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
                      {event.failureStage || event.failureReason ? (
                        <div className="muted-text">
                          {event.failureStage ? `[${event.failureStage}] ` : ''}
                          {event.failureReason || ''}
                        </div>
                      ) : null}
                      <EventActionMenu
                        event={event}
                        updatingEventId={updatingEventId}
                        manualOverrideEnabled={manualOverrideEnabled}
                        manualTxHash={manualTxHash}
                        onUpdateStatus={updateStatus}
                      />
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
                {event.failureStage || event.failureReason ? (
                  <div className="event-card-row">
                    <span className="event-card-label">Failure</span>
                    <span className="event-card-value">
                      {event.failureStage ? `[${event.failureStage}] ` : ''}
                      {event.failureReason || ''}
                    </span>
                  </div>
                ) : null}
                <EventActionMenu
                  event={event}
                  updatingEventId={updatingEventId}
                  manualOverrideEnabled={manualOverrideEnabled}
                  manualTxHash={manualTxHash}
                  onUpdateStatus={updateStatus}
                />
              </div>
            ))
          )}
        </div>
      </DataPanel>
    </div>
  );
}
