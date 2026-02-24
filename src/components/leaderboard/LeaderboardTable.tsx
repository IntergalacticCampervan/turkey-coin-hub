import { useEffect, useState } from 'react';

type LeaderboardEntry = {
  handle: string;
  walletAddress: string;
  balance: string;
  updatedAt: string;
};

function shortWallet(walletAddress: string): string {
  if (walletAddress.length < 12) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default function LeaderboardTable() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);

  async function load() {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setNoDb(response.headers.get('x-no-db') === 'true');
      const json = (await response.json()) as LeaderboardEntry[];
      setRows(Array.isArray(json) ? json : []);
      setError(null);
    } catch {
      setError('Failed to load leaderboard.');
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel">
      <h2>Leaderboard</h2>
      <p>Public, read-only balances. Refreshes every 30 seconds.</p>

      {noDb ? <p className="hint">D1 is not configured in this runtime; showing empty fallback data.</p> : null}
      {error ? <p className="msg err">{error}</p> : null}

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Handle</th>
            <th>Wallet</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>No records yet.</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.walletAddress}>
                <td>{index + 1}</td>
                <td>{row.handle}</td>
                <td>{shortWallet(row.walletAddress)}</td>
                <td>{row.balance}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
