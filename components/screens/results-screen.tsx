"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Wallet,
  User,
  Medal,
  Crown,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/team-logo";

/* ─────────────────────── Types ─────────────────────── */

interface ResultsScreenProps {
  tournamentId: string;
  onNavigate: (screen: string) => void;
}

interface SaleData {
  id: string;
  final_price: number | null;
  status: string;
  tournament_players: {
    id: string;
    base_price: number;
    players: {
      id: string;
      name: string;
      profile_image_url?: string;
      role: string;
    };
  };
  teams: {
    id: string;
    name: string;
    short_name: string;
    color: string;
    logo_url?: string | null;
  } | null;
}

interface TeamData {
  id: string;
  name: string;
  short_name: string;
  color: string;
  budget: number;
  spent: number;
  logo_url?: string | null;
}

interface TeamLeaderboard {
  id: string;
  rank: number;
  name: string;
  short_name: string;
  color: string;
  spent: number;
  budget: number;
  playersCount: number;
  roster: { name: string; role: string; cost: number }[];
  mvpName: string;
  mvpCost: number;
  logo_url?: string | null;
}

/* ─────────────────── Component ─────────────────── */

export function ResultsScreen({ tournamentId, onNavigate }: ResultsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboard[]>([]);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "all_teams">("leaderboard");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [totalSold, setTotalSold] = useState(0);
  const [totalUnsold, setTotalUnsold] = useState(0);

  /* ── fetch results ── */
  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/auction/${tournamentId}/state`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load results");
        setLoading(false);
        return;
      }

      const sales: SaleData[] = data.results || [];
      const teams: TeamData[] = data.teams || [];

      const sold = sales.filter((s) => s.status === "sold");
      const unsold = sales.filter((s) => s.status === "unsold");
      setTotalSold(sold.length);
      setTotalUnsold(unsold.length);

      // Build leaderboard from teams + sales
      const teamMap = new Map<string, TeamLeaderboard>();

      teams.forEach((t) => {
        teamMap.set(t.id, {
          id: t.id,
          rank: 0,
          name: t.name,
          short_name: t.short_name || t.name.charAt(0),
          color: t.color || "#F4A261",
          spent: t.spent ?? 0,
          budget: t.budget ?? 0,
          playersCount: 0,
          roster: [],
          logo_url: (t as any).logo_url || null,
          mvpName: "—",
          mvpCost: 0,
        });
      });

      // Map sales to teams
      sold.forEach((sale) => {
        if (sale.teams) {
          const team = teamMap.get(sale.teams.id);
          if (team) {
            const playerName = sale.tournament_players?.players?.name || "Unknown";
            const playerRole = sale.tournament_players?.players?.role?.replace("_", " ") || "Player";
            const cost = sale.final_price || 0;

            team.roster.push({ name: playerName, role: playerRole, cost });
            team.playersCount++;

            if (cost > team.mvpCost) {
              team.mvpName = playerName;
              team.mvpCost = cost;
            }
          }
        }
      });

      // Sort by total spent (descending) and assign ranks
      const sorted = Array.from(teamMap.values())
        .sort((a, b) => b.spent - a.spent)
        .map((t, i) => ({ ...t, rank: i + 1 }));

      setLeaderboard(sorted);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  /* ── Loading ── */
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

  const top3 = leaderboard.slice(0, 3);
  // Arrange for podium: 2nd, 1st, 3rd
  const podium = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => onNavigate("overview")}
            className="h-10 w-10 rounded-lg glass flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Results</h1>
            <p className="text-xs text-muted-foreground">
              {totalSold} sold · {totalUnsold} unsold
            </p>
          </div>
        </div>
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
            onClick={() => setActiveTab("all_teams")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === "all_teams"
                ? "bg-gold text-background"
                : "text-muted-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            All Teams
          </button>
        </div>
      </div>

      {activeTab === "leaderboard" ? (
        <div className="px-5">
          {/* Top 3 Podium */}
          {podium.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-6">
              {podium.map((team, i) => {
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
                      style={
                        !isFirst
                          ? {
                              backgroundColor: `${team.color}20`,
                              color: team.color,
                            }
                          : undefined
                      }
                    >
                      {isFirst ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        <TeamLogo
                          logoUrl={team.logo_url}
                          shortName={team.short_name}
                          color={team.color}
                          size="md"
                        />
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
              })}
            </div>
          )}

          {/* Full Standings */}
          <div className="flex flex-col gap-2">
            {leaderboard.map((team) => (
              <div key={team.id} className="glass rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTeam(
                      expandedTeam === team.id ? null : team.id
                    )
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
                  <TeamLogo
                    logoUrl={team.logo_url}
                    shortName={team.short_name}
                    color={team.color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {team.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {team.playersCount} players &middot; {team.spent} pts
                      spent
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                          {team.mvpName}
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

                    {/* Roster */}
                    {team.roster.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {team.roster.map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2"
                          >
                            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {player.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {player.role}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-gold font-mono">
                              {player.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ─── All Teams Tab ─── */
        <div className="px-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="glass rounded-xl p-3 text-center">
              <Users className="h-4 w-4 text-gold mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {leaderboard.reduce((sum, t) => sum + t.playersCount, 0)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Players Sold
              </span>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <Medal className="h-4 w-4 text-neon mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {leaderboard.reduce((sum, t) => sum + t.spent, 0)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Total Spent
              </span>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <Wallet className="h-4 w-4 text-gold mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">
                {leaderboard.length > 0
                  ? Math.max(...leaderboard.map((t) => t.mvpCost))
                  : 0}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Top Buy
              </span>
            </div>
          </div>

          {/* All teams with their rosters */}
          <div className="flex flex-col gap-3">
            {leaderboard.map((team) => (
              <div key={team.id} className="glass rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTeam(
                      expandedTeam === team.id ? null : team.id
                    )
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    shortName={team.short_name}
                    color={team.color}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {team.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">
                          {team.playersCount}
                        </span>{" "}
                        players
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        <span className="font-bold text-gold">
                          {team.budget - team.spent}
                        </span>{" "}
                        remaining
                      </span>
                    </div>
                  </div>
                  {expandedTeam === team.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {expandedTeam === team.id && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 flex flex-col gap-1.5">
                    {team.roster.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No players bought
                      </p>
                    ) : (
                      team.roster.map((player, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2.5"
                        >
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {player.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {player.role}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-gold font-mono">
                            {player.cost} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
