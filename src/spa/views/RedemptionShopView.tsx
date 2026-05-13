import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import DecryptedText from '../../components/DecryptedText';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';
import { getLeaderboardWithHeaders, getShopItems, postShopClaim } from '../lib/api';
import type { RedemptionEvent, ShopItem } from '../lib/types';

type Notice = { tone: 'success' | 'error'; text: string } | null;
type ClaimingState = { itemId: string; stage: 'confirm' | 'submitting' } | null;

function useMyBalance(address: string | undefined) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    void getLeaderboardWithHeaders().then((result) => {
      if (cancelled) return;
      if (!result.ok) return;
      const me = result.rows.find((r) => r.walletAddress.toLowerCase() === address.toLowerCase());
      setBalance(me?.balance ?? '0');
    });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return balance;
}

function RedemptionStatusBadge({ status }: { status: RedemptionEvent['status'] }) {
  const map: Record<RedemptionEvent['status'], string> = {
    pending: 'redemption-status-badge is-pending',
    fulfilled: 'redemption-status-badge is-fulfilled',
    cancelled: 'redemption-status-badge is-cancelled',
  };
  return <span className={map[status]}>{status.toUpperCase()}</span>;
}

export function RedemptionShopView() {
  const { address, isConnected } = useAccount();
  const balance = useMyBalance(address);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [myClaims, setMyClaims] = useState<RedemptionEvent[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [claiming, setClaiming] = useState<ClaimingState>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingItems(true);
      const result = await getShopItems();
      if (cancelled) return;

      if (!result.ok || !result.data) {
        setLoadError(result.error || 'Could not load shop items.');
        setLoadingItems(false);
        return;
      }

      setItems(result.data);
      setLoadError(null);
      setLoadingItems(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function startClaim(itemId: string) {
    setNotice(null);
    setClaiming({ itemId, stage: 'confirm' });
  }

  function cancelClaim() {
    setClaiming(null);
  }

  async function submitClaim(itemId: string) {
    if (!isConnected || !address) {
      setNotice({ tone: 'error', text: 'Connect a wallet to claim rewards.' });
      setClaiming(null);
      return;
    }

    setClaiming({ itemId, stage: 'submitting' });

    const result = await postShopClaim({ walletAddress: address, itemId });

    if (!result.ok || !result.data?.ok) {
      setNotice({ tone: 'error', text: result.error || result.data?.error || 'Claim failed.' });
      setClaiming(null);
      return;
    }

    const item = items.find((i) => i.id === itemId);
    setMyClaims((prev) => [
      {
        id: result.data!.id ?? '',
        walletAddress: address,
        itemId,
        itemLabel: item?.label ?? itemId,
        cost: item?.cost ?? '0',
        status: 'pending',
        adminNote: null,
        createdAt: new Date().toISOString(),
        fulfilledAt: null,
        cancelledAt: null,
      },
      ...prev,
    ]);

    setNotice({
      tone: 'success',
      text: `Claim submitted! Admin will fulfill your "${item?.label ?? 'reward'}" shortly.`,
    });
    setClaiming(null);
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <ShoppingBag size={26} />
            <DecryptedText text="THE GOBBLE MART" animateOn="view" sequential speed={38} />
          </h1>
          <TerminalText as="p" className="muted-text">
            SPEND YOUR TURKEY COINS. CLAIM REAL REWARDS. ADMIN FULFILS OUT OF BAND.
          </TerminalText>
        </div>
        <StatusBadge status={isConnected ? 'online' : 'offline'}>
          {isConnected && balance !== null ? `${balance} TC` : 'WALLET NOT CONNECTED'}
        </StatusBadge>
      </div>

      {loadError ? <p className="error-text">{loadError}</p> : null}
      {notice ? <p className={notice.tone === 'success' ? 'success-text' : 'error-text'}>{notice.text}</p> : null}

      <DataPanel title="[ AVAILABLE REWARDS ]" status={loadingItems ? 'syncing' : 'active'}>
        {loadingItems ? (
          <p className="muted-text">Loading rewards...</p>
        ) : items.length === 0 ? (
          <p className="muted-text">No rewards available right now. Check back later.</p>
        ) : (
          <div className="shop-grid">
            {items.map((item) => {
              const isClaiming = claiming?.itemId === item.id;
              return (
                <div key={item.id} className="shop-item-card">
                  <div className="shop-item-header">
                    <TerminalText className="shop-item-label">{item.label}</TerminalText>
                    <span className="shop-item-cost">{item.cost} TC</span>
                  </div>
                  <TerminalText as="p" className="shop-item-description muted-text">
                    {item.description}
                  </TerminalText>
                  {isClaiming && claiming.stage === 'confirm' ? (
                    <div className="shop-confirm-inline">
                      <TerminalText className="muted-text">Spend {item.cost} TC?</TerminalText>
                      <div className="shop-confirm-actions">
                        <button
                          type="button"
                          className="primary-cta"
                          onClick={() => void submitClaim(item.id)}
                        >
                          CONFIRM
                        </button>
                        <button type="button" className="turkey-wheel-retry-btn" onClick={cancelClaim}>
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="primary-cta shop-claim-btn"
                      onClick={() => startClaim(item.id)}
                      disabled={!isConnected || (isClaiming && claiming.stage === 'submitting')}
                    >
                      {isClaiming && claiming.stage === 'submitting' ? 'CLAIMING...' : 'CLAIM'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DataPanel>

      {myClaims.length > 0 ? (
        <DataPanel title="[ MY CLAIMS ]" status="active">
          <div className="shop-claims-list">
            {myClaims.map((claim) => (
              <div key={claim.id} className="shop-claim-row">
                <TerminalText className="shop-claim-label">{claim.itemLabel}</TerminalText>
                <span className="shop-item-cost">{claim.cost} TC</span>
                <RedemptionStatusBadge status={claim.status} />
              </div>
            ))}
          </div>
        </DataPanel>
      ) : null}
    </div>
  );
}
