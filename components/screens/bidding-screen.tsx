"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, RefreshCw, RotateCcw, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuctionState } from "@/hooks/use-auction-state";
import { getBidBlocker, countResults, deriveBidding, deriveTeamSummaries, nextBidAmount, type AuctionTournamentPlayer, type TeamSummary } from "@/components/auction/auction-state";
import { readApiError, toErrorMessage } from "@/components/shared/api-error";
import { PlayerCard } from "@/components/auction/player-card";
import { CurrentBidPanel } from "@/components/auction/current-bid-panel";
import { BidHistory } from "@/components/auction/bid-history";
import { TeamBidGrid } from "@/components/auction/team-bid-grid";

interface BiddingScreenProps { tournamentId: string; onNavigate: (screen: string) => void; }
type BusyAction = null | "bid" | "sold" | "unsold" | "activate" | "reauction" | "complete";
interface LastResult { kind: "sold" | "unsold"; playerName: string; teamName?: string; amount?: number; }
interface AvailableResponse { availablePlayers?: AuctionTournamentPlayer[]; }

export function BiddingScreen({ tournamentId, onNavigate }: BiddingScreenProps) {
  const { state, loading, error, lastUpdated, refresh } = useAuctionState(tournamentId, { pollIntervalMs: 5000 });
  const [availablePlayers, setAvailablePlayers] = useState<AuctionTournamentPlayer[]>([]);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!state || state.currentPlayer) { setAvailablePlayers([]); return; }
    const controller = new AbortController(); let cancelled = false;
    fetch(`/api/auction/${tournamentId}/available-players`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => { if (!res.ok) throw new Error(await readApiError(res, "Failed to load available players")); return (await res.json()) as AvailableResponse; })
      .then((data) => { if (!cancelled) setAvailablePlayers(data.availablePlayers ?? []); })
      .catch((err: unknown) => { if (!cancelled && !controller.signal.aborted) setActionError(toErrorMessage(err, "Failed to load available players")); });
    return () => { cancelled = true; controller.abort(); };
  }, [state, tournamentId]);

  const bidding = state ? deriveBidding(state) : null;
  const teams = state ? deriveTeamSummaries(state) : [];
  const counts = state ? countResults(state.results) : { sold: 0, unsold: 0, total: 0 };
  const amount = bidding && state?.currentPlayer ? nextBidAmount(bidding, state.currentPlayer.base_price) : 0;
  const leadingTeam = teams.find((team) => team.id === bidding?.leadingTeamId);
  const isOver = Boolean(state && !state.currentPlayer && availablePlayers.length === 0 && counts.total > 0);

  const mutate = useCallback(async (action: Exclude<BusyAction, null>, path: string, body?: Record<string, string | number>) => {
    if (busy) return false; setBusy(action); setActionError(null);
    try {
      const res = await fetch(`/api/auction/${tournamentId}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) { setActionError(await readApiError(res, `Failed to ${path}`)); return false; }
      await refresh(); return true;
    } catch (err: unknown) { setActionError(toErrorMessage(err, `Failed to ${path}`)); return false; } finally { setBusy(null); }
  }, [busy, refresh, tournamentId]);
  const handleBid = useCallback(async (team: TeamSummary) => {
    if (!state?.currentPlayer || !bidding || getBidBlocker(team, bidding, amount)) return;
    await mutate("bid", "bid", { tournament_id: tournamentId, tournament_player_id: state.currentPlayer.id, team_id: team.id, amount });
  }, [amount, bidding, mutate, state, tournamentId]);
  const handleSold = useCallback(async () => {
    if (!state?.currentPlayer || !leadingTeam || !bidding?.hasBids) return;
    const playerName = state.currentPlayer.players?.name ?? "Player";
    if (await mutate("sold", "sold", { tournament_player_id: state.currentPlayer.id, team_id: leadingTeam.id, final_price: bidding.currentAmount })) setLastResult({ kind: "sold", playerName, teamName: leadingTeam.name, amount: bidding.currentAmount });
  }, [bidding, leadingTeam, mutate, state]);
  const handleUnsold = useCallback(async () => {
    if (!state?.currentPlayer) return;
    const playerName = state.currentPlayer.players?.name ?? "Player";
    if (await mutate("unsold", "unsold", { tournament_player_id: state.currentPlayer.id })) setLastResult({ kind: "unsold", playerName });
  }, [mutate, state]);
  const filteredPlayers = useMemo(() => availablePlayers.filter((p) => (p.players?.name ?? "").toLowerCase().includes(query.toLowerCase())), [availablePlayers, query]);

  if (loading && !state) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;
  if (error && !state) return <div className="glass mx-auto max-w-md rounded-2xl p-6 text-center"><p className="text-destructive">{error}</p><Button onClick={() => void refresh()} className="mt-4">Retry</Button></div>;
  if (!state || !bidding) return null;
  const activate = async (id: string) => { await mutate("activate", "activate-player", { tournament_player_id: id }); };
  const reauction = async () => { if (confirm(`Are you sure you want to re-auction ${counts.unsold} unsold players?`)) await mutate("reauction", "re-auction"); };
  const complete = async () => { if (confirm("Are you sure you want to complete this tournament?") && await mutate("complete", "complete")) onNavigate("results"); };
  if (isOver) return <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center"><Trophy className="mx-auto h-12 w-12 text-gold" /><h2 className="mt-3 text-2xl font-bold">Auction over</h2><p className="mt-2 text-sm text-muted-foreground">{counts.sold} sold / {counts.unsold} unsold</p><div className="mt-6 space-y-3"><Button onClick={() => onNavigate("results")} className="w-full bg-gold text-background hover:bg-gold/90">View Results</Button>{counts.unsold > 0 && <Button variant="outline" disabled={busy !== null} onClick={() => void reauction()} className="w-full"><RotateCcw className="mr-2 h-4 w-4" />Re-auction Unsold</Button>}<Button variant="outline" disabled={busy !== null} onClick={() => void complete()} className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Complete Tournament</Button></div></div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Auction console</p><h1 className="text-2xl font-bold">Player #{counts.total + 1}</h1><p className="text-xs text-muted-foreground">{counts.sold} sold / {counts.unsold} unsold</p></div><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Updated {lastUpdated?.toLocaleTimeString() ?? "—"}</span><button type="button" onClick={() => void refresh()} disabled={busy !== null} className="glass rounded-lg p-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button></div></div>
    {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}<button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
    {actionError && <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{actionError}<button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
    {lastResult ? <div className="glass rounded-2xl p-8 text-center"><CheckCircle className="mx-auto h-12 w-12 text-neon" /><h2 className="mt-3 text-2xl font-bold">{lastResult.kind === "sold" ? "Sold!" : "Unsold"}</h2><p className="mt-2">{lastResult.playerName}{lastResult.teamName ? ` → ${lastResult.teamName}` : ""}</p>{lastResult.amount != null && <p className="numeric mt-2 text-3xl font-bold text-gold">{lastResult.amount}</p>}<Button onClick={() => { setLastResult(null); void refresh(); }} className="mt-6 bg-gold text-background hover:bg-gold/90">Next Player</Button></div> : state.currentPlayer ? <><PlayerCard player={state.currentPlayer} /><CurrentBidPanel bidding={bidding} leadingTeamName={leadingTeam?.name} /><div className="flex flex-wrap gap-3"><Button onClick={() => void handleSold()} disabled={busy !== null || !leadingTeam || !bidding.hasBids} className="flex-1 bg-neon text-background hover:bg-neon/90">SOLD</Button><Button onClick={() => void handleUnsold()} disabled={busy !== null} variant="outline" className="flex-1">UNSOLD</Button></div><BidHistory history={bidding.history} /><TeamBidGrid teams={teams} bidding={bidding} bidAmount={amount} onBid={(team) => void handleBid(team)} disabled={busy !== null} /></> : <div className="glass rounded-2xl p-6"><label htmlFor="player-search" className="eyebrow">Available players</label><input id="player-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" className="mt-3 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm" />{filteredPlayers.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No available players.</p> : <div className="mt-4 divide-y divide-border/40">{filteredPlayers.map((player) => <div key={player.id} className="flex items-center justify-between py-3"><span>{player.players?.name ?? "Player"}</span><Button size="sm" disabled={busy !== null} onClick={() => void activate(player.id)}>Activate</Button></div>)}</div>}</div>}
  </div>;
}
