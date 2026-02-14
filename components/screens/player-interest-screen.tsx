"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  XCircle,
  Clock,
  Users,
  Trophy,
  AlertTriangle,
  Zap,
  Shield,
  Star,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlayerInterestScreenProps {
  onNavigate: (screen: string) => void;
}

type InterestStatus = "pending" | "interested" | "withdrawn";

interface AuctionEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  teams: number;
  players: number;
  basePoints: number;
  status: "upcoming" | "registering" | "locked";
  spotsLeft: number;
  totalSpots: number;
}

const auctionEvents: AuctionEvent[] = [
  {
    id: 1,
    title: "Premier League Cup",
    date: "Feb 10, 2026",
    time: "6:00 PM",
    teams: 8,
    players: 64,
    basePoints: 100,
    status: "registering",
    spotsLeft: 12,
    totalSpots: 64,
  },
  {
    id: 2,
    title: "Champions Weekend",
    date: "Feb 14, 2026",
    time: "3:00 PM",
    teams: 12,
    players: 96,
    basePoints: 150,
    status: "upcoming",
    spotsLeft: 40,
    totalSpots: 96,
  },
  {
    id: 3,
    title: "All-Star Draft",
    date: "Feb 20, 2026",
    time: "7:30 PM",
    teams: 6,
    players: 48,
    basePoints: 200,
    status: "upcoming",
    spotsLeft: 48,
    totalSpots: 48,
  },
];

export function PlayerInterestScreen({
  onNavigate,
}: PlayerInterestScreenProps) {
  const [interests, setInterests] = useState<Record<number, InterestStatus>>(
    {}
  );
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<number | null>(
    null
  );

  const handleShowInterest = (auctionId: number) => {
    setInterests((prev) => ({ ...prev, [auctionId]: "interested" }));
  };

  const handleWithdraw = (auctionId: number) => {
    setInterests((prev) => ({ ...prev, [auctionId]: "withdrawn" }));
    setShowWithdrawConfirm(null);
  };

  const getStatusColor = (status: AuctionEvent["status"]) => {
    switch (status) {
      case "registering":
        return "text-neon";
      case "upcoming":
        return "text-gold";
      case "locked":
        return "text-destructive";
    }
  };

  const getStatusBg = (status: AuctionEvent["status"]) => {
    switch (status) {
      case "registering":
        return "bg-neon/15";
      case "upcoming":
        return "bg-gold/15";
      case "locked":
        return "bg-destructive/15";
    }
  };

  const getStatusLabel = (status: AuctionEvent["status"]) => {
    switch (status) {
      case "registering":
        return "Open";
      case "upcoming":
        return "Upcoming";
      case "locked":
        return "Locked";
    }
  };

  const interestedCount = Object.values(interests).filter(
    (s) => s === "interested"
  ).length;
  const withdrawnCount = Object.values(interests).filter(
    (s) => s === "withdrawn"
  ).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.08),transparent_60%)]" />
        <div className="relative px-5 pt-10 pb-4">
          <button
            type="button"
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-1 text-muted-foreground text-sm mb-4 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Welcome back, Player
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your auction preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="px-5 py-4" aria-label="Your status summary">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {auctionEvents.length}
            </span>
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Check className="h-4 w-4 text-neon" />
            <span className="text-lg font-bold text-neon">
              {interestedCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Interested</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-lg font-bold text-destructive">
              {withdrawnCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Withdrawn</span>
          </div>
        </div>
      </section>

      {/* Section Heading */}
      <div className="px-5 mb-3">
        <h2 className="text-lg font-bold text-foreground">
          Upcoming Auctions
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Show interest or withdraw before the auction locks
        </p>
      </div>

      {/* Auction List */}
      <section className="px-5 flex flex-col gap-3" aria-label="Auction events">
        {auctionEvents.map((auction) => {
          const interest = interests[auction.id] || "pending";
          const isExpanded = expandedId === auction.id;
          const spotsPercentage =
            ((auction.totalSpots - auction.spotsLeft) / auction.totalSpots) *
            100;

          return (
            <div
              key={auction.id}
              className={cn(
                "glass rounded-xl overflow-hidden transition-all duration-300",
                interest === "interested" && "border-neon/40",
                interest === "withdrawn" && "border-destructive/30 opacity-60"
              )}
            >
              {/* Card Header - always visible */}
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : auction.id)
                }
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div
                  className={cn(
                    "h-11 w-11 rounded-lg flex items-center justify-center shrink-0",
                    interest === "interested"
                      ? "bg-neon/15"
                      : interest === "withdrawn"
                        ? "bg-destructive/15"
                        : "bg-gold/10"
                  )}
                >
                  {interest === "interested" ? (
                    <Check className="h-5 w-5 text-neon" />
                  ) : interest === "withdrawn" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Trophy className="h-5 w-5 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {auction.title}
                    </h3>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        getStatusBg(auction.status),
                        getStatusColor(auction.status)
                      )}
                    >
                      {getStatusLabel(auction.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {auction.date} at {auction.time}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-slide-in-right">
                  {/* Auction Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gold shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Teams
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {auction.teams}
                        </p>
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gold shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Players
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {auction.players}
                        </p>
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-gold shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Base Points
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {auction.basePoints} pts
                        </p>
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gold shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Spots Left
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {auction.spotsLeft}/{auction.totalSpots}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Spots Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Registration Progress
                      </span>
                      <span className="text-[10px] font-semibold text-gold">
                        {Math.round(spotsPercentage)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold transition-all duration-700"
                        style={{ width: `${spotsPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Interest/Withdraw Actions */}
                  {interest === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        onClick={() => handleShowInterest(auction.id)}
                        className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Show Interest
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowWithdrawConfirm(auction.id)}
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Withdraw
                      </Button>
                    </div>
                  )}

                  {interest === "interested" && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon/10 border border-neon/20">
                        <Check className="h-4 w-4 text-neon shrink-0" />
                        <span className="text-sm font-medium text-neon">
                          You have shown interest in this auction
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowWithdrawConfirm(auction.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs self-start"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Withdraw instead
                      </Button>
                    </div>
                  )}

                  {interest === "withdrawn" && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-sm font-medium text-destructive">
                          You have withdrawn from this auction
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShowInterest(auction.id)}
                        className="text-neon hover:text-neon hover:bg-neon/10 text-xs self-start"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Re-confirm interest
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Withdraw Confirmation Modal (inline) */}
              {showWithdrawConfirm === auction.id && (
                <div className="px-4 pb-4">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Confirm Withdrawal
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Are you sure you want to withdraw from{" "}
                          <span className="text-foreground font-medium">
                            {auction.title}
                          </span>
                          ? You can re-confirm interest later if spots are still
                          available.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleWithdraw(auction.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                      >
                        Yes, Withdraw
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowWithdrawConfirm(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Info Banner */}
      <section className="px-5 py-6">
        <div className="glass rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Before the Auction Begins
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You can change your interest status anytime before the auction
              locks. Once the auction starts, your status will be final and
              withdrawals won't be possible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
