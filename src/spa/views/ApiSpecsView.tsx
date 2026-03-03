import { Code, GitBranch, PlugZap } from 'lucide-react';

import DecryptedText from '../../components/DecryptedText';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

type EndpointSpec = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  auth: 'public' | 'admin';
  description: string;
  request?: string;
  response: string;
  notes?: string[];
};

const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'GET',
    path: '/api/leaderboard',
    auth: 'public',
    description: 'Returns ranked user balances from D1 `users` + `balance_cache`.',
    response: `[
  {
    "handle": "campervan",
    "walletAddress": "0xabc...123",
    "balance": "150",
    "updatedAt": "2026-03-03T12:00:00.000Z"
  }
]`,
    notes: ['Returns `x-no-db: true` when D1 is not bound in the runtime.'],
  },
  {
    method: 'POST',
    path: '/api/onboard',
    auth: 'public',
    description: 'Creates or updates a user handle for a connected wallet.',
    request: `{
  "walletAddress": "0xabc...123",
  "handle": "farmhand_01"
}`,
    response: `{
  "ok": true
}`,
    notes: ['Handle rules: `^[a-zA-Z0-9_]{3,24}$`.', 'Returns `409` when handle is taken by another wallet.'],
  },
  {
    method: 'GET',
    path: '/api/status',
    auth: 'public',
    description: 'Returns runtime health, D1 connectivity, auth config, and on-chain mint config.',
    response: `{
  "ok": true,
  "hasD1": true,
  "d1Ping": true,
  "chain": { "id": 11155111, "name": "Sepolia", "slug": "sepolia" },
  "onchain": {
    "configured": false,
    "contractAddress": null,
    "decimals": 18,
    "error": "TOKEN_CONTRACT_ADDRESS is not configured"
  },
  "adminAllowlistConfigured": false,
  "accessJwtConfigured": false,
  "adminBypassEnabled": false,
  "now": "2026-03-03T12:00:00.000Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/users',
    auth: 'admin',
    description: 'Returns onboarded users for admin tooling and mint targeting.',
    response: `[
  {
    "handle": "campervan",
    "walletAddress": "0xabc...123",
    "createdAt": "2026-03-03T12:00:00.000Z"
  }
]`,
    notes: ['Requires Cloudflare Access auth + allowlist unless local bypass is enabled.'],
  },
  {
    method: 'POST',
    path: '/api/admin/mint',
    auth: 'admin',
    description: 'Queues a mint event, then attempts immediate on-chain submission when signer config exists.',
    request: `{
  "walletAddress": "0xabc...123",
  "amount": 25,
  "reason": "merged PR #42",
  "idempotencyKey": "github-pr-42-merge"
}`,
    response: `{
  "ok": true,
  "eventId": "evt_123",
  "txHash": "0xdef...456"
}`,
    notes: [
      'Returns `200` with warning when on-chain signer config is missing and the event is only queued.',
      'Returns `502` if immediate submission fails after queuing.',
    ],
  },
  {
    method: 'GET',
    path: '/api/admin/mint-events',
    auth: 'admin',
    description: 'Lists mint events and advances queued/submitted events through lifecycle processing.',
    response: `[
  {
    "id": "evt_123",
    "toWallet": "0xabc...123",
    "amountRaw": "25",
    "chainId": 11155111,
    "status": "confirmed",
    "idempotencyKey": "github-pr-42-merge",
    "txHash": "0xdef...456",
    "requestedBySub": "user-subject",
    "requestedByEmail": "dev@example.com",
    "createdAt": "2026-03-03T12:00:00.000Z",
    "submittedAt": "2026-03-03T12:00:02.000Z",
    "confirmedAt": "2026-03-03T12:00:20.000Z",
    "failedAt": null,
    "failureReason": null
  }
]`,
    notes: ['Query params: `status`, `to_wallet`, `limit`.'],
  },
  {
    method: 'PATCH',
    path: '/api/admin/mint-events',
    auth: 'admin',
    description: 'Manual lifecycle override endpoint for mint event operations.',
    request: `{
  "eventId": "evt_123",
  "status": "failed",
  "failureReason": "manual override",
  "manualOverride": true
}`,
    response: `{
  "ok": true
}`,
    notes: ['Supports guarded transitions only: `queued/submitted/confirmed/failed`.'],
  },
];

const BLOCKERS = [
  'No public inbound event ingestion endpoint exists yet for GitHub, Discord, or custom hackathon sources.',
  'There is no signature verification model yet for third-party webhook providers.',
  'No generic event schema exists for source metadata like repo, PR number, commit SHA, issue link, or event type.',
  'No async queue/cron worker exists yet, so lifecycle processing currently depends on admin API traffic.',
  'No per-integration API keys, secrets, or tenant isolation model exists.',
  'No outbound webhook or event subscription mechanism exists for downstream automation.',
];

const PROPOSED_EXTENSIONS = [
  '`POST /api/events/github` for verified GitHub webhooks mapped into mint proposals.',
  '`POST /api/events/custom` for hackathon teams to send normalized contribution events.',
  '`POST /api/admin/mint-proposals` to store unapproved reward recommendations before mint.',
  'Signed provider secrets per integration plus replay protection using delivery IDs.',
];

function MethodBadge({ method }: { method: EndpointSpec['method'] }) {
  return <span className={`method-badge method-${method.toLowerCase()}`}>{method}</span>;
}

export function ApiSpecsView() {
  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <DecryptedText text="DEVELOPER API SPECS" animateOn="view" sequential speed={40} />
          </h1>
          <TerminalText as="p" className="muted-text">
            HACKATHON-READY ENDPOINT GUIDE + INTEGRATION ROADMAP
          </TerminalText>
        </div>
        <StatusBadge status="syncing">ALPHA DOCS</StatusBadge>
      </div>

      <section className="metrics-grid api-meta-grid">
        <DataPanel status="active">
          <TerminalText className="metric-label">SURFACE</TerminalText>
          <div className="metric-value">{ENDPOINTS.length}</div>
          <TerminalText className="metric-sub">DOCUMENTED ENDPOINTS</TerminalText>
        </DataPanel>
        <DataPanel status="active">
          <TerminalText className="metric-label">TARGET</TerminalText>
          <div className="metric-value">WEBHOOKS</div>
          <TerminalText className="metric-sub">GITHUB + CUSTOM EVENTS</TerminalText>
        </DataPanel>
        <DataPanel status="alert">
          <TerminalText className="metric-label">BLOCKERS</TerminalText>
          <div className="metric-value">{BLOCKERS.length}</div>
          <TerminalText className="metric-sub">GAPS TO CLOSE</TerminalText>
        </DataPanel>
      </section>

      <DataPanel title="[ OVERVIEW ]" status="active">
        <div className="api-overview-grid">
          <div className="api-overview-card">
            <div className="api-overview-title">
              <Code size={16} />
              <span>Current API Shape</span>
            </div>
            <TerminalText as="p" className="muted-text">
              Same-origin Astro API routes back the product today. Public endpoints cover onboarding, status, and
              leaderboard reads. Admin endpoints cover user listing and mint lifecycle control.
            </TerminalText>
          </div>
          <div className="api-overview-card">
            <div className="api-overview-title">
              <GitBranch size={16} />
              <span>Hackathon Goal</span>
            </div>
            <TerminalText as="p" className="muted-text">
              Let developers plug contribution sources like GitHub events into a normalized reward pipeline instead of
              hard-coding app-specific logic.
            </TerminalText>
          </div>
          <div className="api-overview-card">
            <div className="api-overview-title">
              <PlugZap size={16} />
              <span>Recommended Next Step</span>
            </div>
            <TerminalText as="p" className="muted-text">
              Add a signed inbound event endpoint and a mint-proposal table so external systems can suggest rewards
              without receiving direct mint access.
            </TerminalText>
          </div>
        </div>
      </DataPanel>

      <div className="api-specs-grid">
        {ENDPOINTS.map((endpoint) => (
          <DataPanel key={`${endpoint.method}-${endpoint.path}`} title={`[ ${endpoint.method} ${endpoint.path} ]`} status="active">
            <div className="api-endpoint-head">
              <div className="api-endpoint-meta">
                <MethodBadge method={endpoint.method} />
                <span className={`auth-chip auth-${endpoint.auth}`}>{endpoint.auth.toUpperCase()}</span>
              </div>
            </div>

            <TerminalText as="p" className="muted-text">
              {endpoint.description}
            </TerminalText>

            {endpoint.request ? (
              <div className="api-block">
                <TerminalText className="api-block-label">REQUEST</TerminalText>
                <pre className="api-code-block">
                  <code>{endpoint.request}</code>
                </pre>
              </div>
            ) : null}

            <div className="api-block">
              <TerminalText className="api-block-label">RESPONSE</TerminalText>
              <pre className="api-code-block">
                <code>{endpoint.response}</code>
              </pre>
            </div>

            {endpoint.notes?.length ? (
              <div className="api-block">
                <TerminalText className="api-block-label">NOTES</TerminalText>
                <ul className="api-note-list">
                  {endpoint.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DataPanel>
        ))}
      </div>

      <section className="api-docs-two-col">
        <DataPanel title="[ HACKATHON BLOCKERS ]" status="alert">
          <ul className="api-note-list">
            {BLOCKERS.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </DataPanel>

        <DataPanel title="[ PROPOSED EXTENSIONS ]" status="active">
          <ul className="api-note-list">
            {PROPOSED_EXTENSIONS.map((extension) => (
              <li key={extension}>{extension}</li>
            ))}
          </ul>
        </DataPanel>
      </section>
    </div>
  );
}
