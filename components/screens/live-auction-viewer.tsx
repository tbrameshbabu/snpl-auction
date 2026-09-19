"use client";

import { Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BidHistory } from "@/components/auction/bid-history";
import { CurrentBidPanel } from "@/components/auction/current-bid-panel";
import { PlayerCard } from "@/components/auction/player-card";
import { TeamStatusGrid } from "@/components/auction/team-status-grid";
import {
  countResults,
  deriveBidding,
  deriveTeamSummaries,
  getAuctionPhase,
  type AuctionState,
} from "@/components/auction/auction-state";

interface LiveAuctionViewerProps {
  state: AuctionState;
  lastUpdated: Date | null;
  onViewResults?: () => void;
}

export function LiveAuctionViewer({
  state,
  lastUpdated,
  onViewResults,
}: LiveAuctionViewerProps) {
  const phase = getAuctionPhase(state);
  const counts = countResults(state.results);
  const teams = deriveTeamSummaries(state);
  const bidding = deriveBidding(state);
  const leadingTeam = teams.find((team) => team.id === bidding.leadingTeamId);
  const updated = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString()}`
    : "Awaiting update";

  if (phase === "not_started")
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <span className="status-chip bg-secondary text-muted-foreground">
          {state.tournament.status}
        </span>
        <h2 className="mt-4 text-xl font-bold">
          Auction hasn&apos;t started yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The auctioneer will bring the tournament live when it is ready.
        </p>
      </div>
    );
  if (phase === "completed")
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Trophy className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-4 text-2xl font-bold">Auction Complete</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {counts.sold} sold · {counts.unsold} unsold
        </p>
        {onViewResults && (
          <Button
            onClick={onViewResults}
            className="mt-6 bg-gold text-background hover:bg-gold/90"
          >
            View Results
          </Button>
        )}
      </div>
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Live auction</p>
          <h2 className="text-xl font-bold">
            Player #{counts.total + (state.currentPlayer ? 1 : 0)}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="status-chip bg-neon/15 text-neon">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
            LIVE
          </span>
          <span className="text-xs text-muted-foreground">
            {counts.sold} sold / {counts.unsold} unsold
          </span>
          <span className="text-xs text-muted-foreground">{updated}</span>
        </div>
      </div>
      {phase === "waiting" ? (
        <>
          <div className="glass rounded-2xl p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-gold" />
            <h3 className="mt-3 text-lg font-semibold">
              Waiting for the auctioneer to bring up the next player
            </h3>
          </div>
          <TeamStatusGrid teams={teams} bidding={bidding} />
        </>
      ) : (
        <>
          <>
            {state.currentPlayer && <PlayerCard player={state.currentPlayer} />}
          </>
          <CurrentBidPanel
            bidding={bidding}
            leadingTeamName={leadingTeam?.name}
          />
          <BidHistory history={bidding.history} />
          <TeamStatusGrid teams={teams} bidding={bidding} />
        </>
      )}
      {state.results.filter((result) => result.status === "sold").slice(0, 5)
        .length > 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="eyebrow">Recently sold</p>
          <div className="mt-3 divide-y divide-border/40">
            {state.results
              .filter((result) => result.status === "sold")
              .slice(0, 5)
              .map((result) => (
                <div
                  key={result.id}
                  className="flex justify-between py-2 text-sm"
                >
                  <span>
                    {result.tournament_players?.players?.name ?? "Player"} →{" "}
                    {result.teams?.name ?? "Team"}
                  </span>
                  <span className="numeric text-gold">
                    {result.final_price ?? 0}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
