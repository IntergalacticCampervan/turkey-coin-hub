export type LeaderboardEntry = {
  handle: string;
  walletAddress: string;
  balance: string;
  updatedAt: string;
};

export type OnboardResponse = {
  ok: boolean;
  error?: string;
};

export type UserEntry = {
  handle: string;
  walletAddress: string;
  createdAt: string;
};

export type MintEventStatus = 'queued' | 'submitted' | 'confirmed' | 'failed';

export type MintEvent = {
  id: string;
  toWallet: string;
  amountRaw: string;
  chainId: number;
  status: MintEventStatus;
  idempotencyKey: string;
  txHash: string | null;
  requestedBySub: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

export type MintResponse = {
  ok: boolean;
  eventId?: string;
  txHash: string | null;
  error?: string;
};

export type StatusResponse = {
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

export type ErrorResponse = {
  ok?: boolean;
  error?: string;
};

export type ApiWarning = string | null;
