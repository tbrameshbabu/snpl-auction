"use client"

import React from "react"

import { useState, useEffect } from "react";
import {
  Zap,
  Users,
  Trophy,
  ArrowRight,
  Shield,
  Timer,
  TrendingUp,
  ClipboardList,
  Radio,
  ListChecks,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface LandingScreenProps {
  onNavigate: (screen: string) => void;
}

interface Tournament {
  id: string
  title: string
  auction_date: string
  auction_time: string
  num_teams: number
  status: string
}

export function LandingScreen({ onNavigate }: LandingScreenProps) {
  const router = useRouter()
  const [role, setRole] = useState<"player" | "team_owner">("player");
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/auctioneers/tournaments?status=published')
        const data = await response.json()
        
        if (response.ok) {
          // Get only the first 3 tournaments
          setTournaments(data.tournaments?.slice(0, 3) || [])
        }
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  return (
    <div className="min-h-screen pb-24">
      {/* Unified App Header */}
      <AppHeader />

      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.12),transparent_60%)]" />
        <div className="relative px-5 pt-6 pb-6">

          <h2 className="text-3xl md:text-4xl font-bold leading-tight text-balance text-foreground mb-3">
            களமிறங்குறோம், <span className="text-gold">கலக்குறோம்!</span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mb-8">
            கிரிக்கெட் ஹீரோக்களே, களத்தில் இறங்கத் தயாரா? சிறந்த வீரர்களை ஏலம் எடுத்து, உங்கள் கனவு அணியை உருவாக்குங்கள், வெற்றியை கொண்டாடுங்கள்!
          </p>

          {/* Role Toggle */}
          <div className="glass rounded-xl p-1 flex mb-6 max-w-xs">
            <button
              type="button"
              onClick={() => setRole("player")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                role === "player"
                  ? "bg-gold text-background shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Join as Player
            </button>
            <button
              type="button"
              onClick={() => setRole("team_owner")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                role === "team_owner"
                  ? "bg-gold text-background shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Team Manager
            </button>
          </div>

          <div className="flex flex-col gap-2 max-w-xs w-full">
            <Button
              size="lg"
              onClick={() => {
                if (role === "player") {
                  window.location.href = "/auth/signup";
                } else {
                  window.location.href = "/auth/signup";
                }
              }}
              className="bg-gold text-background hover:bg-gold/90 font-semibold w-full animate-pulse-gold"
            >
              {role === "player" ? "Register as Player" : "Register as Team Owner"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {role === "player" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = "/auth/login"}
                className="w-full border-gold/30 text-gold hover:bg-gold/10 hover:text-gold font-semibold bg-transparent"
              >
                Already Registered? Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {role === "team_owner" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = "/auth/login"}
                className="w-full border-gold/30 text-gold hover:bg-gold/10 hover:text-gold font-semibold bg-transparent"
              >
                Already Registered? Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Upcoming Auctions */}
      <section className="px-5 pb-6" aria-label="Upcoming auctions">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Upcoming Auctions</h3>
          <button 
            type="button" 
            className="text-xs text-gold font-medium"
            onClick={() => router.push('/tournaments')}
          >
            View All
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="glass rounded-xl p-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No upcoming tournaments</p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <button
                type="button"
                key={tournament.id}
                onClick={() => router.push(`/tournaments/${tournament.id}`)}
                className="glass rounded-xl p-4 flex items-center gap-4 text-left w-full hover:border-gold/30 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Gavel className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {tournament.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tournament.num_teams} teams · {new Date(tournament.auction_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-gold">
                    <Timer className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">
                      {tournament.auction_time}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
      <section className="px-5 pb-8">
        <p className="eyebrow mb-3">How it works</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {([
            [ClipboardList, "Register profile"], [Radio, "Tournament publishes"], [TrendingUp, "Live auction with bids on behalf of teams"], [ListChecks, "Results & rosters"],
          ] as const).map(([Icon, title]) => {
            const FeatureIcon = Icon;
            return <div key={title} className="glass rounded-xl p-4"><FeatureIcon className="h-5 w-5 text-gold" /><h3 className="mt-3 text-sm font-semibold">{title}</h3></div>;
          })}
        </div>
      </section>
    </div>
  );
}

function Gavel(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </svg>
  );
}
