"use client";

import { useState } from "react";
import {
  Trophy,
  Wallet,
  User,
  TrendingUp,
  TrendingDown,
  Medal,
  Crown,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsScreenProps {
  onNavigate: (screen: string) => void;
}

const leaderboard = [
  {
    id: 1,
    rank: 1,
    name: "Royal Strikers",
    spent: 1680,
    budget: 2000,
    players: 7,
    maxPlayers: 8,
    mvp: "Rohit Sharma",
    mvpCost: 380,
    change: "up" as const,
  },
  {
    id: 2,
    rank: 2,
    name: "Thunder Hawks",
    spent: 1520,
    budget: 2500,
    players: 6,
    maxPlayers: 8,
    mvp: "Jasprit Bumrah",
    mvpCost: 420,
    change: "up" as const,
  },
  {
    id: 3,
    rank: 3,
    name: "Golden Eagles",
    spent: 1400,
    budget: 1800,
    players: 7,
    maxPlayers: 8,
    mvp: "Hardik Pandya",
    mvpCost: 350,
    change: "down" as const,
  },
  {
    id: 4,
    rank: 4,
    name: "Neon Knights",
    spent: 1200,
    budget: 2200,
    players: 5,
    maxPlayers: 8,
    mvp: "KL Rahul",
    mvpCost: 320,
    change: "same" as const,
  },
  {
    id: 5,
    rank: 5,
    name: "Storm Breakers",
    spent: 980,
    budget: 2000,
    players: 5,
    maxPlayers: 8,
    mvp: "Rishabh Pant",
    mvpCost: 280,
    change: "down" as const,
  },
];

const myTeamRoster = [
  { id: 1, name: "Rohit Sharma", role: "Batsman", cost: 380 },
  { id: 2, name: "Shubman Gill", role: "Batsman", cost: 220 },
  { id: 3, name: "Ravindra Jadeja", role: "All-Rounder", cost: 310 },
  { id: 4, name: "Mohammed Siraj", role: "Bowler", cost: 180 },
  { id: 5, name: "Rishabh Pant", role: "Keeper", cost: 280 },
  { id: 6, name: "Yuzvendra Chahal", role: "Bowler", cost: 160 },
  { id: 7, name: "Suryakumar Yadav", role: "Batsman", cost: 150 },
];

export function ResultsScreen({ onNavigate }: ResultsScreenProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "wallet">(
    "leaderboard"
  );
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  const totalSpent = myTeamRoster.reduce((sum, p) => sum + p.cost, 0);
  const totalBudget = 2000;
  const remaining = totalBudget - totalSpent;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Auction standings and your team
        </p>
      </header>

      {/* Tab Switcher */}
      <div className="px-5 mb-5">
        <div className="glass rounded-xl p-1 flex">
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === "leaderboard"
                ? "bg-gold text-background"
                : "text-muted-foreground"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === "wallet"
                ? "bg-gold text-background"
                : "text-muted-foreground"
            )}
          >
            <Wallet className="h-3.5 w-3.5" />
            My Team
          </button>
        </div>
      </div>

      {activeTab === "leaderboard" ? (
        <div className="px-5">
          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-3 mb-6">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map(
              (team, i) => {
                const podiumOrder = [2, 1, 3];
                const heights = ["h-20", "h-28", "h-16"];
                const isFirst = podiumOrder[i] === 1;
                return (
                  <div
                    key={team.id}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold mb-2",
                        isFirst
                          ? "bg-gold/20 text-gold ring-2 ring-gold"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {isFirst ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        team.name.charAt(0)
                      )}
                    </div>
                    <span className="text-xs font-semibold text-foreground text-center mb-1 truncate w-full">
                      {team.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mb-2">
                      {team.spent} pts
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-lg flex items-end justify-center pb-2",
                        isFirst
                          ? "bg-gold/20 border border-gold/30"
                          : "bg-secondary/80",
                        heights[i]
                      )}
                    >
                      <span
                        className={cn(
                          "text-lg font-bold",
                          isFirst ? "text-gold" : "text-muted-foreground"
                        )}
                      >
                        #{podiumOrder[i]}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Full Standings */}
          <div className="flex flex-col gap-2">
            {leaderboard.map((team) => (
              <div key={team.id} className="glass rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTeam(expandedTeam === team.id ? null : team.id)
                  }
                  className="w-full p-3.5 flex items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "text-sm font-bold w-6 text-center",
                      team.rank === 1 ? "text-gold" : "text-muted-foreground"
                    )}
                  >
                    {team.rank}
                  </span>
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold",
                      team.rank === 1
                        ? "bg-gold/15 text-gold"
                        : team.rank <= 3
                          ? "bg-neon/10 text-neon"
                          : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {team.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {team.players}/{team.maxPlayers} players &middot;{" "}
                      {team.spent} pts spent
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {team.change === "up" && (
                      <TrendingUp className="h-3.5 w-3.5 text-neon" />
                    )}
                    {team.change === "down" && (
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                    {expandedTeam === team.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expandedTeam === team.id && (
                  <div className="px-3.5 pb-3.5 border-t border-border/30 pt-3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">
                          Budget Left
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {team.budget - team.spent}
                        </p>
                      </div>
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">
                          MVP
                        </span>
                        <p className="text-[11px] font-bold text-gold truncate">
                          {team.mvp}
                        </p>
                      </div>
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">
                          Top Buy
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {team.mvpCost}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5">
          {/* Budget Overview */}
          <div className="glass rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Team Wallet
              </h3>
              <span className="text-xs text-muted-foreground">
                Royal Strikers
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-gold font-mono">
                {remaining}
              </span>
              <span className="text-sm text-muted-foreground">pts remaining</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{
                  width: `${((totalBudget - totalSpent) / totalBudget) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Spent: {totalSpent} pts</span>
              <span>Budget: {totalBudget} pts</span>
            </div>
          </div>

          {/* Roster Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="glass rounded-xl p-3 text-center">
              <Users className="h-4 w-4 text-gold mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {myTeamRoster.length}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Players
              </span>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <Medal className="h-4 w-4 text-neon mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {Math.round(totalSpent / myTeamRoster.length)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Avg Cost
              </span>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 text-gold mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {Math.max(...myTeamRoster.map((p) => p.cost))}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Top Buy
              </span>
            </div>
          </div>

          {/* Roster List */}
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Your Roster
          </h3>
          <div className="flex flex-col gap-2">
            {myTeamRoster.map((player) => (
              <div
                key={player.id}
                className="glass rounded-xl p-3 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {player.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {player.role}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gold font-mono">
                    {player.cost}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
