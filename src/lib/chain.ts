import { sepolia } from 'wagmi/chains';

export const APP_CHAIN = sepolia;

export const APP_CHAIN_META = {
  id: APP_CHAIN.id,
  name: APP_CHAIN.name,
  slug: 'sepolia',
} as const;
