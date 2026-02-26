import { DataPanel, TerminalText, StatusBadge, SignalMeter } from '../components/TerminalPrimitives';
import { mockUsers, mockTransactions } from '../data/mockData';
import { TrendingUp, Activity, Users } from 'lucide-react';

export function Dashboard() {
  const totalSupply = mockUsers.reduce((sum, user) => sum + user.balance, 0);
  const activeUsers = mockUsers.length;
  const recentTransactions = mockTransactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h1 className="font-mono text-2xl mb-2 [text-shadow:var(--glow-strength)] md:text-3xl">
            TURKEY COIN
          </h1>
          <TerminalText className="text-sm opacity-70">
            INTERNAL CRYPTOCURRENCY TRACKING SYSTEM
          </TerminalText>
        </div>
        <StatusBadge status="online">SYSTEM OPERATIONAL</StatusBadge>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataPanel status="active" className="space-y-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-[var(--phosphor-accent)]" />
            <TerminalText className="text-xs uppercase tracking-wider opacity-70">
              Total Supply
            </TerminalText>
          </div>
          <div className="text-3xl font-mono [text-shadow:var(--glow-strength)]">
            {totalSupply.toLocaleString()}
          </div>
          <TerminalText className="text-xs opacity-50">TURKEY COINS</TerminalText>
        </DataPanel>

        <DataPanel status="active" className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--phosphor-accent)]" />
            <TerminalText className="text-xs uppercase tracking-wider opacity-70">
              Active Wallets
            </TerminalText>
          </div>
          <div className="text-3xl font-mono [text-shadow:var(--glow-strength)]">
            {activeUsers}
          </div>
          <TerminalText className="text-xs opacity-50">CONNECTED</TerminalText>
        </DataPanel>

        <DataPanel status="syncing" className="space-y-3">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-[var(--phosphor-accent)]" />
            <TerminalText className="text-xs uppercase tracking-wider opacity-70">
              Network Status
            </TerminalText>
          </div>
          <SignalMeter value={98} label="UPTIME" />
          <SignalMeter value={92} label="SYNC" />
        </DataPanel>
      </div>

      {/* Leaderboard */}
      <DataPanel title="[ LEADERBOARD ]" status="idle">
        <div className="space-y-2 md:hidden">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="space-y-2 border border-[var(--phosphor-primary)] border-opacity-20 bg-[var(--bg-core)] p-3"
            >
              <div className="flex items-center justify-between">
                <TerminalText className="text-sm">
                  {user.rank === 1 && '🥇'}
                  {user.rank === 2 && '🥈'}
                  {user.rank === 3 && '🥉'}
                  {user.rank > 3 && `#${user.rank}`}
                </TerminalText>
                <TerminalText className="text-sm" glow={user.rank === 1}>
                  {user.balance.toLocaleString()} TC
                </TerminalText>
              </div>
              <div className="flex items-center gap-2">
                <TerminalText glow={user.rank <= 3} className="text-sm">
                  {user.username}
                </TerminalText>
                {user.isAdmin && (
                  <span className="text-xs px-1 border border-[var(--phosphor-warning)] text-[var(--phosphor-warning)]">
                    ADMIN
                  </span>
                )}
              </div>
              <TerminalText className="text-xs opacity-70 font-mono break-all">
                {user.walletAddress}
              </TerminalText>
            </div>
          ))}
        </div>

        <div className="hidden space-y-2 md:block">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 pb-2 border-b border-[var(--phosphor-primary)] opacity-50">
            <TerminalText className="text-xs col-span-1">RANK</TerminalText>
            <TerminalText className="text-xs col-span-4">USERNAME</TerminalText>
            <TerminalText className="text-xs col-span-5">WALLET ADDRESS</TerminalText>
            <TerminalText className="text-xs col-span-2 text-right">BALANCE</TerminalText>
          </div>

          {/* Rows */}
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 py-3 border-b border-[var(--phosphor-primary)] border-opacity-20 hover:bg-[var(--bg-core)] transition-colors"
            >
              <div className="col-span-1">
                <TerminalText className="text-sm">
                  {user.rank === 1 && '🥇'}
                  {user.rank === 2 && '🥈'}
                  {user.rank === 3 && '🥉'}
                  {user.rank > 3 && `#${user.rank}`}
                </TerminalText>
              </div>
              <div className="col-span-4 flex items-center gap-2">
                <TerminalText glow={user.rank <= 3} className="text-sm">
                  {user.username}
                </TerminalText>
                {user.isAdmin && (
                  <span className="text-xs px-1 border border-[var(--phosphor-warning)] text-[var(--phosphor-warning)]">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="col-span-5">
                <TerminalText className="text-xs opacity-70 font-mono">
                  {user.walletAddress}
                </TerminalText>
              </div>
              <div className="col-span-2 text-right">
                <TerminalText className="text-sm" glow={user.rank === 1}>
                  {user.balance.toLocaleString()} TC
                </TerminalText>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>

      {/* Recent Activity */}
      <DataPanel title="[ RECENT TRANSACTIONS ]" status="idle">
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col gap-2 py-2 border-b border-[var(--phosphor-primary)] border-opacity-20 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TerminalText className="text-xs opacity-70">
                    {new Date(tx.timestamp).toLocaleString()}
                  </TerminalText>
                  <span className={`text-xs px-1 border ${
                    tx.type === 'issued' ? 'border-[var(--phosphor-accent)] text-[var(--phosphor-accent)]' :
                    tx.type === 'reward' ? 'border-[var(--phosphor-primary)] text-[var(--phosphor-primary)]' :
                    'border-gray-500 text-gray-500'
                  }`}>
                    {tx.type.toUpperCase()}
                  </span>
                </div>
                <TerminalText className="text-sm break-words">
                  {tx.from} → {tx.to}
                </TerminalText>
                {tx.note && (
                  <TerminalText className="text-xs opacity-50 break-words">
                    {tx.note}
                  </TerminalText>
                )}
              </div>
              <TerminalText className="text-sm sm:pt-0" glow>
                +{tx.amount} TC
              </TerminalText>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
