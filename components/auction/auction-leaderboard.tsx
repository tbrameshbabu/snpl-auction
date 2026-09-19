import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import type {
  AuctionSale,
  TeamSummary,
} from "@/components/auction/auction-state";

interface AuctionLeaderboardProps {
  teams: TeamSummary[];
  results: AuctionSale[];
  myTeamId?: string | null;
}
export function AuctionLeaderboard({
  teams,
  results,
  myTeamId,
}: AuctionLeaderboardProps) {
  const [expanded, setExpanded] = useState<string | null>(myTeamId ?? null);
  return (
    <div className="space-y-3">
      {teams
        .slice()
        .sort((a, b) => b.spent - a.spent)
        .map((team, index) => {
          const roster = results.filter(
            (result) => result.status === "sold" && result.team_id === team.id,
          );
          const open = expanded === team.id;
          return (
            <div
              key={team.id}
              className={`glass overflow-hidden rounded-xl ${myTeamId === team.id ? "border border-gold/30" : ""}`}
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : team.id)}
                className="flex w-full items-center gap-3 p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="numeric w-6 text-center font-bold text-gold">
                  #{index + 1}
                </span>
                <TeamLogo
                  logoUrl={team.logo_url}
                  shortName={team.short_name}
                  color={team.color}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {team.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {team.playersBought} players · {team.spent} spent
                  </span>
                </span>
                {myTeamId === team.id && (
                  <span className="status-chip bg-gold/15 text-gold">You</span>
                )}
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {open && (
                <div className="border-t border-border/40 p-4">
                  {roster.length ? (
                    <div className="divide-y divide-border/40">
                      {roster.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span>
                            {sale.tournament_players?.players?.name ?? "Player"}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {sale.tournament_players?.players?.role ?? ""}
                            </span>
                          </span>
                          <span className="numeric text-gold">
                            {sale.final_price ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No players bought yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
