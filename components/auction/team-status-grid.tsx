import { TeamLogo } from "@/components/team-logo";
import type { BidBlocker, BiddingView, TeamSummary } from "@/components/auction/auction-state";

export function TeamStatusGrid({ teams, bidding, bidAmount, onBid, disabled, interactive = false }: {
  teams: TeamSummary[];
  bidding: BiddingView;
  bidAmount?: number;
  onBid?: (team: TeamSummary) => void;
  disabled?: boolean;
  interactive?: boolean;
}) {
  const label: Record<BidBlocker, string> = { leading: "Leading", budget: "Low Budget", roster: "Roster Full" };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {teams.map((team) => {
        const blocker = bidAmount == null ? null : team.id === bidding.leadingTeamId ? "leading" : team.playersBought >= team.maxPlayers ? "roster" : bidAmount > team.remaining ? "budget" : null;
        const card = (
          <div className="glass relative rounded-xl p-3 text-left transition-colors">
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ backgroundColor: team.color }} />
            <div className="flex items-center gap-2 pt-1"><TeamLogo logoUrl={team.logo_url} shortName={team.short_name} color={team.color} size="sm" /><span className="truncate text-sm font-semibold">{team.name}</span></div>
            <div className="mt-3 flex justify-between text-xs"><span className="text-muted-foreground">Budget <b className="numeric text-foreground">{team.remaining}</b></span><span className="text-muted-foreground">Roster <b className="numeric text-foreground">{team.playersBought}/{team.maxPlayers}</b></span></div>
            {blocker && <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label[blocker]}</p>}
            {interactive && !blocker && <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-gold">Bid {bidAmount}</p>}
          </div>
        );
        return interactive && onBid ? <button key={team.id} type="button" onClick={() => onBid(team)} disabled={disabled || Boolean(blocker)} className="rounded-xl text-left disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{card}</button> : <div key={team.id}>{card}</div>;
      })}
    </div>
  );
}
