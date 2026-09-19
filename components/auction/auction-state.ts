/**
 * Typed view of GET /api/auction/[tournamentId]/state and the pure
 * derivations every auction surface (auctioneer console, viewer, results)
 * shares. Everything here is server-truth driven: no local timers, no
 * locally fabricated bids.
 */

export type TournamentStatus =
  | "draft"
  | "published"
  | "registering"
  | "live"
  | "completed"
  | "cancelled";

export type TournamentPlayerStatus =
  | "pending"
  | "active"
  | "sold"
  | "unsold"
  | "re_auction";

export interface AuctionTournament {
  id: string;
  title: string;
  description?: string | null;
  status: TournamentStatus;
  num_teams: number;
  num_players_per_team: number;
  min_players_per_team?: number;
  budget_per_team: number;
  auction_date?: string;
  auction_time?: string;
}

export interface AuctionTeam {
  id: string;
  name: string;
  short_name: string | null;
  color: string | null;
  budget: number;
  spent: number;
  logo_url?: string | null;
}

export interface AuctionPlayerProfile {
  id: string;
  name: string;
  profile_image_url?: string | null;
  role: string;
  batting_hand?: string | null;
  bowling_hand?: string | null;
  rating?: number | null;
}

export interface AuctionTournamentPlayer {
  id: string;
  player_id: string;
  base_price: number;
  order_index: number | null;
  status: TournamentPlayerStatus;
  players: AuctionPlayerProfile | null;
}

export interface AuctionBid {
  id: string;
  tournament_id: string;
  tournament_player_id: string;
  team_id: string;
  amount: number;
  created_at: string;
  teams: Pick<AuctionTeam, "id" | "name" | "short_name" | "color"> | null;
}

export interface AuctionSale {
  id: string;
  tournament_player_id: string;
  team_id: string | null;
  final_price: number | null;
  status: "sold" | "unsold";
  sold_at?: string;
  tournament_players: {
    id: string;
    base_price: number;
    players: Pick<
      AuctionPlayerProfile,
      "id" | "name" | "profile_image_url" | "role"
    > | null;
  } | null;
  teams: Pick<AuctionTeam, "id" | "name" | "short_name" | "color"> | null;
}

export interface AuctionState {
  tournament: AuctionTournament;
  teams: AuctionTeam[];
  currentPlayer: AuctionTournamentPlayer | null;
  bids: AuctionBid[];
  results: AuctionSale[];
}

/* ─────────────────── Derived views ─────────────────── */

export const DEFAULT_TEAM_COLOR = "#F4A261";

export interface TeamSummary {
  id: string;
  name: string;
  short_name: string;
  color: string;
  budget: number;
  spent: number;
  remaining: number;
  playersBought: number;
  maxPlayers: number;
  logo_url: string | null;
}

export function deriveTeamSummaries(state: AuctionState): TeamSummary[] {
  const bought = new Map<string, number>();
  for (const sale of state.results) {
    if (sale.status === "sold" && sale.team_id) {
      bought.set(sale.team_id, (bought.get(sale.team_id) ?? 0) + 1);
    }
  }
  return state.teams.map((t) => {
    const budget = t.budget ?? 0;
    const spent = t.spent ?? 0;
    return {
      id: t.id,
      name: t.name,
      short_name: t.short_name || t.name.charAt(0),
      color: t.color || DEFAULT_TEAM_COLOR,
      budget,
      spent,
      remaining: budget - spent,
      playersBought: bought.get(t.id) ?? 0,
      maxPlayers: state.tournament.num_players_per_team,
      logo_url: t.logo_url ?? null,
    };
  });
}

export interface BidHistoryEntry {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  createdAt: string;
}

export interface BiddingView {
  /** Highest persisted bid amount, or the base price when there are no bids. */
  currentAmount: number;
  leadingTeamId: string | null;
  hasBids: boolean;
  /** Newest first. */
  history: BidHistoryEntry[];
}

export function deriveBidding(state: AuctionState): BiddingView {
  const player = state.currentPlayer;
  const bids = player
    ? state.bids.filter((b) => b.tournament_player_id === player.id)
    : [];
  const sorted = [...bids].sort(
    (a, b) => b.amount - a.amount || b.created_at.localeCompare(a.created_at),
  );
  const top = sorted[0];
  const teamName = (bid: AuctionBid) =>
    bid.teams?.name ??
    state.teams.find((t) => t.id === bid.team_id)?.name ??
    "Unknown team";
  return {
    currentAmount: top?.amount ?? player?.base_price ?? 0,
    leadingTeamId: top?.team_id ?? null,
    hasBids: sorted.length > 0,
    history: sorted.map((b) => ({
      id: b.id,
      teamId: b.team_id,
      teamName: teamName(b),
      amount: b.amount,
      createdAt: b.created_at,
    })),
  };
}

export function getBidIncrement(currentAmount: number): number {
  if (currentAmount < 100) return 10;
  if (currentAmount < 300) return 20;
  if (currentAmount < 500) return 25;
  return 50;
}

/** Amount the next bid must be: base price for the opening bid, otherwise current + tier increment. */
export function nextBidAmount(bidding: BiddingView, basePrice: number): number {
  return bidding.hasBids
    ? bidding.currentAmount + getBidIncrement(bidding.currentAmount)
    : basePrice;
}

export type BidBlocker = "leading" | "budget" | "roster";

/** Returns why a team cannot place `amount`, or null when the bid is allowed client-side. */
export function getBidBlocker(
  team: TeamSummary,
  bidding: BiddingView,
  amount: number,
): BidBlocker | null {
  if (team.id === bidding.leadingTeamId) return "leading";
  if (team.playersBought >= team.maxPlayers) return "roster";
  if (!Number.isInteger(amount) || amount > team.remaining) return "budget";
  return null;
}

export interface ResultCounts {
  sold: number;
  unsold: number;
  total: number;
}

export function countResults(results: AuctionSale[]): ResultCounts {
  let sold = 0;
  let unsold = 0;
  for (const r of results) {
    if (r.status === "sold") sold += 1;
    else unsold += 1;
  }
  return { sold, unsold, total: results.length };
}

export type AuctionPhase = "not_started" | "waiting" | "bidding" | "completed";

/**
 * "waiting" = live tournament with no active player (auctioneer is between players).
 * This is deliberately distinct from "completed", which only the tournament status decides.
 */
export function getAuctionPhase(state: AuctionState): AuctionPhase {
  const status = state.tournament.status;
  if (status === "completed" || status === "cancelled") return "completed";
  if (status !== "live") return "not_started";
  return state.currentPlayer ? "bidding" : "waiting";
}
