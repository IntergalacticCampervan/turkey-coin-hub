import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { APP_CHAIN, APP_CHAIN_META } from './chain';

const MINT_ABI = parseAbi(['function mint(address to, uint256 amount)']);

export type OnchainEnv = {
  TOKEN_CONTRACT_ADDRESS?: string;
  TOKEN_MINTER_PRIVATE_KEY?: string;
  TOKEN_DECIMALS?: string;
  TOKEN_RPC_URL?: string;
};

export function getOnchainEnv(locals: unknown): OnchainEnv {
  const runtimeEnv = (locals as { runtime?: { env?: OnchainEnv } } | undefined)?.runtime?.env;
  const localEnv = locals as OnchainEnv | undefined;

  return {
    TOKEN_CONTRACT_ADDRESS:
      runtimeEnv?.TOKEN_CONTRACT_ADDRESS ??
      localEnv?.TOKEN_CONTRACT_ADDRESS ??
      import.meta.env.TOKEN_CONTRACT_ADDRESS,
    TOKEN_MINTER_PRIVATE_KEY:
      runtimeEnv?.TOKEN_MINTER_PRIVATE_KEY ??
      localEnv?.TOKEN_MINTER_PRIVATE_KEY ??
      import.meta.env.TOKEN_MINTER_PRIVATE_KEY,
    TOKEN_DECIMALS: runtimeEnv?.TOKEN_DECIMALS ?? localEnv?.TOKEN_DECIMALS ?? import.meta.env.TOKEN_DECIMALS,
    TOKEN_RPC_URL: runtimeEnv?.TOKEN_RPC_URL ?? localEnv?.TOKEN_RPC_URL ?? import.meta.env.TOKEN_RPC_URL,
  };
}

export function getOnchainConfigError(env: OnchainEnv): string | null {
  if (!env.TOKEN_CONTRACT_ADDRESS?.trim()) {
    return 'TOKEN_CONTRACT_ADDRESS is not configured';
  }

  if (!env.TOKEN_MINTER_PRIVATE_KEY?.trim()) {
    return 'TOKEN_MINTER_PRIVATE_KEY is not configured';
  }

  return null;
}

function getRpcUrl(env: OnchainEnv): string {
  return env.TOKEN_RPC_URL?.trim() || APP_CHAIN.rpcUrls.default.http[0];
}

function getTokenDecimals(env: OnchainEnv): number {
  const parsed = Number(env.TOKEN_DECIMALS ?? '18');
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 36) {
    return 18;
  }
  return parsed;
}

function getClients(env: OnchainEnv) {
  const configError = getOnchainConfigError(env);
  if (configError) {
    throw new Error(configError);
  }

  const account = privateKeyToAccount(env.TOKEN_MINTER_PRIVATE_KEY!.trim() as `0x${string}`);
  const transport = http(getRpcUrl(env));

  return {
    account,
    publicClient: createPublicClient({
      chain: APP_CHAIN,
      transport,
    }),
    walletClient: createWalletClient({
      account,
      chain: APP_CHAIN,
      transport,
    }),
    tokenAddress: env.TOKEN_CONTRACT_ADDRESS!.trim() as `0x${string}`,
    decimals: getTokenDecimals(env),
  };
}

export async function submitMintTransaction(
  env: OnchainEnv,
  input: { toWallet: string; amountTokens: string },
): Promise<`0x${string}`> {
  const { walletClient, tokenAddress, decimals, account } = getClients(env);
  const amount = parseUnits(input.amountTokens, decimals);

  return walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: MINT_ABI,
    functionName: 'mint',
    args: [input.toWallet as `0x${string}`, amount],
    chain: APP_CHAIN,
  });
}

export async function getMintReceiptStatus(env: OnchainEnv, txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
  const { publicClient } = getClients(env);

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    return receipt.status === 'success' ? 'confirmed' : 'failed';
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('not found') || message.includes('receipt')) {
      return 'pending';
    }
    throw error;
  }
}

export function getOnchainStatusSummary(env: OnchainEnv) {
  return {
    configured: getOnchainConfigError(env) === null,
    chainId: APP_CHAIN_META.id,
    rpcUrl: getRpcUrl(env),
    contractAddress: env.TOKEN_CONTRACT_ADDRESS?.trim() || null,
    decimals: getTokenDecimals(env),
    error: getOnchainConfigError(env),
  };
}
