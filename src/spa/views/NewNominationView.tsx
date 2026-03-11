import { useEffect, useState } from 'react';

import { DataPanel, TerminalText } from '../components/TerminalPrimitives';
import { NewNominationWizard } from '../components/NewNominationWizard';
import { getLeaderboardWithHeaders } from '../lib/api';
import type { LeaderboardEntry } from '../lib/types';

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

export function NewNominationView() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRoster = async () => {
      const result = await getLeaderboardWithHeaders();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error || 'Could not load crew roster');
        setLoading(false);
        return;
      }

      setRows(result.rows.map((row) => normalizeRow(row)).filter((row): row is LeaderboardEntry => row !== null));
      setError(null);
      setLoading(false);
    };

    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="view-grid">
        <DataPanel status="syncing">
          <TerminalText>LOADING CREW ROSTER...</TerminalText>
        </DataPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-grid">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return <NewNominationWizard roster={rows} />;
}
