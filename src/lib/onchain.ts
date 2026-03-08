import { createPublicClient, createWalletClient, formatUnits, http, parseAbi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { APP_CHAIN, APP_CHAIN_META } from './chain';

const MINT_ABI = parseAbi(['function mint(address to, uint256 amount)']);
const ERC20_READ_ABI = parseAbi([
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export type OnchainEnv = {
  TOKEN_CONTRACT_ADDRESS?: string;
  TOKEN_MINTER_PRIVATE_KEY?: string;
  TOKEN_DECIMALS?: string;
  TOKEN_RPC_URL?: string;
  TOKEN_DEPLOYMENT_BLOCK?: string;
};

type OnchainSignerStatus = {
  valid: boolean;
  signerAddress: string | null;
  error: string | null;
};

type MintPreparation = {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  tokenAddress: `0x${string}`;
  decimals: number;
  amount: bigint;
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
    TOKEN_DEPLOYMENT_BLOCK:
      runtimeEnv?.TOKEN_DEPLOYMENT_BLOCK ??
      localEnv?.TOKEN_DEPLOYMENT_BLOCK ??
      import.meta.env.TOKEN_DEPLOYMENT_BLOCK,
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

export function getOnchainSignerStatus(env: OnchainEnv): OnchainSignerStatus {
  const privateKey = env.TOKEN_MINTER_PRIVATE_KEY?.trim();

  if (!privateKey) {
    return {
      valid: false,
      signerAddress: null,
      error: 'TOKEN_MINTER_PRIVATE_KEY is not configured',
    };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return {
      valid: false,
      signerAddress: null,
      error: 'TOKEN_MINTER_PRIVATE_KEY is malformed; expected 0x followed by 64 hex characters',
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return {
      valid: true,
      signerAddress: account.address,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      signerAddress: null,
      error: error instanceof Error ? error.message : 'Failed to derive signer from TOKEN_MINTER_PRIVATE_KEY',
    };
  }
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

function getDeploymentBlock(env: OnchainEnv): bigint {
  const raw = env.TOKEN_DEPLOYMENT_BLOCK?.trim();
  if (!raw) {
    return 0n;
  }

  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : 0n;
  } catch {
    return 0n;
  }
}

function getTokenAddress(env: OnchainEnv): `0x${string}` {
  if (!env.TOKEN_CONTRACT_ADDRESS?.trim()) {
    throw new Error('TOKEN_CONTRACT_ADDRESS is not configured');
  }

  return env.TOKEN_CONTRACT_ADDRESS.trim() as `0x${string}`;
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

function prepareMintTransaction(env: OnchainEnv, input: { toWallet: string; amountTokens: string }): MintPreparation {
  const clients = getClients(env);
  return {
    ...clients,
    amount: parseUnits(input.amountTokens, clients.decimals),
  };
}

export async function simulateMintTransaction(
  env: OnchainEnv,
  input: { toWallet: string; amountTokens: string },
): Promise<{ signerAddress: string }> {
  const { publicClient, account, tokenAddress, amount } = prepareMintTransaction(env, input);

  await publicClient.simulateContract({
    account,
    address: tokenAddress,
    abi: MINT_ABI,
    functionName: 'mint',
    args: [input.toWallet as `0x${string}`, amount],
  });

  return { signerAddress: account.address };
}

export async function submitMintTransaction(
  env: OnchainEnv,
  input: { toWallet: string; amountTokens: string },
): Promise<`0x${string}`> {
  const { walletClient, tokenAddress, account, amount } = prepareMintTransaction(env, input);

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

export async function getOnchainTokenStats(env: OnchainEnv) {
  const tokenAddress = getTokenAddress(env);
  const decimals = getTokenDecimals(env);
  const publicClient = createPublicClient({
    chain: APP_CHAIN,
    transport: http(getRpcUrl(env)),
  });
  const latestBlock = await publicClient.getBlockNumber();
  const configuredFromBlock = getDeploymentBlock(env);

  const resolveDeploymentBlock = async (): Promise<bigint> => {
    if (configuredFromBlock > 0n) {
      return configuredFromBlock;
    }

    // Binary search for the first block where contract bytecode exists.
    let low = 0n;
    let high = latestBlock;
    let found: bigint | null = null;

    while (low <= high) {
      const mid = (low + high) / 2n;
      const bytecode = await publicClient.getBytecode({
        address: tokenAddress,
        blockNumber: mid,
      });

      if (bytecode && bytecode !== '0x') {
        found = mid;
        high = mid - 1n;
      } else {
        low = mid + 1n;
      }
    }

    return found ?? 0n;
  };

  const countTransfers = async (fromBlock: bigint): Promise<number> => {
    const chunkSizes = [50_000n, 10_000n, 2_000n];
    let lastError: unknown = null;

    for (const chunkSize of chunkSizes) {
      try {
        let count = 0;
        for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
          const end = start + chunkSize - 1n > latestBlock ? latestBlock : start + chunkSize - 1n;
          const logs = await publicClient.getLogs({
            address: tokenAddress,
            event: ERC20_READ_ABI[1],
            fromBlock: start,
            toBlock: end,
          });
          count += logs.length;
        }
        return count;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to count Transfer events');
  };

  const totalSupplyRaw = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_READ_ABI,
    functionName: 'totalSupply',
  });

  const fromBlock = await resolveDeploymentBlock();
  const transferCount = await countTransfers(fromBlock);

  return {
    chainId: APP_CHAIN_META.id,
    contractAddress: tokenAddress,
    decimals,
    totalSupplyRaw: totalSupplyRaw.toString(),
    totalSupply: formatUnits(totalSupplyRaw, decimals),
    totalTransfers: transferCount,
    fromBlock: fromBlock.toString(),
    latestBlock: latestBlock.toString(),
    rpcUrl: getRpcUrl(env),
  };
}

export function getOnchainStatusSummary(env: OnchainEnv) {
  const configError = getOnchainConfigError(env);
  const signer = getOnchainSignerStatus(env);

  return {
    configured: configError === null && signer.valid,
    chainId: APP_CHAIN_META.id,
    rpcUrl: getRpcUrl(env),
    contractAddress: env.TOKEN_CONTRACT_ADDRESS?.trim() || null,
    decimals: getTokenDecimals(env),
    signerAddress: signer.signerAddress,
    privateKeyValid: signer.valid,
    error: configError ?? signer.error,
  };
}
