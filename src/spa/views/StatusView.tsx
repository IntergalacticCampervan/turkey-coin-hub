import { useEffect, useState } from 'react';

import { getStatus } from '../lib/api';
import type { StatusResponse } from '../lib/types';
import { DataPanel, TerminalText } from '../components/TerminalPrimitives';

export function StatusView() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getStatus();
      if (!result.ok || !result.data) {
        setError(result.error || 'Failed to load status');
        return;
      }

      setStatus(result.data);
      setError(null);
    }

    load();
  }, []);

  return (
    <div className="view-grid narrow">
      <div className="view-header">
        <div>
          <h1 className="view-title">SYSTEM STATUS</h1>
          <TerminalText as="p" className="muted-text">
            LIVE API HEALTH + RUNTIME CONFIG CHECKS
          </TerminalText>
        </div>
      </div>

      <DataPanel title="[ STATUS ]" status={error ? 'alert' : 'active'}>
        {error ? <p className="error-text">{error}</p> : null}

        {status ? (
          <dl className="status-grid">
            <dt>API</dt>
            <dd>{status.ok ? 'ok' : 'error'}</dd>
            <dt>Has D1 Binding</dt>
            <dd>{status.hasD1 ? 'yes' : 'no'}</dd>
            <dt>D1 Ping</dt>
            <dd>{status.d1Ping ? 'ok' : 'failed'}</dd>
            <dt>Chain</dt>
            <dd>{status.chain.name} (id {status.chain.id})</dd>
            <dt>Admin Allowlist</dt>
            <dd>{status.adminAllowlistConfigured ? 'configured' : 'not configured'}</dd>
            <dt>Access JWT Verify</dt>
            <dd>{status.accessJwtConfigured ? 'configured' : 'not configured'}</dd>
            <dt>Admin Auth Bypass</dt>
            <dd>{status.adminBypassEnabled ? 'enabled' : 'disabled'}</dd>
            <dt>Server Time</dt>
            <dd>{status.now}</dd>
          </dl>
        ) : null}
      </DataPanel>
    </div>
  );
}
