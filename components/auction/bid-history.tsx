import type { BidHistoryEntry } from "@/components/auction/auction-state";

export function BidHistory({ history }: { history: BidHistoryEntry[] }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between"><p className="eyebrow">Bid history</p><span className="text-xs text-muted-foreground">{history.length} bids</span></div>
      {history.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No bids yet.</p> : (
        <div className="mt-3 divide-y divide-border/40">
          {history.slice(0, 8).map((bid) => (
            <div key={bid.id} className="flex items-center justify-between py-3 text-sm">
              <span className="font-medium">{bid.teamName}</span><span className="numeric font-bold text-gold">{bid.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
