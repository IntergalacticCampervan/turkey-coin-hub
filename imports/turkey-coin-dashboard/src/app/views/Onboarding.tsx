import { useState } from 'react';
import { DataPanel, TerminalText, StatusBadge } from '../components/TerminalPrimitives';
import { Wallet, Link2, CheckCircle2, ArrowRight } from 'lucide-react';

export function Onboarding() {
  const [step, setStep] = useState<'welcome' | 'wallet' | 'verify' | 'complete'>('welcome');
  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnectWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !walletAddress) return;

    setConnecting(true);
    setStep('verify');

    // Simulate wallet verification
    setTimeout(() => {
      setConnecting(false);
      setStep('complete');
    }, 2000);
  };

  const simulateWalletConnect = () => {
    // Simulate connecting to a wallet like MetaMask
    const mockAddress = '0x' + Math.random().toString(16).substring(2, 14).toUpperCase() + '...';
    setWalletAddress(mockAddress);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="font-mono text-3xl mb-2 [text-shadow:var(--glow-strength)] md:text-4xl">
          TURKEY COIN
        </h1>
        <TerminalText className="text-sm opacity-70">
          WALLET ONBOARDING SEQUENCE
        </TerminalText>
        <StatusBadge status="syncing">INITIALIZING</StatusBadge>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-1 mb-8 px-1 sm:gap-2">
        {['welcome', 'wallet', 'verify', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 border-2 flex items-center justify-center font-mono text-xs ${
                step === s
                  ? 'border-[var(--phosphor-accent)] text-[var(--phosphor-accent)] [box-shadow:var(--glow-strength)]'
                  : ['welcome', 'wallet', 'verify'].indexOf(step) > i || step === 'complete'
                  ? 'border-[var(--phosphor-primary)] text-[var(--phosphor-primary)]'
                  : 'border-[var(--phosphor-primary)] opacity-30'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div className={`w-6 h-0.5 sm:w-12 ${
                ['welcome', 'wallet', 'verify'].indexOf(step) > i || step === 'complete'
                  ? 'bg-[var(--phosphor-primary)]'
                  : 'bg-[var(--phosphor-primary)] opacity-30'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Welcome Step */}
      {step === 'welcome' && (
        <DataPanel status="active">
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <Wallet className="w-16 h-16 text-[var(--phosphor-accent)] [filter:drop-shadow(var(--glow-strength))]" />
            </div>
            
            <div className="space-y-3">
              <h2 className="font-mono text-2xl [text-shadow:var(--glow-strength)]">
                WELCOME TO TURKEY COIN
              </h2>
              <TerminalText className="text-sm opacity-70 max-w-md mx-auto">
                Turkey Coin is our internal cryptocurrency system for recognizing 
                contributions, rewarding excellence, and building team culture.
              </TerminalText>
            </div>

            <div className="pt-6">
              <TerminalText className="text-xs uppercase tracking-wider opacity-50 mb-4 block">
                Ready to get started?
              </TerminalText>
              <button
                onClick={() => setStep('wallet')}
                className="w-full justify-center bg-[var(--phosphor-accent)] text-[var(--bg-core)] px-6 py-4 font-mono uppercase tracking-wider hover:[box-shadow:var(--glow-strong)] transition-all inline-flex items-center gap-3 sm:w-auto sm:px-8"
              >
                BEGIN ONBOARDING
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DataPanel>
      )}

      {/* Wallet Connection Step */}
      {step === 'wallet' && (
        <DataPanel title="[ WALLET CONNECTION ]" status="active">
          <form onSubmit={handleConnectWallet} className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="block">
                <TerminalText className="text-xs uppercase tracking-wider opacity-70 mb-2 block">
                  Username
                </TerminalText>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username..."
                  className="w-full bg-[var(--bg-core)] border border-[var(--phosphor-primary)] text-[var(--phosphor-primary)] p-3 font-mono focus:outline-none focus:[box-shadow:var(--glow-strength)]"
                  required
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block">
                <TerminalText className="text-xs uppercase tracking-wider opacity-70 mb-2 block">
                  Wallet Address
                </TerminalText>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 bg-[var(--bg-core)] border border-[var(--phosphor-primary)] text-[var(--phosphor-primary)] p-3 font-mono focus:outline-none focus:[box-shadow:var(--glow-strength)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={simulateWalletConnect}
                    className="min-h-11 justify-center bg-[var(--bg-panel)] border border-[var(--phosphor-accent)] text-[var(--phosphor-accent)] px-4 font-mono uppercase tracking-wider hover:[box-shadow:var(--glow-strength)] transition-all flex items-center gap-2 sm:justify-start"
                  >
                    <Link2 className="w-4 h-4" />
                    CONNECT
                  </button>
                </div>
              </label>
              <TerminalText className="text-xs opacity-50">
                Paste your wallet address or connect your wallet provider
              </TerminalText>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!username || !walletAddress}
                className="w-full bg-[var(--phosphor-accent)] text-[var(--bg-core)] p-4 font-mono uppercase tracking-wider hover:[box-shadow:var(--glow-strong)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                VERIFY WALLET
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </DataPanel>
      )}

      {/* Verification Step */}
      {step === 'verify' && (
        <DataPanel status="syncing">
          <div className="space-y-6 text-center py-12">
            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--phosphor-accent)] animate-ping opacity-40" />
                <div className="absolute inset-2 rounded-full border-2 border-[var(--phosphor-accent)] animate-pulse" />
                <div className="absolute inset-4 rounded-full border-2 border-[var(--phosphor-accent)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--phosphor-accent)] rounded-full [box-shadow:var(--glow-strong)]" />
              </div>
            </div>

            <div className="space-y-2">
              <TerminalText className="text-lg" glow>
                VERIFYING WALLET...
              </TerminalText>
              <TerminalText className="text-xs opacity-50">
                Establishing secure connection to blockchain
              </TerminalText>
            </div>
          </div>
        </DataPanel>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <DataPanel status="active">
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-[var(--phosphor-accent)] [filter:drop-shadow(var(--glow-strong))]" />
            </div>

            <div className="space-y-3">
              <h2 className="font-mono text-2xl text-[var(--phosphor-accent)] [text-shadow:var(--glow-strength)]">
                CONNECTION ESTABLISHED
              </h2>
              <TerminalText className="text-sm opacity-70">
                Your wallet has been successfully linked
              </TerminalText>
            </div>

            <div className="bg-[var(--bg-core)] p-6 space-y-3">
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between sm:items-center">
                <TerminalText className="text-xs opacity-70">USERNAME</TerminalText>
                <TerminalText className="text-sm">{username}</TerminalText>
              </div>
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between sm:items-center">
                <TerminalText className="text-xs opacity-70">WALLET</TerminalText>
                <TerminalText className="text-sm font-mono break-all">{walletAddress}</TerminalText>
              </div>
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between sm:items-center">
                <TerminalText className="text-xs opacity-70">BALANCE</TerminalText>
                <TerminalText className="text-sm" glow>100 TC</TerminalText>
              </div>
              <TerminalText className="text-xs opacity-50 text-center pt-2">
                Welcome bonus credited
              </TerminalText>
            </div>

            <div className="pt-4">
              <a
                href="/"
                className="block w-full text-center bg-[var(--phosphor-accent)] text-[var(--bg-core)] px-8 py-4 font-mono uppercase tracking-wider hover:[box-shadow:var(--glow-strong)] transition-all sm:inline-block sm:w-auto"
              >
                ENTER SYSTEM
              </a>
            </div>
          </div>
        </DataPanel>
      )}
    </div>
  );
}
