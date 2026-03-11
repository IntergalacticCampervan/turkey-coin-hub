import { TimerReset, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

import { getNominations, postNominationSecond } from '../lib/api';
import { formatDateSafe, nominationStatusLabel, nominationStatusTone, normalizeWallet } from '../lib/nominationUi';
import type { NominationEntry } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from './TerminalPrimitives';

export function OpenNominationsBoard() {
  const { address } = useAccount();
  const currentWallet = normalizeWallet(address);
  const [nominations, setNominations] = useState<NominationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const nominationsInFlightRef = useRef(false);

  const openNominations = useMemo(
    () => nominations.filter((entry) => entry.status === 'awaiting_second' || entry.status === 'processing'),
    [nominations],
  );

  const pendingSecondActions = useMemo(
    () =>
      openNominations.filter((entry) => {
        const ownNomination = currentWallet === normalizeWallet(entry.nominatorWalletAddress);
        const ownWalletIsNominee = currentWallet === normalizeWallet(entry.nomineeWalletAddress);
        return entry.status === 'awaiting_second' && !ownNomination && !ownWalletIsNominee;
      }),
    [currentWallet, openNominations],
  );

  async function loadNominations() {
    if (nominationsInFlightRef.current) {
      return;
    }

    nominationsInFlightRef.current = true;
    const result = await getNominations();
    try {
      if (!result.ok || !result.data) {
        setError(result.error || 'Could not load open nominations');
        setLoading(false);
        return;
      }

      setNominations(result.data);
      setError(null);
      setLoading(false);
    } finally {
      nominationsInFlightRef.current = false;
    }
  }

  useEffect(() => {
    void loadNominations();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNominations();
      }
    }, 20_000);

    return () => window.clearInterval(timer);
  }, []);

  async function secondNomination(nominationId: string) {
    if (!currentWallet) {
      setError('Connect the enrolled wallet before seconding.');
      return;
    }

    setBusyId(nominationId);
    setError(null);
    setStatusMessage(null);

    try {
      const result = await postNominationSecond({
        nominationId,
        seconderWalletAddress: currentWallet,
      });

      if (!result.ok || !result.data?.ok) {
        setError(result.error || result.data?.error || 'Seconding failed');
        return;
      }

      setStatusMessage(
        result.data.status === 'minted'
          ? 'Second accepted. Reward minted into the turkeyverse.'
          : 'Second accepted. Reward convoy sent toward mint processing.',
      );
      await loadNominations();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="view-grid">
      <div className="nomination-board-layout">
        <DataPanel title="[ CURRENT OPEN NOMINATIONS ]" status="active" className="nomination-arcade-panel">
          <div className="nomination-arcade-head">
            <div>
              <h2 className="nomination-arcade-title">CURRENT OPEN NOMINATIONS</h2>
              <TerminalText as="p" className="muted-text">
                Review active tribunal cases, second real contributions, or launch a fresh poultry hearing.
              </TerminalText>
            </div>
            <div className="nomination-arcade-badges">
              <StatusBadge status="syncing">{openNominations.length} OPEN CASES</StatusBadge>
            </div>
          </div>

          {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          {loading ? <p className="muted-text">Loading tribunal board...</p> : null}

          <div className="pending-tribunal-strip">
            <div className="pending-tribunal-head">
              <TerminalText className="metric-label">AWAITING YOUR SECOND</TerminalText>
              <StatusBadge status="syncing">{pendingSecondActions.length} READY FOR REVIEW</StatusBadge>
            </div>
            {pendingSecondActions.length === 0 ? (
              <p className="muted-text">No pending second requests are actionable for this wallet right now.</p>
            ) : (
              <div className="pending-tribunal-list">
                {pendingSecondActions.map((entry) => (
                  <article key={`pending-${entry.id}`} className="pending-tribunal-card">
                    <div className="pending-tribunal-copy">
                      <div className="pending-tribunal-target">@{entry.nomineeHandle}</div>
                      <p className="pending-tribunal-reason">{entry.reason}</p>
                      <TerminalText className="muted-text">
                        Filed by @{entry.nominatorHandle} for {entry.amount} TC
                      </TerminalText>
                    </div>
                    <button
                      type="button"
                      className="tribunal-second-btn"
                      disabled={busyId === entry.id}
                      onClick={() => secondNomination(entry.id)}
                    >
                      {busyId === entry.id ? 'SECONDING...' : 'SECOND THIS ABSURDITY'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="tribunal-feed">
            {openNominations.length === 0 ? (
              <p className="muted-text">No open nominations on the board. Launch the next hearing.</p>
            ) : (
              openNominations.map((entry) => {
                const ownNomination = currentWallet === normalizeWallet(entry.nominatorWalletAddress);
                const ownWalletIsNominee = currentWallet === normalizeWallet(entry.nomineeWalletAddress);
                const canSecond = entry.status === 'awaiting_second' && !ownNomination && !ownWalletIsNominee;

                return (
                  <article key={entry.id} className={`tribunal-card status-${entry.status}`}>
                    <div className="tribunal-card-top">
                      <div>
                        <TerminalText className="metric-label">
                          {entry.status === 'awaiting_second' ? 'PENDING TRIBUNAL' : 'IN FLIGHT'}
                        </TerminalText>
                        <div className="tribunal-target">@{entry.nomineeHandle}</div>
                      </div>
                      <StatusBadge status={nominationStatusTone(entry.status)}>{nominationStatusLabel(entry.status)}</StatusBadge>
                    </div>

                    <div className="tribunal-callout">
                      <TerminalText className="tribunal-callout-title">WHY THIS GOBBLER?</TerminalText>
                      <p className="tribunal-callout-copy">{entry.reason}</p>
                    </div>

                    <div className="tribunal-card-grid">
                      <div className="tribunal-line">
                        <Zap size={15} />
                        <span>{entry.rewardLabel}</span>
                        <strong>{entry.amount} TC</strong>
                      </div>
                      <div className="tribunal-line">
                        <TimerReset size={15} />
                        <span>Filed by @{entry.nominatorHandle}</span>
                        <strong>{formatDateSafe(entry.createdAt)}</strong>
                      </div>
                    </div>

                    <div className="tribunal-meta-strip">
                      <span className="tribunal-meta-chip">NOMINATOR: @{entry.nominatorHandle}</span>
                      <span className="tribunal-meta-chip">NOMINEE: @{entry.nomineeHandle}</span>
                      <span className="tribunal-meta-chip">REWARD: {entry.amount} TC</span>
                    </div>

                    <div className="tribunal-card-actions">
                      <TerminalText className="muted-text">
                        {entry.seconderHandle
                          ? `Seconded by @${entry.seconderHandle}`
                          : entry.status === 'awaiting_second'
                            ? 'No second locked in yet. Review the reason above and confirm the chaos.'
                            : 'Nomination is being processed for mint dispatch.'}
                      </TerminalText>
                      {canSecond ? (
                        <button
                          type="button"
                          className="tribunal-second-btn"
                          disabled={busyId === entry.id}
                          onClick={() => secondNomination(entry.id)}
                        >
                          {busyId === entry.id ? 'SECONDING...' : 'SECOND THIS ABSURDITY'}
                        </button>
                      ) : ownNomination && entry.status === 'awaiting_second' ? (
                        <TerminalText className="muted-text">Your filing is waiting for an unbiased gobbler.</TerminalText>
                      ) : ownWalletIsNominee && entry.status === 'awaiting_second' ? (
                        <TerminalText className="muted-text">You cannot second your own legend.</TerminalText>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </DataPanel>

        <DataPanel title="[ START A NEW NOMINATION ]" status="syncing" className="nomination-route-panel">
          <div className="nomination-route-panel-copy">
            <h2 className="nomination-arcade-title">START A NEW NOMINATION</h2>
            <TerminalText as="p" className="muted-text">
              Enter the full-screen tribunal stepper to choose a gobbler, assign the reward tier, and write the work lore.
            </TerminalText>
          </div>
          <Link to="/nominations/new" className="nomination-route-btn large">
            OPEN NOMINATION STEPPER
          </Link>
        </DataPanel>
      </div>
    </div>
  );
}
