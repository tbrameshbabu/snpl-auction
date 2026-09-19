"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  ListChecks,
  Loader2,
  Radio,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingScreenProps {
  onNavigate: (screen: string) => void;
}

interface Tournament {
  id: string;
  title: string;
  auction_date: string;
  auction_time: string;
  num_teams: number;
  status: string;
}

interface TournamentResponse {
  tournaments?: Tournament[];
}

const features = [
  {
    icon: ClipboardList,
    title: "Register your profile",
    description:
      "Players create a profile and register for published tournaments.",
  },
  {
    icon: Radio,
    title: "Publish a tournament",
    description:
      "Auctioneers publish tournaments, set squads, budgets and base prices.",
  },
  {
    icon: TrendingUp,
    title: "Run the live auction",
    description:
      "The auctioneer runs the live auction and places bids on behalf of team owners.",
  },
  {
    icon: ListChecks,
    title: "Review results",
    description:
      "Sold and unsold results and final rosters are available to everyone.",
  },
] as const;

function UpcomingAuctions({
  loading,
  tournaments,
  onSelect,
}: {
  loading: boolean;
  tournaments: Tournament[];
  onSelect: (tournamentId: string) => void;
}) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">No upcoming tournaments</p>
      </div>
    );
  }

  return (
    <>
      {tournaments.map((tournament) => (
        <button
          type="button"
          key={tournament.id}
          onClick={() => onSelect(tournament.id)}
          className="glass flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:border-gold/30"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/10">
            <Radio className="h-6 w-6 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">
              {tournament.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tournament.num_teams} teams ·{" "}
              {new Date(tournament.auction_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-gold">
            <Timer className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">
              {tournament.auction_time}
            </span>
          </div>
        </button>
      ))}
    </>
  );
}

export function LandingScreen({ onNavigate: _onNavigate }: LandingScreenProps) {
  const router = useRouter();
  const [role, setRole] = useState<"player" | "team_owner">("player");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchTournaments = async () => {
      try {
        const response = await fetch(
          "/api/auctioneers/tournaments?status=published",
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const data = (await response.json()) as TournamentResponse;
        if (!cancelled) {
          setTournaments((data.tournaments ?? []).slice(0, 3));
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setTournaments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchTournaments();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.12),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-12 pt-10 md:grid-cols-2 md:items-center md:py-20">
            <div>
              <p className="eyebrow">Live sports auction console</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-balance text-foreground md:text-5xl">
                களமிறங்குறோம், <span className="text-gold">கலக்குறோம்!</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                கிரிக்கெட் ஹீரோக்களே, களத்தில் இறங்கத் தயாரா? சிறந்த வீரர்களை
                ஏலம் எடுத்து, உங்கள் கனவு அணியை உருவாக்குங்கள், வெற்றியை
                கொண்டாடுங்கள்!
              </p>

              <div className="glass mt-8 flex max-w-sm rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setRole("player")}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200",
                    role === "player"
                      ? "bg-gold text-background shadow-lg"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Join as Player
                </button>
                <button
                  type="button"
                  onClick={() => setRole("team_owner")}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200",
                    role === "team_owner"
                      ? "bg-gold text-background shadow-lg"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Team Owner
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => router.push("/auth/signup")}
                  className="bg-gold font-semibold text-background hover:bg-gold/90"
                >
                  {role === "player"
                    ? "Register as Player"
                    : "Register as Team Owner"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/auth/login")}
                  className="border-gold/30 bg-transparent font-semibold text-gold hover:bg-gold/10 hover:text-gold"
                >
                  Already registered? Login
                </Button>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 md:p-7">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Console preview</p>
                <span className="status-chip bg-neon/15 text-neon">Live</span>
              </div>
              <div className="mt-6 rounded-xl border border-gold/30 bg-background/40 p-5">
                <p className="text-sm text-muted-foreground">Current bid</p>
                <p className="numeric mt-2 text-4xl font-bold text-gold">—</p>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Leading team
                    </p>
                    <p className="mt-1 font-medium">—</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Teams remaining
                    </p>
                    <p className="numeric mt-1 font-medium">—</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-5 pb-12"
          aria-label="How it works"
        >
          <p className="eyebrow mb-4">How it works</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="glass rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-gold" />
                  <span className="numeric text-sm font-bold text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-4 text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-5 pb-12"
          aria-label="Upcoming auctions"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Open schedule</p>
              <h2 className="mt-1 text-xl font-bold">Upcoming Auctions</h2>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-gold"
              onClick={() => router.push("/tournaments")}
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <UpcomingAuctions
              loading={loading}
              tournaments={tournaments}
              onSelect={(tournamentId) =>
                router.push(`/tournaments/${tournamentId}`)
              }
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-border/40 px-5 py-5 text-sm">
        <span className="font-semibold">AuctionArena</span>
        <button
          type="button"
          onClick={() => router.push("/tournaments")}
          className="text-gold hover:underline"
        >
          Tournaments
        </button>
      </footer>
    </div>
  );
}
