"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Timer,
  User,
  Check,
  X,
  ChevronRight,
  Gavel,
  ArrowUp,
  Trophy,
  Wallet,
  Users,
  RotateCcw,
  Loader2,
  CheckCircle,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ─────────────────────── */

interface BiddingScreenProps {
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

interface BidEntry {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
}

type PlayerResult = "sold" | "unsold" | null;

const getBidIncrement = (currentBid: number) => {
  if (currentBid < 100) return 10;
  if (currentBid < 200) return 20;
  if (currentBid < 500) return 30;
  return 50;
};

/* ─────────────────── Component ─────────────────── */

export function BiddingScreen({ tournamentId, onNavigate }: BiddingScreenProps) {
  /* ── state ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerData[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [leadingTeamId, setLeadingTeamId] = useState<string | null>(null);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [playerResult, setPlayerResult] = useState<PlayerResult>(null);
  const [showResult, setShowResult] = useState(false);
  const [showBidAnimation, setShowBidAnimation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [soldCount, setSoldCount] = useState(0);
  const [unsoldCount, setUnsoldCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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

      // Teams - calculate players bought count from results
      const teamCounts = new Map<string, number>();
      results.forEach((r: any) => {
        if (r.status === 'sold' && r.team_id) {
          teamCounts.set(r.team_id, (teamCounts.get(r.team_id) || 0) + 1);
        }
      });

      const fetchedTeams: TeamData[] = (data.teams || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        short_name: t.short_name || t.name.charAt(0),
        color: t.color || "#F4A261",
        budget: t.budget ?? 0,
        spent: t.spent ?? 0,
        logo_url: t.logo_url || null,
        num_players_bought: teamCounts.get(t.id) || 0,
        max_players: t.max_players ?? 8,
      }));
      setTeams(fetchedTeams);

      // Pending players — build the queue
      if (data.currentPlayer) {
        // We have an active player
        setAllPlayers([data.currentPlayer]);
        setCurrentPlayerIndex(0);
        setCurrentBid(data.currentPlayer.base_price);
        setTimeLeft(15);
        setIsTimerRunning(true);
        setAvailablePlayers([]); // Clear available list since we're in active bidding
      } else {
        // No active player — let's fetch available players for manual selection
        try {
          const availRes = await fetch(`/api/auction/${tournamentId}/available-players`);
          if (availRes.ok) {
            const availData = await availRes.json();
            setAvailablePlayers(availData.availablePlayers || []);
          }
        } catch (availErr) {
          console.error("Failed to fetch available players:", availErr);
        }
        
        // No more active players — clear current player state
        setAllPlayers([]);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchAuctionState();
  }, [fetchAuctionState]);

  /* ── timer ── */
  useEffect(() => {
    if (!isTimerRunning || showResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, showResult]);

  /* ── current player ── */
  const currentPlayer = allPlayers[0] || null;
  const isAuctionOver = !currentPlayer && availablePlayers.length === 0 && !loading && soldCount + unsoldCount > 0;

  /* ── place bid (local only — auctioneer places bids on behalf of teams) ── */
  const handleTeamBid = useCallback(
    async (teamId: string) => {
      if (showResult || !currentPlayer || submitting) return;
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;

      const newBid =
        leadingTeamId === null
          ? currentPlayer.base_price
          : currentBid + getBidIncrement(currentBid);
      const remainingBudget = team.budget - team.spent;

      if (newBid > remainingBudget) return;

      // Call bid API
      setSubmitting(true);
      try {
        const res = await fetch(`/api/auction/${tournamentId}/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournament_id: tournamentId,
            tournament_player_id: currentPlayer.id,
            team_id: teamId,
            amount: newBid,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          console.error("Bid error:", data.error);
          setSubmitting(false);
          return;
        }

        // Update local state
        setCurrentBid(newBid);
        setLeadingTeamId(teamId);
        setTimeLeft(15);
        setIsTimerRunning(true);
        setShowBidAnimation(true);

        setBidHistory((prev) => [
          {
            id: Date.now().toString(),
            teamId,
            teamName: team.name,
            amount: newBid,
          },
          ...prev.slice(0, 19),
        ]);

        setTimeout(() => setShowBidAnimation(false), 500);
      } catch (err) {
        console.error("Bid error:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [teams, currentBid, leadingTeamId, currentPlayer, showResult, submitting, tournamentId]
  );

  /* ── mark sold ── */
  const handleSold = useCallback(async () => {
    if (!leadingTeamId || !currentPlayer || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auction/${tournamentId}/sold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_player_id: currentPlayer.id,
          team_id: leadingTeamId,
          final_price: currentBid,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Sold error:", data.error);
        setSubmitting(false);
        return;
      }

      setIsTimerRunning(false);
      setPlayerResult("sold");
      setShowResult(true);
      setSoldCount((prev) => prev + 1);

      // Update team spent locally
      setTeams((prev) =>
        prev.map((t) =>
          t.id === leadingTeamId
            ? { ...t, spent: t.spent + currentBid, num_players_bought: t.num_players_bought + 1 }
            : t
        )
      );
    } catch (err) {
      console.error("Sold error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [leadingTeamId, currentBid, currentPlayer, submitting, tournamentId]);

  /* ── mark unsold ── */
  const handleUnsold = useCallback(async () => {
    if (!currentPlayer || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auction/${tournamentId}/unsold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_player_id: currentPlayer.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Unsold error:", data.error);
        setSubmitting(false);
        return;
      }

      setIsTimerRunning(false);
      setPlayerResult("unsold");
      setShowResult(true);
      setUnsoldCount((prev) => prev + 1);
    } catch (err) {
      console.error("Unsold error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [currentPlayer, submitting, tournamentId]);

  /* ── next player — re-fetch state ── */
  const handleNext = useCallback(async () => {
    // Reset local state
    setBidHistory([]);
    setLeadingTeamId(null);
    setPlayerResult(null);
    setShowResult(false);
    setLoading(true);
    // Re-fetch to get next pending player
    await fetchAuctionState();
  }, [fetchAuctionState]);

  /* ── handle re-auction unsold ── */
  const handleReAuction = useCallback(async () => {
    if (!confirm(`Are you sure you want to re-auction all ${unsoldCount} unsold players?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/auction/${tournamentId}/re-auction`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to re-auction");
      await fetchAuctionState();
    } catch (err) {
      console.error("Re-auction error:", err);
    } finally {
      setLoading(false);
    }
  }, [unsoldCount, tournamentId, fetchAuctionState]);

  /* ── handle complete tournament ── */
  const handleComplete = useCallback(async () => {
    if (!confirm('Are you sure you want to mark this tournament as complete? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/auction/${tournamentId}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to complete tournament');
        return;
      }
      onNavigate("results");
    } catch (err) {
      console.error("Complete error:", err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, onNavigate]);

  /* ── reset current bidding ── */
  const handleReset = useCallback(() => {
    if (!currentPlayer) return;
    setCurrentBid(currentPlayer.base_price);
    setLeadingTeamId(null);
    setBidHistory([]);
    setTimeLeft(15);
    setIsTimerRunning(true);
    setPlayerResult(null);
    setShowResult(false);
  }, [currentPlayer]);

  const leadingTeam = teams.find((t) => t.id === leadingTeamId);

  /* ── activate player ── */
  const handleActivatePlayer = useCallback(async (playerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auction/${tournamentId}/activate-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_player_id: playerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to activate player");
      }
      // Re-fetch state to start bidding
      await fetchAuctionState();
    } catch (err) {
      console.error("Activate player error:", err);
      setLoading(false);
    }
  }, [tournamentId, fetchAuctionState]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="glass rounded-xl p-6 text-center max-w-sm">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => onNavigate("overview")}>Back</Button>
        </div>
      </div>
    );
  }

  /* ─── Auction Over ─── */
  if (isAuctionOver) {
    return (
      <div className="pb-24 flex flex-col items-center justify-center px-5 py-20">
        <Trophy className="h-16 w-16 text-gold mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Auction Complete
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          All players have been auctioned. {soldCount} sold, {unsoldCount}{" "}
          unsold.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            size="lg"
            onClick={() => onNavigate("results")}
            className="bg-gold text-background hover:bg-gold/90 font-semibold w-full"
          >
            View Results
          </Button>

          {unsoldCount > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleReAuction}
              disabled={loading}
              className="border-gold/50 text-gold hover:bg-gold/10 w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Re-auction {unsoldCount} Unsold
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={handleComplete}
            disabled={loading}
            className="border-neon/50 text-neon hover:bg-neon/10 w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Complete Tournament
          </Button>
        </div>
      </div>
    );
  }

  if (!currentPlayer) {
    const filteredPlayers = availablePlayers.filter((tp) => {
      const q = searchQuery.toLowerCase();
      const nameMatch = tp.players?.name?.toLowerCase().includes(q);
      const roleMatch = tp.players?.role?.replace('_', ' ').toLowerCase().includes(q);
      return nameMatch || roleMatch;
    });

    return (
      <div className="pb-24 flex flex-col px-4 pt-8 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-gold" />
          Select Next Player to Auction
        </h2>
        
        {availablePlayers.length === 0 ? (
          <div className="glass p-8 rounded-xl text-center">
            <p className="text-muted-foreground text-sm">No players available to auction.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 bg-background/50 border-gold/30 focus-visible:ring-gold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="glass p-8 rounded-xl text-center">
                <p className="text-muted-foreground text-sm">No players found matching "{searchQuery}".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((tp) => (
                  <div key={tp.id} className="glass rounded-xl p-4 flex items-center justify-between border-transparent hover:border-gold/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-gold/10 border border-gold/20">
                        {tp.players?.profile_image_url ? (
                          <img
                            src={tp.players.profile_image_url}
                            alt={tp.players.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gold">
                            {tp.players?.name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">{tp.players?.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                          {tp.players?.role.replace('_', ' ')} • Base: {tp.base_price} pts
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleActivatePlayer(tp.id)}
                      className="bg-gold text-background hover:bg-gold/90 shrink-0 font-semibold"
                      size="sm"
                      disabled={loading}
                    >
                      <Gavel className="h-3.5 w-3.5 mr-1.5" />
                      Start Auction
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const playerInfo = currentPlayer.players;
  const totalPending = allPlayers.filter(
    (p) => p.status === "pending" || p.status === "re_auction"
  ).length;

  /* ─── Main Bidding UI ─── */
  return (
    <div className="pb-24 flex flex-col">
      {/* Top Status Bar */}
      <header className="px-4 pt-8 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/15">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />
            <span className="text-xs font-bold text-neon">LIVE</span>
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
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              timeLeft <= 5 && timeLeft > 0
                ? "bg-destructive/20"
                : "bg-secondary"
            )}
          >
            <Timer
              className={cn(
                "h-3.5 w-3.5",
                timeLeft <= 5 && timeLeft > 0
                  ? "text-destructive"
                  : "text-gold"
              )}
            />
            <span
              className={cn(
                "text-sm font-mono font-bold",
                timeLeft <= 5 && timeLeft > 0
                  ? "text-destructive"
                  : "text-gold"
              )}
            >
              {timeLeft}s
            </span>
          </div>
        </div>
      </header>

      {/* Player Card */}
      <section className="px-4 mb-3" aria-label="Current player on auction">
        <div className="glass rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-3 relative">
            {playerInfo.profile_image_url ? (
              <img
                src={playerInfo.profile_image_url}
                alt={playerInfo.name}
                className="h-16 w-16 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {playerInfo.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-medium">
                  {playerInfo.role?.replace("_", " ") || "Player"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {playerInfo.batting_hand}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase">
                    Base
                  </span>
                  <p className="text-xs font-bold text-gold">
                    {currentPlayer.base_price}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase">
                    Rating
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {playerInfo.rating || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase">
                    Bowl
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {playerInfo.bowling_hand || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Bid Display */}
      <section className="px-4 mb-3" aria-label="Current bid">
        <div
          className={cn(
            "rounded-xl p-4 text-center transition-all duration-300",
            showBidAnimation ? "animate-pulse-gold" : "",
            "glass border-gold/30"
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {leadingTeamId ? "Current Bid" : "Base Price"}
          </span>
          <div className="flex items-center justify-center gap-2 mt-1">
            {showBidAnimation && (
              <ArrowUp className="h-5 w-5 text-neon animate-bid-up" />
            )}
            <span
              key={currentBid}
              className="text-4xl font-bold text-gold animate-count-up font-mono"
            >
              {currentBid}
            </span>
            <span className="text-sm text-muted-foreground ml-1">pts</span>
          </div>
          {leadingTeam ? (
            <p className="text-xs text-foreground mt-1">
              <span className="text-gold font-semibold">
                {leadingTeam.name}
              </span>{" "}
              is leading
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              No bids yet — select a team to start
            </p>
          )}
        </div>
      </section>

      {/* Sold/Unsold Overlay */}
      {showResult && (
        <div className="px-4 mb-3">
          <div
            className={cn(
              "rounded-xl p-5 text-center border",
              playerResult === "sold"
                ? "bg-neon/10 border-neon/30"
                : "bg-destructive/10 border-destructive/30"
            )}
          >
            {playerResult === "sold" ? (
              <>
                <Check className="h-10 w-10 text-neon mx-auto mb-2" />
                <h3 className="text-lg font-bold text-neon">SOLD!</h3>
                <p className="text-sm text-foreground mt-1">
                  {playerInfo.name} sold to{" "}
                  <span className="font-semibold text-gold">
                    {leadingTeam?.name}
                  </span>{" "}
                  for{" "}
                  <span className="font-bold text-gold font-mono">
                    {currentBid} pts
                  </span>
                </p>
              </>
            ) : (
              <>
                <X className="h-10 w-10 text-destructive mx-auto mb-2" />
                <h3 className="text-lg font-bold text-destructive">UNSOLD</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {playerInfo.name} goes back to the pool
                </p>
              </>
            )}
            <Button
              size="lg"
              onClick={handleNext}
              className="mt-4 bg-gold text-background hover:bg-gold/90 font-semibold w-full"
            >
              Next Player
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Team Bidding Grid & Auctioneer Controls */}
      {!showResult && (
        <section className="px-4 mb-3 flex-1 flex flex-col gap-3" aria-label="Team bidding controls">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gold" />
              <h3 className="text-sm font-semibold text-foreground">
                Teams ({teams.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Bid
            </button>
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-3 gap-2">
            {teams.map((team) => {
              const remainingBudget = team.budget - team.spent;
              const nextBidAmount =
                leadingTeamId === null
                  ? currentPlayer.base_price
                  : currentBid + getBidIncrement(currentBid);
              const canBid =
                remainingBudget >= nextBidAmount &&
                team.id !== leadingTeamId;
              const isLeading = team.id === leadingTeamId;

              return (
                <div
                  key={team.id}
                  className={cn(
                    "glass rounded-xl p-2.5 flex flex-col items-center text-center transition-all duration-300 relative overflow-hidden group hover:border-gold/30",
                    isLeading && "border-gold bg-gold/5 shadow-[0_0_15px_hsl(var(--gold)/0.15)] ring-1 ring-gold"
                  )}
                >
                  {/* Subtle color highlight at top */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: team.color || '#F4A261' }} />
                  
                  {isLeading && (
                    <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                  )}

                  <div className="mt-1 mb-1.5 flex justify-center w-full">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      shortName={team.short_name}
                      color={team.color}
                      size="sm"
                    />
                  </div>

                  <h4 className="text-[10px] font-bold text-foreground leading-tight line-clamp-2 min-h-[1.75rem] mb-1 group-hover:text-gold transition-colors">
                    {team.name}
                  </h4>

                  <div className="w-full bg-secondary/50 rounded flex justify-between px-1.5 py-1 mb-2">
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

                  <div className="w-full mt-auto">
                    {isLeading ? (
                      <div className="h-7 w-full rounded flex items-center justify-center bg-gold/15 text-gold text-[10px] font-black border border-gold/30 uppercase tracking-wider">
                        Leading
                      </div>
                    ) : !canBid ? (
                      <div className="h-7 w-full rounded flex items-center justify-center bg-secondary text-muted-foreground text-[9px] font-medium border border-border/50">
                        {remainingBudget < nextBidAmount ? "Low Budget" : "Out"}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleTeamBid(team.id)}
                        disabled={submitting}
                        className="h-7 w-full px-0 text-[10px] bg-gold text-background hover:bg-gold/90 font-black tracking-wide"
                      >
                        BID {nextBidAmount}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-muted-foreground text-center">
            Next bid is +{getBidIncrement(currentBid)} pts
          </p>

          {/* Auctioneer Controls Container */}
          <div className="glass rounded-xl p-3 border-neon/20 bg-gradient-to-b from-background/50 to-neon/5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={handleSold}
                disabled={!leadingTeamId || submitting}
                className="h-12 bg-neon text-background hover:bg-neon/90 font-black text-sm tracking-widest disabled:opacity-40 shadow-[0_4px_14px_hsl(var(--neon)/0.3)] transition-all active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Check className="h-5 w-5 mr-2" />
                )}
                SOLD FOR {currentBid}
              </Button>
              <Button
                size="lg"
                onClick={handleUnsold}
                disabled={submitting || !!leadingTeamId}
                className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black text-sm tracking-widest disabled:opacity-40 shadow-[0_4px_14px_hsl(var(--destructive)/0.3)] transition-all active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <X className="h-5 w-5 mr-2" />
                )}
                UNSOLD
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Bid History */}
      {bidHistory.length > 0 && !showResult && (
        <section className="px-4" aria-label="Bid history">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="h-3.5 w-3.5 text-gold" />
            <h3 className="text-xs font-semibold text-foreground">
              Bid History
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {bidHistory.slice(0, 6).map((bid, i) => (
              <div
                key={bid.id}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-lg text-xs",
                  i === 0 ? "glass border-gold/20" : "bg-secondary/30"
                )}
              >
                <span
                  className={cn(
                    "font-medium",
                    i === 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {bid.teamName}
                </span>
                <span
                  className={cn(
                    "font-bold font-mono",
                    i === 0 ? "text-gold" : "text-muted-foreground"
                  )}
                >
                  {bid.amount} pts
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
