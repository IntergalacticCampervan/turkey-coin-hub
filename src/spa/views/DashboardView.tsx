import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import DecryptedText from '../../components/DecryptedText';
import { getLeaderboardWithHeaders } from '../lib/api';
import type { LeaderboardEntry } from '../lib/types';
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

export function DashboardView() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadLeaderboard();
    const timer = window.setInterval(loadLeaderboard, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const totalSupply = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const parsed = Number.parseInt(row.balance || '0', 10);
        return sum + (Number.isNaN(parsed) ? 0 : parsed);
      }, 0),
    [rows],
  );

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <DecryptedText text="TURKEY COIN DASHBOARD" animateOn="view" sequential speed={40} />
          </h1>
          <TerminalText as="p" className="muted-text">
            LIVE LEADERBOARD + SYSTEM FEED
          </TerminalText>
        </div>
        <StatusBadge status="syncing">POLLING 30s</StatusBadge>
      </div>

      <section className="metrics-grid">
        <DataPanel status="active">
          <TerminalText className="metric-label">TOTAL SUPPLY</TerminalText>
          <div className="metric-value">{totalSupply.toLocaleString()}</div>
          <TerminalText className="metric-sub">TURKEY COIN</TerminalText>
        </DataPanel>

        <DataPanel status="active">
          <TerminalText className="metric-label">ACTIVE WALLETS</TerminalText>
          <div className="metric-value">{rows.length}</div>
          <TerminalText className="metric-sub">ENROLLED USERS</TerminalText>
        </DataPanel>

        <DataPanel status="syncing">
          <TerminalText className="metric-label">SYNC STATUS</TerminalText>
          <div className="metric-sub-row">
            <RefreshCw size={14} className="spin" />
            <TerminalText className="metric-sub">UPDATING</TerminalText>
          </div>
        </DataPanel>
      </section>

      <DataPanel title="[ LEADERBOARD ]">
        {loading ? <p className="muted-text">Loading leaderboard...</p> : null}
        {noDb ? <p className="warning-text">D1 is not configured in this runtime.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

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
                  <tr key={row.walletAddress}>
                    <td>#{index + 1}</td>
                    <td>{row.handle}</td>
                    <td>{shortWallet(row.walletAddress)}</td>
                    <td>{row.balance}</td>
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
              <div key={`mobile-${row.walletAddress}`} className="event-card">
                <div className="event-card-row">
                  <span className="event-card-label">Rank</span>
                  <span className="event-card-value">#{index + 1}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Handle</span>
                  <span className="event-card-value">{row.handle}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Wallet</span>
                  <span className="event-card-value">{row.walletAddress}</span>
                </div>
                <div className="event-card-row">
                  <span className="event-card-label">Balance</span>
                  <span className="event-card-value">{row.balance}</span>
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
    </div>
  );
}
