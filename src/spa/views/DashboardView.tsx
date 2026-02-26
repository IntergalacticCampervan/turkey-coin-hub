import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getLeaderboardWithHeaders } from '../lib/api';
import type { LeaderboardEntry } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

function shortWallet(wallet: string) {
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

    setRows(result.rows);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    loadLeaderboard();
    const timer = window.setInterval(loadLeaderboard, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const totalSupply = useMemo(
    () => rows.reduce((sum, row) => sum + Number.parseInt(row.balance || '0', 10), 0),
    [rows],
  );

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">TURKEY COIN DASHBOARD</h1>
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

        <div className="table-wrap">
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
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </div>
  );
}
