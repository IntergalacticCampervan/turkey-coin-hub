import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getStatus } from '../lib/api';
import type { StatusResponse } from '../lib/types';
import { DataPanel, TerminalText } from './TerminalPrimitives';

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

export function DashboardSidebarConsole() {
  const [statusSnapshot, setStatusSnapshot] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);

  useEffect(() => {
    let inFlight = false;

    const loadStatusSnapshot = async () => {
      if (inFlight) {
        return;
      }

      inFlight = true;
      try {
        const result = await getStatus();
        if (!result.ok || !result.data) {
          setStatusError(result.error || 'Could not load /api/status');
          return;
        }

        setStatusSnapshot(result.data);
        setStatusError(null);
      } finally {
        inFlight = false;
      }
    };

    const poll = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void loadStatusSnapshot();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    };

    poll();
    const timer = window.setInterval(poll, 30_000);
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

  return (
    <section className="sidebar-console">
      <Link to="/status" className="terminal-nav-link sidebar-console-link" aria-label="Open full status page">
        <DataPanel status="syncing" className="sync-status-panel terminal-card sidebar-console-panel">
          <TerminalText className="metric-label">TERMINAL</TerminalText>
          <div className="sync-terminal" role="status" aria-live="polite">
            {terminalLines.map((line) => (
              <div className="sync-terminal-line" key={line.id}>
                <span className="sync-terminal-label">{formatPrompt(line.label)}</span>
                <span className={`sync-terminal-value ${line.resolved ? 'ready' : 'pending'}`}>
                  {line.resolved ? line.value : '...'}
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
      </Link>
    </section>
  );
}
