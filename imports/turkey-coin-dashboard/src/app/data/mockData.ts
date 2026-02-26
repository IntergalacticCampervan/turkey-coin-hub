export type SystemState = 
  | 'BOOT'
  | 'AUTHENTICATING'
  | 'SYNCING'
  | 'IDLE'
  | 'ALERT'
  | 'COMPROMISED'
  | 'OVERRIDE'
  | 'OFFLINE';

export interface User {
  id: string;
  username: string;
  walletAddress: string;
  balance: number;
  rank: number;
  joinDate: string;
  isAdmin: boolean;
  avatar?: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  type: 'issued' | 'transfer' | 'reward';
  note?: string;
}

// Mock data
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'ADMIN_OVERLORD',
    walletAddress: '0xA1B2C3D4E5F6...',
    balance: 15420,
    rank: 1,
    joinDate: '2024-01-15',
    isAdmin: true
  },
  {
    id: '2',
    username: 'CRYPTO_WIZARD',
    walletAddress: '0xF1E2D3C4B5A6...',
    balance: 12890,
    rank: 2,
    joinDate: '2024-02-01',
    isAdmin: false
  },
  {
    id: '3',
    username: 'CODE_NINJA',
    walletAddress: '0x9876543210AB...',
    balance: 10250,
    rank: 3,
    joinDate: '2024-01-28',
    isAdmin: false
  },
  {
    id: '4',
    username: 'BLOCKCHAIN_BOSS',
    walletAddress: '0xDEADBEEF1234...',
    balance: 9670,
    rank: 4,
    joinDate: '2024-02-10',
    isAdmin: false
  },
  {
    id: '5',
    username: 'TOKEN_MASTER',
    walletAddress: '0x1111222233334...',
    balance: 8940,
    rank: 5,
    joinDate: '2024-02-15',
    isAdmin: false
  },
  {
    id: '6',
    username: 'HASH_SLINGER',
    walletAddress: '0xABCDEF123456...',
    balance: 7520,
    rank: 6,
    joinDate: '2024-03-01',
    isAdmin: false
  },
  {
    id: '7',
    username: 'WALLET_WARRIOR',
    walletAddress: '0x9999888877776...',
    balance: 6880,
    rank: 7,
    joinDate: '2024-03-05',
    isAdmin: false
  },
  {
    id: '8',
    username: 'COIN_COLLECTOR',
    walletAddress: '0x5555666677778...',
    balance: 5940,
    rank: 8,
    joinDate: '2024-03-12',
    isAdmin: false
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    from: 'SYSTEM',
    to: 'ADMIN_OVERLORD',
    amount: 1000,
    timestamp: '2026-02-25T10:30:00Z',
    type: 'issued',
    note: 'Monthly admin allocation'
  },
  {
    id: 't2',
    from: 'ADMIN_OVERLORD',
    to: 'CRYPTO_WIZARD',
    amount: 500,
    timestamp: '2026-02-25T09:15:00Z',
    type: 'reward',
    note: 'Excellent code review'
  },
  {
    id: 't3',
    from: 'SYSTEM',
    to: 'CODE_NINJA',
    amount: 750,
    timestamp: '2026-02-24T16:45:00Z',
    type: 'issued',
    note: 'Performance bonus'
  },
  {
    id: 't4',
    from: 'BLOCKCHAIN_BOSS',
    to: 'TOKEN_MASTER',
    amount: 250,
    timestamp: '2026-02-24T14:20:00Z',
    type: 'transfer',
    note: 'Team lunch contribution'
  },
  {
    id: 't5',
    from: 'SYSTEM',
    to: 'HASH_SLINGER',
    amount: 1200,
    timestamp: '2026-02-23T11:00:00Z',
    type: 'issued',
    note: 'Bug bounty reward'
  }
];
