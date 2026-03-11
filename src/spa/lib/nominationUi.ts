import type { NominationEntry } from './types';

export function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

export function formatDateSafe(input: string | null): string {
  if (!input) {
    return '-';
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function normalizeWallet(wallet: string | undefined): string {
  return String(wallet ?? '').trim().toLowerCase();
}

export function nominationStatusTone(status: NominationEntry['status']): 'syncing' | 'online' | 'alert' {
  if (status === 'failed') {
    return 'alert';
  }

  if (status === 'minted') {
    return 'online';
  }

  return 'syncing';
}

export function nominationStatusLabel(status: NominationEntry['status']): string {
  if (status === 'awaiting_second') {
    return 'WAITING FOR SECOND';
  }

  if (status === 'processing') {
    return 'MINTING IN PROGRESS';
  }

  if (status === 'minted') {
    return 'BIRD BLESSING DISPENSED';
  }

  return 'FOWL PLAY DETECTED';
}
