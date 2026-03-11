import { useEffect, useState } from 'react';

import DecryptedText from '../../components/DecryptedText';
import { OpenNominationsBoard } from '../components/OpenNominationsBoard';
import { DataPanel, TerminalText } from '../components/TerminalPrimitives';
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

export function NominationsView() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRoster = async () => {
      const result = await getLeaderboardWithHeaders();
      if (cancelled) {
        return;
      }

      setNoDb(result.noDb);

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

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <DecryptedText text="TURKEY TRIBUNAL ARCADE" animateOn="view" sequential speed={40} />
          </h1>
          <TerminalText as="p" className="muted-text">
            NOMINATE REAL CONTRIBUTIONS. REQUIRE A SECOND. DELIVER JUSTIFIED TURKEY CHAOS.
          </TerminalText>
        </div>
      </div>

      <div className="tribunal-experimental-note">
        <TerminalText className="metric-label">EXPERIMENTAL TRIBUNAL PROTOCOL</TerminalText>
        <TerminalText as="p" className="muted-text">
          The High Gobbler Court is still testing its ceremonial machinery. Expect occasional turkey weirdness while the
          judges calibrate the gravy cannons.
        </TerminalText>
      </div>

      {loading ? (
        <DataPanel status="syncing">
          <TerminalText>LOADING CREW ROSTER...</TerminalText>
        </DataPanel>
      ) : null}

      {noDb ? <p className="warning-text">D1 is not configured in this runtime.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? <OpenNominationsBoard /> : null}
    </div>
  );
}
