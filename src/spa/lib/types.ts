export type LeaderboardEntry = {
  handle: string;
  walletAddress: string;
  balance: string;
  updatedAt: string;
};

export type RecentMintEntry = {
  id: string;
  handle: string;
  walletAddress: string;
  reason: string;
  amount: string;
  status: MintEventStatus;
  createdAt: string;
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
export type MintFailureStage = 'queue_insert' | 'tx_simulation' | 'tx_submission' | 'receipt_check' | 'balance_update';

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
  failureStage: MintFailureStage | null;
};

export type MintResponse = {
  ok: boolean;
  eventId?: string;
  txHash: string | null;
  failureStage?: MintFailureStage | null;
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
  onchain: {
    configured: boolean;
    chainId: number;
    rpcUrl: string;
    contractAddress: string | null;
    decimals: number;
    signerAddress: string | null;
    privateKeyValid: boolean;
    error: string | null;
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

export type TokenStatsResponse = {
  ok: boolean;
  chainId: number;
  contractAddress: string;
  decimals: number;
  totalSupplyRaw: string;
  totalSupply: string;
  totalTransfers: number;
  fromBlock: string;
  latestBlock: string;
  rpcUrl: string;
  error?: string;
};

export type ApiWarning = string | null;

export type NominationStatus = 'awaiting_second' | 'processing' | 'minted' | 'failed';

export type NominationRewardOption = {
  id: string;
  label: string;
  amount: string;
  announcerLine: string;
};

export type NominationEntry = {
  id: string;
  nomineeHandle: string;
  nomineeWalletAddress: string;
  nominatorHandle: string;
  nominatorWalletAddress: string;
  seconderHandle: string | null;
  seconderWalletAddress: string | null;
  rewardId: string;
  rewardLabel: string;
  amount: string;
  reason: string;
  status: NominationStatus;
  failureReason: string | null;
  createdAt: string;
  secondedAt: string | null;
  completedAt: string | null;
};

export type NominationActionResponse = {
  ok: boolean;
  id?: string;
  eventId?: string;
  txHash?: string | null;
  status?: NominationStatus;
  warning?: string;
  error?: string;
};
