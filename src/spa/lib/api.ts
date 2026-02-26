import type {
  ApiWarning,
  ErrorResponse,
  LeaderboardEntry,
  MintEvent,
  MintEventStatus,
  MintResponse,
  OnboardResponse,
  StatusResponse,
  UserEntry,
} from './types';

type FetchResult<T> = {
  status: number;
  ok: boolean;
  warning: ApiWarning;
  data: T | null;
  error: string | null;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const warning = response.headers.get('x-auth-warning');

    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const body = (parsed as ErrorResponse | null) ?? null;
      return {
        status: response.status,
        ok: false,
        warning,
        data: null,
        error: body?.error || `Request failed with HTTP ${response.status}`,
      };
    }

    return {
      status: response.status,
      ok: true,
      warning,
      data: parsed as T,
      error: null,
    };
  } catch {
    return {
      status: 0,
      ok: false,
      warning: null,
      data: null,
      error: 'Network request failed',
    };
  }
}

export async function getLeaderboardWithHeaders() {
  try {
    const response = await fetch('/api/leaderboard');
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      rows: Array.isArray(parsed) ? (parsed as LeaderboardEntry[]) : [],
      noDb: response.headers.get('x-no-db') === 'true',
      error:
        !response.ok && parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>)
          ? String((parsed as Record<string, unknown>).error || '') || `Request failed with HTTP ${response.status}`
          : response.ok
            ? null
            : `Request failed with HTTP ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      rows: [],
      noDb: false,
      error: 'Network request failed',
    };
  }
}
export async function postOnboard(payload: { walletAddress: string; handle: string }) {
  return requestJson<OnboardResponse>('/api/onboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getUsers() {
  return requestJson<UserEntry[]>('/api/users');
}

export async function postMint(payload: {
  walletAddress: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}) {
  return requestJson<MintResponse>('/api/admin/mint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMintEvents(filters: { status?: string; toWallet?: string; limit?: number }) {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit ?? 50));

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.toWallet) {
    params.set('to_wallet', filters.toWallet);
  }

  return requestJson<MintEvent[]>(`/api/admin/mint-events?${params.toString()}`);
}

export async function patchMintEvent(payload: {
  eventId: string;
  status: MintEventStatus;
  txHash?: string;
  failureReason?: string;
  manualOverride?: boolean;
}) {
  return requestJson<{ ok: boolean; error?: string }>('/api/admin/mint-events', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getStatus() {
  return requestJson<StatusResponse>('/api/status');
}
