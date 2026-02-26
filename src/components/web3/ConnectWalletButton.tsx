import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!account && !!chain;

        if (!connected) {
          return (
            <button type="button" className="source-connect-btn" onClick={openConnectModal}>
              CONNECT WALLET
            </button>
          );
        }

        return (
          <div className="source-connect-group">
            <button type="button" className="source-connect-btn secondary" onClick={openChainModal}>
              {chain.name}
            </button>
            <button type="button" className="source-connect-btn" onClick={openAccountModal}>
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
