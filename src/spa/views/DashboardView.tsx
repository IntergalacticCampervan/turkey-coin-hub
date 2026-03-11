import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import DecryptedText from '../../components/DecryptedText';
import GlitchText from '../../components/GlitchText';
import { getLeaderboardWithHeaders, getRecentMints, getStatus, getTokenStats } from '../lib/api';
import type { LeaderboardEntry, RecentMintEntry, StatusResponse, TokenStatsResponse } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

function normalizeRow(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const handle = String(value.handle ?? '').trim();
  const walletAddress = String(value.walletAddress ?? '').trim();
  const balance = String(value.balance ?? '0').trim();
  const updatedAt = String(value.updatedAt ?? '').trim();

  if (!handle || !walletAddress) {
    return null;
  }

  return { handle, walletAddress, balance, updatedAt };
}

function formatDateSafe(input: string): string {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatPrompt(label: string): string {
  const head = `> ${label}`;
  if (head.length >= 24) {
    return head;
  }

  return `${head}${'.'.repeat(24 - head.length)}`;
}

const TURKEY_TERMINAL_SUBJECTS = [
  'INTERGALACTIC LUNCHBOX',
  'COSMIC COOP',
  'FARMHOUSE ORBIT',
  'TURKEY NETWORK',
  'MISSION CREW',
  'WALLET CHOIR',
  'BARNOSPHERE NODE',
  'GRAVITY FEED',
];

const TURKEY_TERMINAL_ACTIONS = [
  'BLESSES',
  'CHRISTENS',
  'UPLINKS',
  'CALIBRATES',
  'VALIDATES',
  'ELEVATES',
  'ANOINTS',
  'GREENLIGHTS',
];

const TURKEY_TERMINAL_TARGETS = [
  'TOKEN ROUTE',
  'REWARD PIPELINE',
  'MISSION LEDGER',
  'WALLET RITUAL',
  'FLOCK CONSENSUS',
  'SIGNAL BEACON',
  'ORBITAL TREASURY',
  'CHAIN RELAY',
];

function randomInt(max: number): number {
  if (max <= 0) {
    return 0;
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1);
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function createFillerTerminalLine() {
  const subject = TURKEY_TERMINAL_SUBJECTS[randomInt(TURKEY_TERMINAL_SUBJECTS.length)];
  const action = TURKEY_TERMINAL_ACTIONS[randomInt(TURKEY_TERMINAL_ACTIONS.length)];
  const target = TURKEY_TERMINAL_TARGETS[randomInt(TURKEY_TERMINAL_TARGETS.length)];

  return {
    label: 'TURKEY LOG',
    value: `${subject} ${action} ${target}`,
  };
}

type TerminalLine = {
  id: string;
  label: string;
  value: string;
  resolved: boolean;
};

const MAX_TERMINAL_LINES = 6;
const TOP_RANK_TITLE = 'HIGH GOBBLER';

export function DashboardView() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [recentMints, setRecentMints] = useState<RecentMintEntry[]>([]);
  const [statusSnapshot, setStatusSnapshot] = useState<StatusResponse | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const inFlightRef = useRef({
    leaderboard: false,
    recent: false,
    status: false,
    tokenStats: false,
  });

  async function runWithInFlightGuard(key: keyof typeof inFlightRef.current, fn: () => Promise<void>) {
    if (inFlightRef.current[key]) {
      return;
    }

    inFlightRef.current[key] = true;
    try {
      await fn();
    } finally {
      inFlightRef.current[key] = false;
    }
  }

  async function loadLeaderboard() {
    const result = await getLeaderboardWithHeaders();
    setNoDb(result.noDb);

    if (!result.ok) {
      setError(result.error || 'Could not load leaderboard');
      setLoading(false);
      return;
    }

    const normalizedRows = result.rows
      .map((row) => normalizeRow(row))
      .filter((row): row is LeaderboardEntry => row !== null);

    setRows(normalizedRows);
    setError(null);
    setLoading(false);
  }

  async function loadRecentMints() {
    const result = await getRecentMints();

    if (!result.ok || !result.data) {
      setRecentError(result.error || 'Could not load recent mint activity');
      setLoadingRecent(false);
      return;
    }

    setRecentMints(result.data);
    setRecentError(null);
    setLoadingRecent(false);
  }

  async function loadStatusSnapshot() {
    const result = await getStatus();
    if (!result.ok || !result.data) {
      setStatusError(result.error || 'Could not load /api/status');
      return;
    }

    setStatusSnapshot(result.data);
    setStatusError(null);
  }

  async function loadTokenStats() {
    const result = await getTokenStats();
    if (!result.ok || !result.data) {
      setTokenError(result.error || 'Could not load /api/token-stats');
      return;
    }

    setTokenStats(result.data);
    setTokenError(null);
  }

  useEffect(() => {
    const pollAll = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void runWithInFlightGuard('leaderboard', loadLeaderboard);
      void runWithInFlightGuard('recent', loadRecentMints);
      void runWithInFlightGuard('status', loadStatusSnapshot);
      void runWithInFlightGuard('tokenStats', loadTokenStats);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollAll();
      }
    };

    pollAll();
    const timer = window.setInterval(pollAll, 30_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const statusCoreLines = useMemo(() => {
    if (statusError) {
      return [
        { label: 'API STATUS', value: 'ERROR' },
        { label: 'DETAIL', value: statusError },
      ];
    }

    if (!statusSnapshot) {
      return [{ label: 'API STATUS', value: 'CHECKING' }];
    }

    return [
      { label: 'API STATUS', value: statusSnapshot.ok ? 'OK' : 'ERROR' },
      { label: 'D1 BINDING', value: statusSnapshot.hasD1 ? 'PRESENT' : 'MISSING' },
      { label: 'D1 PING', value: statusSnapshot.d1Ping ? 'OK' : 'FAILED' },
      { label: 'CHAIN', value: `${statusSnapshot.chain.name} (${statusSnapshot.chain.id})` },
      { label: 'ONCHAIN MINT', value: statusSnapshot.onchain.configured ? 'CONFIGURED' : 'OFFLINE' },
      {
        label: 'SIGNER KEY',
        value: statusSnapshot.onchain.privateKeyValid ? 'VALID' : 'INVALID',
      },
      { label: 'ALLOWLIST', value: statusSnapshot.adminAllowlistConfigured ? 'ON' : 'OFF' },
      { label: 'ACCESS JWT', value: statusSnapshot.accessJwtConfigured ? 'ON' : 'OFF' },
    ];
  }, [statusError, statusSnapshot]);

  useEffect(() => {
    let cancelled = false;

    const runLoop = async () => {
      setTerminalLines([]);
      while (!cancelled) {
        const loopLines = [...statusCoreLines, createFillerTerminalLine(), createFillerTerminalLine()];
        for (let index = 0; index < loopLines.length; index += 1) {
          if (cancelled) {
            return;
          }

          const line = loopLines[index];
          const lineId = `${Date.now()}-${index}-${Math.random().toString(16).slice(2, 7)}`;
          setTerminalLines((prev) =>
            [...prev, { id: lineId, label: line.label, value: line.value, resolved: false }].slice(-MAX_TERMINAL_LINES),
          );
          await sleep(220);

          if (cancelled) {
            return;
          }

          setTerminalLines((prev) =>
            prev.map((entry) => (entry.id === lineId ? { ...entry, resolved: true } : entry)),
          );
          await sleep(420);
        }

        await sleep(900);
      }
    };

    void runLoop();

    return () => {
      cancelled = true;
    };
  }, [statusCoreLines]);

  const topRankRow = rows[0] ?? null;

  function statusLabel(status: RecentMintEntry['status']) {
    if (status === 'failed') {
      return 'FAILED';
    }

    if (status === 'confirmed') {
      return 'ISSUED';
    }

    if (status === 'submitted') {
      return 'SUBMITTED';
    }

    return 'QUEUED';
  }

  function parseIssueType(reason: string): { type: string | null; reason: string } {
    const trimmed = reason.trim();
    const match = trimmed.match(/^\[([A-Z0-9_-]{3,16})\]\s*(.+)$/);
    if (!match) {
      return { type: null, reason };
    }

    return { type: match[1], reason: match[2] };
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <DecryptedText text="TURKEY COIN MISSION CONTROL" animateOn="view" sequential speed={40} />
          </h1>
          <TerminalText as="p" className="muted-text">
            LIVE LEADERBOARD + SYSTEM FEED
          </TerminalText>
        </div>
        <StatusBadge status="syncing">POLLING 30s</StatusBadge>
      </div>

      <section className="kpi-strip">
        <DataPanel status="active" className="kpi-chip">
          <TerminalText className="metric-label">TOTAL SUPPLY</TerminalText>
          <div className="kpi-chip-value">{tokenStats?.totalSupply ?? '--'}</div>
          <TerminalText className="metric-sub">TC</TerminalText>
        </DataPanel>

        <DataPanel status="active" className="kpi-chip">
          <TerminalText className="metric-label">ACTIVE WALLETS</TerminalText>
          <div className="kpi-chip-value">{rows.length}</div>
          <TerminalText className="metric-sub">ENROLLED</TerminalText>
        </DataPanel>

        <DataPanel status="active" className="kpi-chip">
          <TerminalText className="metric-label">TOTAL TRANSFERS</TerminalText>
          <div className="kpi-chip-value">{tokenStats?.totalTransfers?.toLocaleString() ?? '--'}</div>
          <TerminalText className="metric-sub">ON-CHAIN</TerminalText>
        </DataPanel>
      </section>

      {tokenError ? <p className="warning-text">{tokenError}</p> : null}
      <section className="terminal-card-wrap">
        <Link to="/status" className="terminal-nav-link" aria-label="Open full status page">
        <DataPanel status="syncing" className="sync-status-panel terminal-card">
          <TerminalText className="metric-label">TERMINAL</TerminalText>
          <div className="sync-terminal" role="status" aria-live="polite">
            {terminalLines.map((line) => {
              return (
                <div className="sync-terminal-line" key={line.id}>
                  <span className="sync-terminal-label">{formatPrompt(line.label)}</span>
                  <span className={`sync-terminal-value ${line.resolved ? 'ready' : 'pending'}`}>
                    {line.resolved ? line.value : '...'}
                  </span>
                </div>
              );
            })}
          </div>
        </DataPanel>
        </Link>
      </section>

      <DataPanel title="[ LEADERBOARD ]">
        {loading ? <p className="muted-text">Loading leaderboard...</p> : null}
        {noDb ? <p className="warning-text">D1 is not configured in this runtime.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {topRankRow ? (
          <div className="leaderboard-emperor-card">
            <div className="leaderboard-emperor-header">
              <TerminalText className="leaderboard-emperor-kicker">EMPEROR&apos;S FAVOR</TerminalText>
              <span className="leaderboard-title-chip">{TOP_RANK_TITLE}</span>
            </div>
            <div className="leaderboard-emperor-grid">
              <div className="leaderboard-emperor-identity">
                <TerminalText className="metric-label">CURRENTLY RULED BY</TerminalText>
                <div className="leaderboard-emperor-handle">
                  <GlitchText as="span" className="leaderboard-handle-glitch">
                    @{topRankRow.handle}
                  </GlitchText>
                </div>
                <TerminalText className="muted-text">Wallet {shortWallet(topRankRow.walletAddress)}</TerminalText>
              </div>
              <div className="leaderboard-emperor-stat">
                <TerminalText className="metric-label">BALANCE</TerminalText>
                <div className="leaderboard-emperor-balance">{topRankRow.balance} TC</div>
              </div>
              <div className="leaderboard-emperor-stat">
                <TerminalText className="metric-label">REIGNING SINCE</TerminalText>
                <div className="leaderboard-emperor-updated">{formatDateSafe(topRankRow.updatedAt)}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Handle</th>
                <th>Wallet</th>
                <th>Balance</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No leaderboard rows yet.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.walletAddress} className={index === 0 ? 'leaderboard-top-row' : undefined}>
                    <td>#{index + 1}</td>
                    <td className={index === 0 ? 'leaderboard-top-handle' : undefined}>
                      <div className="leaderboard-handle-cell">
                        {index === 0 ? (
                          <>
                            <GlitchText as="span" className="leaderboard-handle-glitch">
                              {row.handle}
                            </GlitchText>
                            <span className="leaderboard-title-chip">{TOP_RANK_TITLE}</span>
                          </>
                        ) : (
                          row.handle
                        )}
                      </div>
                    </td>
                    <td>{shortWallet(row.walletAddress)}</td>
                    <td className={index === 0 ? 'leaderboard-top-balance' : undefined}>{row.balance}</td>
                    <td>{formatDateSafe(row.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="event-cards">
          {rows.length === 0 ? (
            <p className="muted-text">No leaderboard rows yet.</p>
          ) : (
            rows.map((row, index) => (
              <div
                key={`mobile-${row.walletAddress}`}
                className={`event-card ${index === 0 ? 'leaderboard-top-card' : ''}`}
              >
                <div className="event-card-row">
                  <span className="event-card-label">Rank</span>
                  <span className="event-card-value">#{index + 1}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Handle</span>
                  <span className={`event-card-value ${index === 0 ? 'leaderboard-top-handle' : ''}`}>
                    <span className="leaderboard-handle-cell">
                      {index === 0 ? (
                        <>
                          <GlitchText as="span" className="leaderboard-handle-glitch">
                            {row.handle}
                          </GlitchText>
                          <span className="leaderboard-title-chip">{TOP_RANK_TITLE}</span>
                        </>
                      ) : (
                        row.handle
                      )}
                    </span>
                  </span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Wallet</span>
                  <span className="event-card-value">{row.walletAddress}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Balance</span>
                  <span className={`event-card-value ${index === 0 ? 'leaderboard-top-balance' : ''}`}>{row.balance}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Updated</span>
                  <span className="event-card-value">{formatDateSafe(row.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </DataPanel>

      <DataPanel title="[ RECENT TRANSACTIONS ]">
        {loadingRecent ? <p className="muted-text">Loading recent mint activity...</p> : null}
        {recentError ? <p className="error-text">{recentError}</p> : null}

        <div className="transaction-feed">
          {recentMints.length === 0 ? (
            <p className="muted-text">No recent mint activity yet.</p>
          ) : (
            recentMints.map((entry) => {
              const parsed = parseIssueType(entry.reason);
              const badgeLabel = entry.status === 'confirmed' ? parsed.type || 'ISSUED' : statusLabel(entry.status);
              const badgeClass = entry.status === 'confirmed' && parsed.type ? `issue-${parsed.type.toLowerCase()}` : '';

              return (
                <article key={entry.id} className="transaction-row">
                  <div className="transaction-main">
                    <div className="transaction-meta">
                      <span>{formatDateSafe(entry.createdAt)}</span>
                      <span className={`transaction-chip status-${entry.status} ${badgeClass}`.trim()}>{badgeLabel}</span>
                    </div>
                    <div className="transaction-title">{entry.handle}</div>
                    <TerminalText as="p" className="muted-text transaction-reason">
                      {entry.status === 'confirmed' ? parsed.reason : entry.reason}
                    </TerminalText>
                  </div>
                  <div className="transaction-amount">+{entry.amount} TC</div>
                </article>
              );
            })
          )}
        </div>
      </DataPanel>
    </div>
  );
}
