import { useState } from 'react';
import { DataPanel, TerminalText, StatusBadge } from '../components/TerminalPrimitives';
import { mockUsers } from '../data/mockData';
import { Shield, Send, AlertTriangle } from 'lucide-react';

export function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [lastIssued, setLastIssued] = useState<{ user: string; amount: string; time: Date } | null>(null);

  const handleIssueTokens = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !amount) return;

    setIssuing(true);
    
    // Simulate issuing delay
    setTimeout(() => {
      const user = mockUsers.find(u => u.id === selectedUser);
      if (user) {
        setLastIssued({
          user: user.username,
          amount: amount,
          time: new Date()
        });
      }
      setIssuing(false);
      setAmount('');
      setNote('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h1 className="font-mono text-2xl mb-2 [text-shadow:var(--glow-strength)] flex items-center gap-3 md:text-3xl">
            <Shield className="w-6 h-6 text-[var(--phosphor-warning)] md:w-8 md:h-8" />
            ADMIN CONTROL PANEL
          </h1>
          <TerminalText className="text-sm opacity-70">
            PRIVILEGED ACCESS ONLY
          </TerminalText>
        </div>
        <StatusBadge status="alert">ADMIN MODE</StatusBadge>
      </div>

      {/* Warning Banner */}
      <DataPanel status="alert" className="bg-[var(--phosphor-warning)] bg-opacity-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--phosphor-warning)] flex-shrink-0 mt-1" />
          <div className="space-y-1">
            <TerminalText className="text-sm text-white font-bold">
              SECURITY NOTICE <br />
            </TerminalText>
            <TerminalText className="text-xs text-white opacity-90">
              All token issuance operations are logged and auditable. 
              Ensure proper authorization before distributing tokens.
            </TerminalText>
          </div>
        </div>
      </DataPanel>

      {/* Issue Tokens Form */}
      <DataPanel title="[ TOKEN ISSUANCE ]" status="active">
        <form onSubmit={handleIssueTokens} className="space-y-4">
          <div className="space-y-2">
            <label className="block">
              <TerminalText className="text-xs uppercase tracking-wider opacity-70 mb-2 block">
                Select User
              </TerminalText>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-[var(--bg-core)] border border-[var(--phosphor-primary)] text-[var(--phosphor-primary)] p-3 font-mono focus:outline-none focus:[box-shadow:var(--glow-strength)]"
                required
              >
                <option value="">-- SELECT TARGET WALLET --</option>
                {mockUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.walletAddress}) - Current: {user.balance} TC
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              <TerminalText className="text-xs uppercase tracking-wider opacity-70 mb-2 block">
                Amount (Turkey Coins)
              </TerminalText>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max="10000"
                className="w-full bg-[var(--bg-core)] border border-[var(--phosphor-primary)] text-[var(--phosphor-primary)] p-3 font-mono text-base md:text-xl focus:outline-none focus:[box-shadow:var(--glow-strength)]"
                required
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              <TerminalText className="text-xs uppercase tracking-wider opacity-70 mb-2 block">
                Note (Optional)
              </TerminalText>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for issuance..."
                maxLength={100}
                className="w-full bg-[var(--bg-core)] border border-[var(--phosphor-primary)] text-[var(--phosphor-primary)] p-3 font-mono focus:outline-none focus:[box-shadow:var(--glow-strength)]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={issuing || !selectedUser || !amount}
            className="w-full bg-[var(--phosphor-accent)] text-[var(--bg-core)] p-4 font-mono uppercase tracking-wider hover:[box-shadow:var(--glow-strong)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {issuing ? (
              <>
                <span className="animate-pulse">PROCESSING...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                ISSUE TOKENS
              </>
            )}
          </button>
        </form>

        {lastIssued && (
          <div className="mt-4 p-3 border border-[var(--phosphor-accent)] bg-[var(--phosphor-accent)] bg-opacity-5">
            <TerminalText className="text-xs text-[var(--phosphor-accent)]">
              ✓ SUCCESSFULLY ISSUED {lastIssued.amount} TC TO {lastIssued.user}
            </TerminalText>
            <TerminalText className="text-xs opacity-50 block mt-1">
              {lastIssued.time.toLocaleString()}
            </TerminalText>
          </div>
        )}
      </DataPanel>

      {/* Recent Issuance Log */}
      <DataPanel title="[ ISSUANCE LOG ]" status="idle">
        <div className="space-y-2">
          {[
            { user: 'CRYPTO_WIZARD', amount: 500, time: '2026-02-25 10:30:15', note: 'Q1 Performance Bonus' },
            { user: 'CODE_NINJA', amount: 750, time: '2026-02-24 16:45:22', note: 'Feature completion reward' },
            { user: 'HASH_SLINGER', amount: 1200, time: '2026-02-23 11:00:08', note: 'Bug bounty' },
            { user: 'TOKEN_MASTER', amount: 300, time: '2026-02-22 14:20:45', note: 'Documentation contribution' },
          ].map((log, i) => (
            <div
              key={i}
              className="py-2 border-b border-[var(--phosphor-primary)] border-opacity-20 space-y-1"
            >
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                <TerminalText className="text-sm">
                  {log.user}
                </TerminalText>
                <TerminalText className="text-sm" glow>
                  +{log.amount} TC
                </TerminalText>
              </div>
              <TerminalText className="text-xs opacity-50 break-words">
                {log.time} - {log.note}
              </TerminalText>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
