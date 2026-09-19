"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { LiveAuctionViewer } from "@/components/screens/live-auction-viewer";
import { AuctionLeaderboard } from "@/components/auction/auction-leaderboard";
import {
  deriveTeamSummaries,
  type AuctionState,
} from "@/components/auction/auction-state";
import { useAuctionState } from "@/hooks/use-auction-state";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, RefreshCw } from "lucide-react";

interface PlayerProfile {
  id: string;
  name: string;
}
interface PlayerResponse {
  player?: PlayerProfile | null;
}
export default function PlayerAuctionPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const { state, loading, error, lastUpdated, refresh } = useAuctionState(
    tournamentId,
    { pollIntervalMs: 5000, enabled: user !== null && role === "player" },
  );
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  useEffect(() => {
    if (!authLoading && (!user || role !== "player"))
      router.push("/auth/login");
  }, [authLoading, role, router, user]);
  useEffect(() => {
    if (!user || role !== "player") return;
    const controller = new AbortController();
    let cancelled = false;
    fetch("/api/players/register", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load player profile");
        return (await res.json()) as PlayerResponse;
      })
      .then((data) => {
        if (!cancelled) setProfile(data.player ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled && !controller.signal.aborted)
          setProfileError(
            err instanceof Error
              ? err.message
              : "Failed to load player profile",
          );
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [role, user]);
  if (authLoading || (loading && !state))
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  if (!state)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-destructive">
            {error ?? profileError ?? "Unable to load auction"}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-background"
          >
            Retry
          </button>
        </div>
      </div>
    );
  const teams = deriveTeamSummaries(state);
  const mySale = profile
    ? state.results.find(
        (sale) => sale.tournament_players?.players?.id === profile.id,
      )
    : undefined;
  return (
    <div className="min-h-screen pb-16">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Player auction</p>
            <h1 className="text-2xl font-bold">{state.tournament.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="glass rounded-lg p-2"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <LiveAuctionViewer
          state={state}
          lastUpdated={lastUpdated}
          onViewResults={() =>
            router.push(`/player/tournaments/${tournamentId}/results`)
          }
        />
        {mySale && (
          <div className="glass rounded-xl p-4">
            <p className="eyebrow">Your status</p>
            <p className="mt-2 text-lg font-semibold">
              {mySale.status === "sold"
                ? `Sold to ${mySale.teams?.name ?? "a team"} for ${mySale.final_price ?? 0}`
                : "Unsold"}
            </p>
          </div>
        )}
        <section>
          <p className="eyebrow">Team standings</p>
          <h2 className="mt-1 text-xl font-bold">League leaderboard</h2>
          <div className="mt-4">
            <AuctionLeaderboard teams={teams} results={state.results} />
          </div>
        </section>
      </main>
    </div>
  );
}
