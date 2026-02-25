import { useEffect, useState } from 'react';

type StatusResponse = {
  ok: boolean;
  hasD1: boolean;
  d1Ping: boolean;
  chain: {
    id: number;
    name: string;
    slug: string;
  };
  adminAllowlistConfigured: boolean;
  accessJwtConfigured: boolean;
  adminBypassEnabled: boolean;
  now: string;
};

export default function StatusCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = (await response.json()) as StatusResponse;
        setStatus(json);
        setError(null);
      } catch {
        setError('Failed to load API status.');
      }
    }

    loadStatus();
  }, []);

  return (
    <section className="panel">
      <h2>System Status</h2>
      {error ? <p className="msg err">{error}</p> : null}
      {status ? (
        <dl className="status-grid">
          <dt>API</dt>
          <dd>{status.ok ? 'ok' : 'error'}</dd>
          <dt>Has D1 Binding</dt>
          <dd>{status.hasD1 ? 'yes' : 'no'}</dd>
          <dt>D1 Ping</dt>
          <dd>{status.d1Ping ? 'ok' : 'failed'}</dd>
          <dt>Chain</dt>
          <dd>
            {status.chain.name} (id {status.chain.id})
          </dd>
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
    </section>
  );
}
