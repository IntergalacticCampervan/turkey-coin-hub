import { AlertTriangle, RotateCw, Sparkles, Send, Disc3, Maximize, Minimize } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAccount } from 'wagmi';

import DecryptedText from '../../components/DecryptedText';
import GlitchText from '../../components/GlitchText';
import { getLeaderboardWithHeaders, postWheelSpin } from '../lib/api';
import type { LeaderboardEntry } from '../lib/types';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type WheelEntrant = LeaderboardEntry & {
  label: string;
  accent: string;
  textColor: string;
};

type Notice = { tone: 'success' | 'error'; text: string } | null;
const STANDUP_REWARD_AMOUNT = '10';
const WHEEL_REASON_PREFIX = '[WHEEL]';
const WHEEL_SEGMENT_START_DEG = -180; // starting orientation for first segment (top-left placement)
const WHEEL_SPIN_ALIGNMENT_OFFSET = WHEEL_SEGMENT_START_DEG + 90; // normalizes to top-origin math in spin alignment
const WHEEL_LABEL_RADIUS_PERCENT = 25;

const WHEEL_FANFARE = [
  'THE STANDUP DRUMSTICK HAS CHOSEN',
  'COSMIC POULTRY ORDINANCE SELECTS',
  'THE ROAST MATRIX CROWNS',
  'THE GOBBLER ENGINE APPOINTS',
  'WHEEL OF TURKEY DESTINY ELECTS',
];
const SEGMENT_ACCENTS = ['#ff9c32', '#3ff5df', '#ff4d6d', '#ffe066', '#7ce577', '#9b5de5'];
const SEGMENT_TEXT_COLORS = ['#1b1207', '#102227', '#fff5e8', '#211403', '#11210d', '#fff2fd'];

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

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

function secureRandomIndex(length: number): number {
  if (length <= 1) {
    return 0;
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const limit = Math.floor(0x1_0000_0000 / length) * length;
    const buffer = new Uint32Array(1);
    let value = 0;

    do {
      cryptoApi.getRandomValues(buffer);
      value = buffer[0] ?? 0;
    } while (value >= limit);

    return value % length;
  }

  return Math.floor(Math.random() * length);
}

function randomFanfare(handle: string): string {
  return `${WHEEL_FANFARE[secureRandomIndex(WHEEL_FANFARE.length)]} @${handle}`;
}

function generateIdempotencyKey(walletAddress: string, amount: string): string {
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `wheel-${walletAddress}-${amount}-${uniquePart}`;
}

function buildWheelGradient(entries: WheelEntrant[]): string {
  if (entries.length === 0) {
    return `conic-gradient(from ${WHEEL_SEGMENT_START_DEG}deg, rgba(255, 163, 58, 0.75), rgba(63, 245, 223, 0.55), rgba(255, 163, 58, 0.75))`;
  }

  const segmentSize = 360 / entries.length;
  const stops = entries.flatMap((entry, index) => {
    const start = index * segmentSize;
    const end = start + segmentSize;
    return [
      `${entry.accent} ${start.toFixed(3)}deg`,
      `${entry.accent} ${end.toFixed(3)}deg`,
    ];
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

export function TurkeyWheelView() {
  const { address, isConnected } = useAccount();
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const [entrants, setEntrants] = useState<WheelEntrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [readyToIssue, setReadyToIssue] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [winnerLine, setWinnerLine] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const spinTimerRef = useRef<number | null>(null);
  const celebrateTimerRef = useRef<number | null>(null);
  const issueLockRef = useRef(false);

  const wheelGradient = useMemo(() => buildWheelGradient(entrants), [entrants]);
  const segmentSize = entrants.length > 0 ? 360 / entrants.length : 360;
  const winner = winnerIndex !== null ? entrants[winnerIndex] ?? null : null;
  const labelWidth = Math.max(50, Math.min(138, Math.round(420 / Math.max(entrants.length, 1))));
  const labelFontSize = Math.max(0.56, Math.min(0.96, 1.12 - entrants.length * 0.016));

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) {
        window.clearTimeout(spinTimerRef.current);
      }
      if (celebrateTimerRef.current !== null) {
        window.clearTimeout(celebrateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEntrants = async () => {
      setLoading(true);
      const result = await getLeaderboardWithHeaders();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setEntrants([]);
        setLoadError(result.error || 'Could not load wheel roster.');
        setLoading(false);
        return;
      }

      const rows = result.rows
        .map((row) => normalizeRow(row))
        .filter((row): row is LeaderboardEntry => row !== null)
        .map((row, index) => ({
          ...row,
          label: `@${row.handle}`,
          accent: SEGMENT_ACCENTS[index % SEGMENT_ACCENTS.length] ?? SEGMENT_ACCENTS[0],
          textColor: SEGMENT_TEXT_COLORS[index % SEGMENT_TEXT_COLORS.length] ?? '#fff5e8',
        }));

      setEntrants(rows);
      setLoadError(null);
      setLoading(false);
      setWinnerIndex((current) => (current !== null && current < rows.length ? current : null));
    };

    void loadEntrants();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !spinning) {
        void loadEntrants();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [spinning]);

  function startCelebration() {
    setCelebrate(true);
    if (celebrateTimerRef.current !== null) {
      window.clearTimeout(celebrateTimerRef.current);
    }
    celebrateTimerRef.current = window.setTimeout(() => setCelebrate(false), 4200);
  }

  function spinWheel() {
    if (spinning || entrants.length === 0) {
      return;
    }

    const chosenIndex = secureRandomIndex(entrants.length);
    const centerAngle = ((chosenIndex + 0.5) * segmentSize + WHEEL_SPIN_ALIGNMENT_OFFSET + 360) % 360;
    const normalizedCurrent = ((rotation % 360) + 360) % 360;
    const alignmentDelta = (360 - centerAngle - normalizedCurrent + 360) % 360;
    const extraTurns = 360 * (6 + secureRandomIndex(4));
    const nextRotation = rotation + extraTurns + alignmentDelta;

    setNotice(null);
    setSpinning(true);
    setReadyToIssue(false);
    setCelebrate(false);
    setWinnerIndex(null);
    setWinnerLine(null);
    setSpinCount((count) => count + 1);
    setRotation(nextRotation);

    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
    }

    spinTimerRef.current = window.setTimeout(() => {
      setWinnerLine(randomFanfare(entrants[chosenIndex]?.handle || 'mystery-turkey'));
      setWinnerIndex(chosenIndex);
      setReadyToIssue(true);
      setSpinning(false);
      startCelebration();
    }, 6100);
  }

  async function confirmIssue() {
    if (!winner || issueLockRef.current) {
      return;
    }

    issueLockRef.current = true;
    setNotice(null);

    if (!isConnected) {
      setNotice({ tone: 'error', text: 'Connect a wallet before issuing the standup bounty.' });
      issueLockRef.current = false;
      return;
    }

    setIssuing(true);
    const result = await postWheelSpin({
      winnerWalletAddress: winner.walletAddress,
      requesterWalletAddress: address || '',
      idempotencyKey: generateIdempotencyKey(winner.walletAddress, STANDUP_REWARD_AMOUNT),
    });

    if (!result.ok || !result.data?.ok) {
      setNotice({ tone: 'error', text: result.error || result.data?.error || 'Wheel approval request failed.' });
      setIssuing(false);
      issueLockRef.current = false;
      return;
    }

    setNotice({ tone: 'success', text: `Wheel result submitted for admin approval. Event ${result.data.eventId || 'pending'}.` });
    setIssuing(false);
    setReadyToIssue(false);
    issueLockRef.current = false;
  }

  async function toggleFullscreen() {
    const root = fullscreenRootRef.current;
    if (!root) {
      return;
    }

    if (document.fullscreenElement === root) {
      await document.exitFullscreen();
      return;
    }

    await root.requestFullscreen();
  }

  return (
    <div ref={fullscreenRootRef} className={`view-grid turkey-wheel-root ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="view-header">
        <div>
          <h1 className="view-title turkey-wheel-title">
            <Disc3 size={26} />
            <DecryptedText text="TURKEY WHEEL OF FATE" animateOn="view" sequential speed={38} />
          </h1>
          <TerminalText as="p" className="muted-text">
            SPIN THE FLOCK. CROWN THE STANDUP HOST. SEND THE RESULT TO ADMIN FOR APPROVAL.
          </TerminalText>
        </div>
        <div className="turkey-wheel-header-actions">
          <button type="button" className="turkey-wheel-fullscreen-btn" onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
          </button>
          <StatusBadge status={spinning ? 'syncing' : readyToIssue ? 'alert' : 'online'}>
            {spinning ? 'SPINNING' : readyToIssue ? 'WINNER LOCKED' : 'WHEEL ARMED'}
          </StatusBadge>
        </div>
      </div>

      <section className="kpi-strip turkey-wheel-kpis">
        <DataPanel status="active" className="kpi-chip">
          <TerminalText className="metric-label">ROSTER</TerminalText>
          <div className="kpi-chip-value">{entrants.length}</div>
          <TerminalText className="metric-sub">WALLETS</TerminalText>
        </DataPanel>
        <DataPanel status="alert" className="kpi-chip">
          <TerminalText className="metric-label">APPROVAL MODE</TerminalText>
          <div className="kpi-chip-value turkey-wheel-admin-chip">
            HUMAN
          </div>
          <TerminalText className="metric-sub">ADMIN REQUIRED</TerminalText>
        </DataPanel>
        <DataPanel status="active" className="kpi-chip">
          <TerminalText className="metric-label">SPINS TODAY</TerminalText>
          <div className="kpi-chip-value">{spinCount}</div>
          <TerminalText className="metric-sub">CHAOS EVENTS</TerminalText>
        </DataPanel>
      </section>

      {loadError ? <p className="error-text">{loadError}</p> : null}
      {notice ? <p className={notice.tone === 'success' ? 'success-text' : 'error-text'}>{notice.text}</p> : null}

      <DataPanel status="alert" className="warning-panel">
        <div className="warning-row">
          <AlertTriangle size={18} />
          <div>
            <TerminalText className="terminal-text glow">PUBLIC SPINS, HUMAN APPROVAL</TerminalText>
            <TerminalText as="p" className="muted-text">
              Anyone on the roster can spin. Confirming the result creates an `approval_pending` entry in the admin issuance log.
            </TerminalText>
          </div>
        </div>
      </DataPanel>

      <section className="turkey-wheel-layout">
        <DataPanel title="[ STANDUP ORDINANCE ENGINE ]" status={spinning ? 'syncing' : 'active'} className="turkey-wheel-panel">
          <div className={`turkey-wheel-stage ${spinning ? 'is-spinning' : ''} ${celebrate ? 'is-celebrating' : ''}`}>
            <div className="turkey-wheel-pointer" aria-hidden="true" />
            <button
              type="button"
              className="turkey-wheel-disc-button"
              onClick={spinWheel}
              disabled={loading || entrants.length === 0 || spinning}
              aria-label={spinning ? 'Wheel spinning' : 'Spin the standup selection wheel'}
            >
              <div
                className="turkey-wheel-disc"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  backgroundImage: `${wheelGradient}, radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 52%)`,
                }}
                aria-hidden="true"
              >
                <div className="turkey-wheel-disc-inner">
                  {entrants.map((entrant, index) => {
                    const angle = index * segmentSize + segmentSize / 2 + WHEEL_SEGMENT_START_DEG;
                    const radians = (angle * Math.PI) / 180;
                    const labelX = 50 + Math.cos(radians) * WHEEL_LABEL_RADIUS_PERCENT;
                    const labelY = 50 + Math.sin(radians) * WHEEL_LABEL_RADIUS_PERCENT;
                    const active = winner?.walletAddress === entrant.walletAddress;
                    return (
                      <div
                        key={entrant.walletAddress}
                        className={`turkey-wheel-segment-label ${active ? 'is-winner' : ''}`}
                        style={
                          {
                            '--wheel-label-x': `${labelX}%`,
                            '--wheel-label-y': `${labelY}%`,
                            '--wheel-label-width': `${labelWidth}px`,
                            '--wheel-label-font-size': `${labelFontSize}rem`,
                            '--wheel-label-color': entrant.textColor,
                            '--wheel-label-rotation': `${angle}deg`,
                          } as CSSProperties
                        }
                      >
                        <span>{entrant.label}</span>
                      </div>
                    );
                  })}
                  <div className="turkey-wheel-hub">
                    <img src="/Turkeycoin.svg" alt="" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </button>

            {celebrate ? (
              <div className="turkey-wheel-confetti" aria-hidden="true">
                {Array.from({ length: 28 }, (_, index) => (
                  <span
                    key={index}
                    className="turkey-wheel-confetti-piece"
                    style={
                      {
                        '--piece-color': SEGMENT_ACCENTS[index % SEGMENT_ACCENTS.length],
                        '--piece-left': `${(index / 27) * 100}%`,
                        '--piece-delay': `${(index % 7) * 45}ms`,
                        '--piece-rotate': `${(index % 2 === 0 ? 1 : -1) * (80 + index * 7)}deg`,
                        '--piece-drift': `${((index % 5) - 2) * 1.7}rem`,
                        '--piece-duration': `${1400 + (index % 6) * 180}ms`,
                        '--piece-size': `${0.38 + (index % 4) * 0.12}rem`,
                        '--piece-height': `${0.9 + (index % 5) * 0.28}rem`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
          <TerminalText className="muted-text turkey-wheel-stage-help">
            Click the wheel to spin. Uses `crypto.getRandomValues()` when available.
          </TerminalText>
        </DataPanel>

        <div className="turkey-wheel-sidecar">
          <DataPanel title="[ WINNER VERDICT ]" status={winner ? 'alert' : 'idle'}>
            {winner ? (
              <div className="turkey-wheel-winner-card">
                <TerminalText className="turkey-wheel-fanfare glow">
                  <Sparkles size={15} />
                  <span>{winnerLine || randomFanfare(winner.handle)}</span>
                </TerminalText>
                <div className="turkey-wheel-winner-name">
                  <GlitchText as="span" className="leaderboard-handle-glitch">
                    @{winner.handle}
                  </GlitchText>
                </div>
                <TerminalText className="muted-text">Wallet {shortWallet(winner.walletAddress)}</TerminalText>
                <TerminalText className="muted-text">Current stash: {winner.balance} TC</TerminalText>
                <div className="turkey-wheel-decision-row">
                  <button type="button" onClick={confirmIssue} disabled={!readyToIssue || issuing || spinning}>
                    <Send size={15} />
                    <span>{issuing ? 'SUBMITTING...' : 'SEND TO ADMIN FOR APPROVAL'}</span>
                  </button>
                  <button type="button" className="turkey-wheel-retry-btn" onClick={spinWheel} disabled={spinning || issuing || entrants.length === 0}>
                    <RotateCw size={15} />
                    <span>RETRY SPIN</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="turkey-wheel-placeholder">
                <TerminalText className="terminal-text glow">NO HOST APPOINTED YET</TerminalText>
                <TerminalText as="p" className="muted-text">
                  Spin the wheel and let the ceremonial poultry infrastructure decide who runs standup.
                </TerminalText>
              </div>
            )}
          </DataPanel>

          <DataPanel title="[ ENTRANT ROSTER ]" status="active">
            {loading ? <p className="muted-text">Loading turkey roster...</p> : null}
            {!loading && entrants.length === 0 ? <p className="warning-text">No wallets available for wheel duty.</p> : null}
            <div className="turkey-wheel-roster">
              {entrants.map((entrant, index) => {
                const active = winner?.walletAddress === entrant.walletAddress;
                return (
                  <div key={entrant.walletAddress} className={`turkey-wheel-roster-row ${active ? 'is-winner' : ''}`}>
                    <span className="turkey-wheel-roster-rank">#{index + 1}</span>
                    <span className="turkey-wheel-roster-handle">@{entrant.handle}</span>
                    <span className="turkey-wheel-roster-wallet">{shortWallet(entrant.walletAddress)}</span>
                  </div>
                );
              })}
            </div>
            <div className="turkey-wheel-actions turkey-wheel-actions-inline">
              <button type="button" className="primary-cta turkey-wheel-spin-btn" onClick={spinWheel} disabled={loading || entrants.length === 0 || spinning}>
                <RotateCw size={16} />
                <span>{spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}</span>
              </button>
            </div>
          </DataPanel>
        </div>
      </section>
    </div>
  );
}
