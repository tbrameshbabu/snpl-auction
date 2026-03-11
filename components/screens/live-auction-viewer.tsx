"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Timer,
  User,
  Check,
  X,
  Trophy,
  Wallet,
  Users,
  Loader2,
  Clock,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ─────────────────────── */

interface LiveAuctionViewerProps {
  tournamentId: string;
  onNavigate: (screen: string) => void;
}

interface PlayerData {
  id: string;
  player_id: string;
  base_price: number;
  order_index: number;
  status: string;
  players: {
    id: string;
    name: string;
    profile_image_url?: string;
    role: string;
    batting_hand: string;
    bowling_hand: string;
    rating?: number;
  };
}

interface TeamData {
  id: string;
  name: string;
  short_name: string;
  color: string;
  budget: number;
  spent: number;
  num_players_bought: number;
  max_players: number;
  logo_url?: string | null;
}

interface PlayerResult {
  status: "sold" | "unsold";
  team_id?: string;
  final_price?: number;
  tournament_player_id: string;
}

interface SoldPlayer {
  id: string;
  name: string;
  role: string;
  final_price: number;
  team: {
    id: string;
    name: string;
    short_name: string;
    color: string;
    logo_url?: string | null;
  };
}

/* ─────────────────── Component ─────────────────── */

export function LiveAuctionViewer({ tournamentId, onNavigate }: LiveAuctionViewerProps) {
  /* ── state ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [currentBid, setCurrentBid] = useState(0);
  const [leadingTeamId, setLeadingTeamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // To track last result processed so we don't flash sold/unsold repeatedly
  const [playerResult, setPlayerResult] = useState<PlayerResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [soldCount, setSoldCount] = useState(0);
  const [unsoldCount, setUnsoldCount] = useState(0);

  // Animation trigger state
  const [showBidAnimation, setShowBidAnimation] = useState(false);
  const [previousBid, setPreviousBid] = useState(0);

  // Sold Players List
  const [soldPlayers, setSoldPlayers] = useState<SoldPlayer[]>([]);

  /* ── fetch auction state ── */
  const fetchAuctionState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auction/${tournamentId}/state`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load auction state");
        setLoading(false);
        return;
      }

      // Count existing results
      const results = data.results || [];
      setSoldCount(results.filter((r: any) => r.status === "sold").length);
      setUnsoldCount(results.filter((r: any) => r.status === "unsold").length);

      // Teams - calculate players bought count and spent from results
      const teamCounts = new Map<string, number>();
      const teamSpent = new Map<string, number>();
      const parsedSoldPlayers: SoldPlayer[] = [];

      results.forEach((r: any) => {
        if (r.status === 'sold' && r.team_id) {
          teamCounts.set(r.team_id, (teamCounts.get(r.team_id) || 0) + 1);
          teamSpent.set(r.team_id, (teamSpent.get(r.team_id) || 0) + (r.final_price || 0));
          
          if (r.tournament_players?.players && r.teams) {
            parsedSoldPlayers.push({
              id: r.id,
              name: r.tournament_players.players.name,
              role: r.tournament_players.players.role,
              final_price: r.final_price,
              team: {
                id: r.teams.id,
                name: r.teams.name,
                short_name: r.teams.short_name,
                color: r.teams.color,
                logo_url: r.teams.logo_url,
              }
            });
          }
        }
      });
      
      setSoldPlayers(parsedSoldPlayers);

      const fetchedTeams: TeamData[] = (data.teams || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        short_name: t.short_name || t.name.charAt(0),
        color: t.color || "#F4A261",
        budget: t.budget ?? 0,
        spent: teamSpent.get(t.id) || 0,
        logo_url: t.logo_url || null,
        num_players_bought: teamCounts.get(t.id) || 0,
        max_players: t.max_players ?? 8,
      }));
      setTeams(fetchedTeams);

      // Current Player
      if (data.currentPlayer) {
        setAllPlayers([data.currentPlayer]);
        
        // This relies on the bidding tracking that was local to auctioneer
        // Without a central bid DB right now, we can sort of infer latest bid 
        // from a new API or we have to just show what the auctioneer saved 
        // actually /state does not return current leadingBid.
        // For a hackathon viewer we can just show the base price or we need 
        // to have the state API return the latest bid.
        // Wait, right now the state API only returns results and current pending player.
        // It DOES NOT store live bids in the DB until SOLD.
        // This is a limitation. If we want it strictly live, we would need 
        // either an active_bids table or realtime.
        // Since we can't easily add realtime in 1 minute, we will just show 
        // the current player and wait for the "sold" result.
        
        setCurrentBid(data.currentPlayer.base_price);
        setTimeLeft(15);
        setIsTimerRunning(true);
        setShowResult(false);
        setPlayerResult(null);
        setLeadingTeamId(null);
      } else {
        setAllPlayers([]);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }, [tournamentId]);

  /* Polling every 3 seconds to catch when a player is "Sold" or changes */
  useEffect(() => {
    fetchAuctionState();
    const interval = setInterval(() => {
      fetchAuctionState();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchAuctionState]);

  /* ── current player ── */
  const currentPlayer = allPlayers[0] || null;
  const isAuctionOver = !currentPlayer && !loading;

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground mt-4">Connecting to live auction...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="glass rounded-xl p-6 text-center max-w-sm">
          <p className="text-destructive mb-4">{error}</p>
        </div>
      </div>
    );
  }

  /* ─── Auction Over ─── */
  if (isAuctionOver) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-20">
        <Trophy className="h-16 w-16 text-gold mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Auction Complete
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          All players have been auctioned. {soldCount} sold, {unsoldCount}{" "}
          unsold.
        </p>
        <Button
          size="lg"
          onClick={() => onNavigate("results")}
          className="bg-gold text-background hover:bg-gold/90 font-semibold w-full max-w-xs"
        >
          View Final Results
        </Button>
      </div>
    );
  }

  if (!currentPlayer) return null;

  const playerInfo = currentPlayer.players;
  const totalPending = allPlayers.filter(
    (p) => p.status === "pending" || p.status === "re_auction"
  ).length;

  return (
    <div className="pb-8 flex flex-col">
      {/* Top Status Bar */}
      <header className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/15">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />
            <span className="text-xs font-bold text-neon">LIVE FOR ALL</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {soldCount + unsoldCount + 1} of{" "}
            {soldCount + unsoldCount + totalPending}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {soldCount} sold / {unsoldCount} unsold
          </span>
        </div>
      </header>

      {/* Player Card */}
      <section className="px-4 mb-4" aria-label="Current player on auction">
        <div className="glass rounded-2xl p-4 relative overflow-hidden ring-1 ring-gold/20 shadow-[0_0_30px_hsl(var(--gold)/0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-4 relative">
            {playerInfo.profile_image_url ? (
              <img
                src={playerInfo.profile_image_url}
                alt={playerInfo.name}
                className="h-20 w-20 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 py-1">
              <h2 className="text-xl font-bold text-foreground truncate">
                {playerInfo.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-gold/15 text-gold font-bold uppercase tracking-wider">
                  {playerInfo.role?.replace("_", " ") || "Player"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {playerInfo.batting_hand}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-0.5">
                    Base
                  </span>
                  <p className="text-sm font-black text-gold">
                    {currentPlayer.base_price}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-0.5">
                    Rating
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {playerInfo.rating || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-0.5">
                    Bowl
                  </span>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {playerInfo.bowling_hand || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current State Notice */}
      <section className="px-4 mb-4" aria-label="Auction state info">
        <div className="glass border-gold/30 rounded-xl p-4 text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Up for auction
          </span>
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-gold font-mono">
                {currentPlayer.base_price}
              </span>
              <span className="text-sm text-gold font-bold">pts BASE</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Waiting for auctioneer to lock bids
          </p>
        </div>
      </section>

      {/* Team Grid (Read-only) */}
      <section className="px-4 flex-1 flex flex-col gap-3" aria-label="Participating teams">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-3.5 w-3.5 text-gold" />
          <h3 className="text-sm font-semibold text-foreground">
            Team Status
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {teams.map((team) => {
            const remainingBudget = team.budget - team.spent;

            return (
              <div
                key={team.id}
                className="glass rounded-xl p-2.5 flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: team.color || '#F4A261' }} />
                
                <div className="mt-1 mb-1.5 flex justify-center w-full">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    shortName={team.short_name}
                    color={team.color}
                    size="sm"
                  />
                </div>

                <h4 className="text-[10px] font-bold text-foreground leading-tight line-clamp-2 min-h-[1.75rem] mb-1">
                  {team.name}
                </h4>

                <div className="w-full bg-secondary/50 rounded flex justify-between px-1.5 py-1 mt-auto">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-muted-foreground uppercase">Budget</span>
                    <span className={cn(
                      "text-[10px] font-black font-mono",
                      remainingBudget < 200 ? "text-destructive" : "text-foreground"
                    )}>{remainingBudget}</span>
                  </div>
                  <div className="w-[1px] bg-border/50" />
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-muted-foreground uppercase">Roster</span>
                    <span className="text-[10px] font-bold text-foreground">{team.num_players_bought}/{team.max_players}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Sold Players */}
      {soldPlayers.length > 0 && (
        <section className="px-4 mt-8 flex-1 flex flex-col gap-3" aria-label="Recently sold players">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Recently Sold
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            {soldPlayers.slice(0, 10).map((player) => (
              <div 
                key={player.id}
                className="glass rounded-xl p-3 flex items-center gap-3 relative overflow-hidden"
              >
                {/* Team Color Accent Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1" 
                  style={{ backgroundColor: player.team.color || '#F4A261' }} 
                />

                {/* Player Info */}
                <div className="flex-1 min-w-0 pl-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {player.name}
                    </h4>
                    <span className="text-xs font-black text-gold">
                      {player.final_price} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/50 text-muted-foreground uppercase tracking-wider">
                      {player.role.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Sold to {player.team.short_name}
                      </span>
                      <TeamLogo 
                        logoUrl={player.team.logo_url}
                        shortName={player.team.short_name}
                        color={player.team.color}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
