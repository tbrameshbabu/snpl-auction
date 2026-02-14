"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Users,
  User,
  GripVertical,
  Play,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
}

const interestedTeams = [
  { id: 1, name: "Royal Strikers", players: 4, budget: 2000, ready: true },
  { id: 2, name: "Thunder Hawks", players: 2, budget: 2500, ready: true },
  { id: 3, name: "Storm Breakers", players: 0, budget: 2000, ready: false },
  { id: 4, name: "Golden Eagles", players: 3, budget: 1800, ready: true },
  { id: 5, name: "Neon Knights", players: 1, budget: 2200, ready: false },
];

const playerPool = [
  { id: 1, name: "Rohit Sharma", role: "Batsman", base: 200, rating: 9.2 },
  { id: 2, name: "Jasprit Bumrah", role: "Bowler", base: 180, rating: 9.5 },
  {
    id: 3,
    name: "Hardik Pandya",
    role: "All-Rounder",
    base: 160,
    rating: 8.8,
  },
  { id: 4, name: "KL Rahul", role: "Batsman", base: 150, rating: 8.5 },
  {
    id: 5,
    name: "Ravindra Jadeja",
    role: "All-Rounder",
    base: 170,
    rating: 9.0,
  },
  { id: 6, name: "Rishabh Pant", role: "Keeper", base: 140, rating: 8.7 },
  { id: 7, name: "Shubman Gill", role: "Batsman", base: 130, rating: 8.3 },
  { id: 8, name: "Mohammed Siraj", role: "Bowler", base: 120, rating: 8.1 },
];

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<"teams" | "players">("teams");
  const [players, setPlayers] = useState(playerPool);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  const movePlayer = (index: number, direction: "up" | "down") => {
    const newPlayers = [...players];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPlayers.length) return;
    [newPlayers[index], newPlayers[swapIndex]] = [
      newPlayers[swapIndex],
      newPlayers[index],
    ];
    setPlayers(newPlayers);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">
            Auction Control
          </h1>
          <button
            type="button"
            className="h-9 w-9 rounded-lg glass flex items-center justify-center"
          >
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your auction event
        </p>
      </header>

      {/* Auction Info Card */}
      <div className="px-5 mb-5">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Premier League Cup
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-bold">
              DRAFT
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Feb 15</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">7:00 PM</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {interestedTeams.length} teams
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onNavigate("bidding")}
              className="flex-1 bg-gold text-background hover:bg-gold/90 font-semibold"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Start Auction
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border text-foreground hover:bg-secondary bg-transparent"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mb-4">
        <div className="glass rounded-xl p-1 flex">
          <button
            type="button"
            onClick={() => setActiveTab("teams")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "teams"
                ? "bg-gold text-background"
                : "text-muted-foreground"
            )}
          >
            Interested Teams ({interestedTeams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("players")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "players"
                ? "bg-gold text-background"
                : "text-muted-foreground"
            )}
          >
            Player Pool ({players.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5">
        {activeTab === "teams" ? (
          <div className="flex flex-col gap-2.5">
            {interestedTeams.map((team) => (
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
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold",
                      team.ready
                        ? "bg-neon/15 text-neon"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {team.name}
                      </h4>
                      {team.ready && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-neon/15 text-neon rounded-full font-bold">
                          READY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {team.players} players &middot; {team.budget} pts budget
                    </p>
                  </div>
                  {expandedTeam === team.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedTeam === team.id && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-secondary/60 rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          Budget
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {team.budget} pts
                        </p>
                      </div>
                      <div className="bg-secondary/60 rounded-lg p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          Slots Left
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {8 - team.players}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground mb-1">
              Drag to reorder the auction sequence
            </p>
            {players.map((player, i) => (
              <div
                key={player.id}
                className="glass rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => movePlayer(i, "up")}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
                    aria-label={`Move ${player.name} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlayer(i, "down")}
                    disabled={i === players.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
                    aria-label={`Move ${player.name} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                <span className="text-xs font-mono text-muted-foreground w-5">
                  #{i + 1}
                </span>
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {player.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {player.role} &middot; {player.base} pts
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gold">
                    {player.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
