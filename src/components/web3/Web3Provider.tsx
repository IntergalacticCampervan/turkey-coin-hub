import '@rainbow-me/rainbowkit/styles.css';

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { WagmiProvider } from 'wagmi';

import { APP_CHAIN } from '../../lib/chain';

const walletConnectProjectId =
  import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID || 'MISSING_PROJECT_ID';

const wagmiConfig = getDefaultConfig({
  appName: 'Turkey Coin Hub',
  projectId: walletConnectProjectId,
  chains: [APP_CHAIN],
});

type Props = {
  children: ReactNode;
};

export default function Web3Provider({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
