import { useEffect, useState } from 'react';

type StatusResponse = {
  ok: boolean;
  hasD1: boolean;
  chain: string;
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
          <dt>Chain</dt>
          <dd>{status.chain}</dd>
          <dt>D1 Bound</dt>
          <dd>{status.hasD1 ? 'yes' : 'no'}</dd>
          <dt>Server Time</dt>
          <dd>{status.now}</dd>
        </dl>
      ) : null}
    </section>
  );
}
