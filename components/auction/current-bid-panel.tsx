import type { BiddingView } from "@/components/auction/auction-state";

export function CurrentBidPanel({
  bidding,
  leadingTeamName,
}: {
  bidding: BiddingView;
  leadingTeamName?: string;
}) {
  return (
    <div className="glass rounded-2xl border border-gold/35 p-5 text-center">
      <p className="eyebrow">Current bid</p>
      <p className="numeric mt-2 text-5xl font-black text-gold">
        {bidding.currentAmount}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {leadingTeamName
          ? `Leading: ${leadingTeamName}`
          : "Opening at base price — no bids yet"}
      </p>
    </div>
  );
}
