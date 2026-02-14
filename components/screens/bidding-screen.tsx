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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BiddingScreenProps {
  onNavigate: (screen: string) => void;
}

interface Player {
  id: number;
  name: string;
  role: string;
  batting: string;
  bowling: string;
  base: number;
  rating: number;
  matches: number;
  runs: number;
  average: number;
}

interface Team {
  id: number;
  name: string;
  shortName: string;
  budget: number;
  spent: number;
  players: number;
  maxPlayers: number;
  color: string;
}

interface BidEntry {
  id: number;
  teamId: number;
  teamName: string;
  amount: number;
  timestamp: string;
}

type PlayerResult = "sold" | "unsold" | null;

const playerPool: Player[] = [
  { id: 1, name: "Rohit Sharma", role: "Batsman", batting: "Right Hand", bowling: "Right Arm Off", base: 200, rating: 9.2, matches: 264, runs: 10800, average: 48.6 },
  { id: 2, name: "Jasprit Bumrah", role: "Bowler", batting: "Right Hand", bowling: "Right Arm Fast", base: 180, rating: 9.5, matches: 89, runs: 0, average: 0 },
  { id: 3, name: "Hardik Pandya", role: "All-Rounder", batting: "Right Hand", bowling: "Right Arm Medium", base: 160, rating: 8.8, matches: 92, runs: 2100, average: 33.5 },
  { id: 4, name: "KL Rahul", role: "Batsman", batting: "Right Hand", bowling: "Right Arm Medium", base: 150, rating: 8.5, matches: 72, runs: 4200, average: 45.2 },
  { id: 5, name: "Ravindra Jadeja", role: "All-Rounder", batting: "Left Hand", bowling: "Left Arm Spin", base: 170, rating: 9.0, matches: 197, runs: 3100, average: 36.1 },
  { id: 6, name: "Rishabh Pant", role: "Keeper", batting: "Left Hand", bowling: "-", base: 140, rating: 8.7, matches: 54, runs: 2900, average: 42.3 },
  { id: 7, name: "Shubman Gill", role: "Batsman", batting: "Right Hand", bowling: "Right Arm Leg Spin", base: 130, rating: 8.3, matches: 32, runs: 1800, average: 56.2 },
  { id: 8, name: "Mohammed Siraj", role: "Bowler", batting: "Right Hand", bowling: "Right Arm Fast", base: 120, rating: 8.1, matches: 38, runs: 0, average: 0 },
];

const initialTeams: Team[] = [
  { id: 1, name: "Royal Strikers", shortName: "RST", budget: 1000, spent: 0, players: 0, maxPlayers: 8, color: "bg-blue-500" },
  { id: 2, name: "Thunder Hawks", shortName: "THK", budget: 1000, spent: 0, players: 0, maxPlayers: 8, color: "bg-amber-500" },
  { id: 3, name: "Storm Breakers", shortName: "SBR", budget: 1000, spent: 0, players: 0, maxPlayers: 8, color: "bg-emerald-500" },
  { id: 4, name: "Golden Eagles", shortName: "GEG", budget: 1000, spent: 0, players: 0, maxPlayers: 8, color: "bg-red-500" },
  { id: 5, name: "Neon Knights", shortName: "NKT", budget: 1000, spent: 0, players: 0, maxPlayers: 8, color: "bg-purple-500" },
];

const BID_INCREMENT = 20;

export function BiddingScreen({ onNavigate }: BiddingScreenProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(playerPool[0].base);
  const [leadingTeamId, setLeadingTeamId] = useState<number | null>(null);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [playerResult, setPlayerResult] = useState<PlayerResult>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<{ playerId: number; result: "sold" | "unsold"; teamId?: number; amount?: number }[]>([]);
  const [showBidAnimation, setShowBidAnimation] = useState(false);

  const currentPlayer = playerPool[currentPlayerIndex];
  const isAuctionOver = currentPlayerIndex >= playerPool.length;

  // Timer countdown
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

  // Place a bid for a team
  const handleTeamBid = useCallback(
    (teamId: number) => {
      if (showResult) return;
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;

      const newBid = leadingTeamId === null ? currentPlayer.base : currentBid + BID_INCREMENT;
      const remainingBudget = team.budget - team.spent;

      if (newBid > remainingBudget) return;
      if (team.players >= team.maxPlayers) return;

      setCurrentBid(newBid);
      setLeadingTeamId(teamId);
      setTimeLeft(15);
      setIsTimerRunning(true);
      setShowBidAnimation(true);

      setBidHistory((prev) => [
        { id: Date.now(), teamId, teamName: team.name, amount: newBid, timestamp: "now" },
        ...prev.slice(0, 19),
      ]);

      setTimeout(() => setShowBidAnimation(false), 500);
    },
    [teams, currentBid, leadingTeamId, currentPlayer, showResult]
  );

  // Mark sold
  const handleSold = useCallback(() => {
    if (!leadingTeamId) return;
    setIsTimerRunning(false);
    setPlayerResult("sold");
    setShowResult(true);

    setTeams((prev) =>
      prev.map((t) =>
        t.id === leadingTeamId ? { ...t, spent: t.spent + currentBid, players: t.players + 1 } : t
      )
    );

    setResults((prev) => [
      ...prev,
      { playerId: currentPlayer.id, result: "sold", teamId: leadingTeamId, amount: currentBid },
    ]);
  }, [leadingTeamId, currentBid, currentPlayer]);

  // Mark unsold
  const handleUnsold = useCallback(() => {
    setIsTimerRunning(false);
    setPlayerResult("unsold");
    setShowResult(true);

    setResults((prev) => [...prev, { playerId: currentPlayer.id, result: "unsold" }]);
  }, [currentPlayer]);

  // Move to next player
  const handleNext = useCallback(() => {
    const nextIndex = currentPlayerIndex + 1;
    if (nextIndex >= playerPool.length) {
      onNavigate("results");
      return;
    }
    setCurrentPlayerIndex(nextIndex);
    setCurrentBid(playerPool[nextIndex].base);
    setLeadingTeamId(null);
    setBidHistory([]);
    setTimeLeft(15);
    setIsTimerRunning(true);
    setPlayerResult(null);
    setShowResult(false);
  }, [currentPlayerIndex, onNavigate]);

  // Reset current player bidding
  const handleReset = useCallback(() => {
    setCurrentBid(currentPlayer.base);
    setLeadingTeamId(null);
    setBidHistory([]);
    setTimeLeft(15);
    setIsTimerRunning(true);
    setPlayerResult(null);
    setShowResult(false);
  }, [currentPlayer]);

  const leadingTeam = teams.find((t) => t.id === leadingTeamId);
  const soldCount = results.filter((r) => r.result === "sold").length;
  const unsoldCount = results.filter((r) => r.result === "unsold").length;

  if (isAuctionOver) {
    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center px-5">
        <Trophy className="h-16 w-16 text-gold mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Auction Complete</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          All players have been auctioned. {soldCount} sold, {unsoldCount} unsold.
        </p>
        <Button size="lg" onClick={() => onNavigate("results")} className="bg-gold text-background hover:bg-gold/90 font-semibold">
          View Results
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      {/* Top Status Bar */}
      <header className="px-4 pt-8 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/15">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />
            <span className="text-xs font-bold text-neon">LIVE</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Player {currentPlayerIndex + 1} of {playerPool.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {soldCount} sold / {unsoldCount} unsold
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              timeLeft <= 5 && timeLeft > 0 ? "bg-destructive/20" : "bg-secondary"
            )}
          >
            <Timer className={cn("h-3.5 w-3.5", timeLeft <= 5 && timeLeft > 0 ? "text-destructive" : "text-gold")} />
            <span className={cn("text-sm font-mono font-bold", timeLeft <= 5 && timeLeft > 0 ? "text-destructive" : "text-gold")}>
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
            <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{currentPlayer.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-medium">
                  {currentPlayer.role}
                </span>
                <span className="text-[10px] text-muted-foreground">{currentPlayer.batting}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: "Matches", value: currentPlayer.matches },
                  { label: currentPlayer.role === "Bowler" ? "Wkts" : "Runs", value: currentPlayer.role === "Bowler" ? "-" : currentPlayer.runs.toLocaleString() },
                  { label: "Rating", value: currentPlayer.rating },
                ].map((stat) => (
                  <div key={stat.label}>
                    <span className="text-[9px] text-muted-foreground uppercase">{stat.label}</span>
                    <p className="text-xs font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
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
            {showBidAnimation && <ArrowUp className="h-5 w-5 text-neon animate-bid-up" />}
            <span key={currentBid} className="text-4xl font-bold text-gold animate-count-up font-mono">
              {currentBid}
            </span>
            <span className="text-sm text-muted-foreground ml-1">pts</span>
          </div>
          {leadingTeam ? (
            <p className="text-xs text-foreground mt-1">
              <span className="text-gold font-semibold">{leadingTeam.name}</span> is leading
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No bids yet - select a team to start</p>
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
                  {currentPlayer.name} sold to{" "}
                  <span className="font-semibold text-gold">{leadingTeam?.name}</span> for{" "}
                  <span className="font-bold text-gold font-mono">{currentBid} pts</span>
                </p>
              </>
            ) : (
              <>
                <X className="h-10 w-10 text-destructive mx-auto mb-2" />
                <h3 className="text-lg font-bold text-destructive">UNSOLD</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentPlayer.name} goes back to the pool
                </p>
              </>
            )}
            <Button
              size="lg"
              onClick={handleNext}
              className="mt-4 bg-gold text-background hover:bg-gold/90 font-semibold w-full"
            >
              {currentPlayerIndex + 1 >= playerPool.length ? "View Results" : "Next Player"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Team Bidding Table */}
      {!showResult && (
        <section className="px-4 mb-3 flex-1" aria-label="Team bidding controls">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gold" />
              <h3 className="text-sm font-semibold text-foreground">Teams ({teams.length})</h3>
            </div>
            <button type="button" onClick={handleReset} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_70px_60px_70px] gap-1 px-3 py-2 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
            <span>Team</span>
            <span className="text-center">Budget</span>
            <span className="text-center">Roster</span>
            <span className="text-center">Action</span>
          </div>

          {/* Team Rows */}
          <div className="flex flex-col gap-1.5">
            {teams.map((team) => {
              const remainingBudget = team.budget - team.spent;
              const nextBidAmount = leadingTeamId === null ? currentPlayer.base : currentBid + BID_INCREMENT;
              const canBid = remainingBudget >= nextBidAmount && team.players < team.maxPlayers && team.id !== leadingTeamId;
              const isLeading = team.id === leadingTeamId;
              const isFull = team.players >= team.maxPlayers;

              return (
                <div
                  key={team.id}
                  className={cn(
                    "glass rounded-lg grid grid-cols-[1fr_70px_60px_70px] gap-1 items-center px-3 py-2.5 transition-all duration-200",
                    isLeading && "border-gold/40 bg-gold/5"
                  )}
                >
                  {/* Team Info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-foreground shrink-0", team.color + "/20")}>
                      {team.shortName}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{team.name}</p>
                      {isLeading && (
                        <span className="text-[9px] text-gold font-bold">Leading</span>
                      )}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Wallet className="h-3 w-3 text-muted-foreground" />
                      <span className={cn("text-xs font-bold font-mono", remainingBudget < 200 ? "text-destructive" : "text-foreground")}>
                        {remainingBudget}
                      </span>
                    </div>
                  </div>

                  {/* Roster */}
                  <div className="text-center">
                    <span className={cn("text-xs font-mono", isFull ? "text-destructive font-bold" : "text-foreground")}>
                      {team.players}/{team.maxPlayers}
                    </span>
                  </div>

                  {/* Bid Button */}
                  <div className="flex justify-center">
                    {isLeading ? (
                      <span className="text-[9px] px-2 py-1 rounded-full bg-gold/15 text-gold font-bold">
                        TOP
                      </span>
                    ) : isFull ? (
                      <span className="text-[9px] text-muted-foreground">Full</span>
                    ) : !canBid ? (
                      <span className="text-[9px] text-muted-foreground">Low</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleTeamBid(team.id)}
                        className="h-7 px-3 text-[10px] bg-gold text-background hover:bg-gold/90 font-bold"
                      >
                        <Gavel className="h-3 w-3 mr-1" />
                        BID
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bid increment info */}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Each bid increments by +{BID_INCREMENT} pts from the current bid
          </p>
        </section>
      )}

      {/* Auctioneer Controls */}
      {!showResult && (
        <div className="px-4 mb-4">
          <div className="glass rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold text-center">
              Auctioneer Controls
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                onClick={handleSold}
                disabled={!leadingTeamId}
                className="bg-neon text-background hover:bg-neon/90 font-bold disabled:opacity-40"
              >
                <Check className="h-4 w-4 mr-1.5" />
                SOLD
              </Button>
              <Button
                size="lg"
                onClick={handleUnsold}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              >
                <X className="h-4 w-4 mr-1.5" />
                UNSOLD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bid History */}
      {bidHistory.length > 0 && !showResult && (
        <section className="px-4" aria-label="Bid history">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="h-3.5 w-3.5 text-gold" />
            <h3 className="text-xs font-semibold text-foreground">Bid History</h3>
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
                <span className={cn("font-medium", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                  {bid.teamName}
                </span>
                <span className={cn("font-bold font-mono", i === 0 ? "text-gold" : "text-muted-foreground")}>
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
