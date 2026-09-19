import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unwrap, unwrapList, unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseUuid } from '@/lib/api/request'

const TEAM_FIELDS = 'id, name, short_name, color, logo_url'

// Authoritative auction snapshot used by both the auctioneer console and the
// viewer. `bids` contains only the current auction round of the active player,
// newest first, so `bids[0]` (also exposed as `currentBid`) is the leading bid.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()

    const tournament = unwrapRequired(
      await supabase
        .from('tournaments')
        .select('*, auctioneers:auctioneer_id (id, name, organization)')
        .eq('id', tournamentId)
        .maybeSingle(),
      'Tournament not found'
    )

    const [teams, currentPlayer, results] = await Promise.all([
      supabase.from('teams').select('*').eq('tournament_id', tournamentId).order('name').then(unwrapList),
      supabase
        .from('tournament_players')
        .select(
          '*, players:player_id (id, name, profile_image_url, role, batting_hand, bowling_hand, rating)'
        )
        .eq('tournament_id', tournamentId)
        .eq('status', 'active')
        .maybeSingle()
        .then(unwrap),
      supabase
        .from('player_sales')
        .select(
          `*,
           tournament_players!player_sales_tournament_player_id_fkey (id, base_price, players:player_id (id, name, profile_image_url, role)),
           teams!player_sales_team_id_fkey (${TEAM_FIELDS})`
        )
        .eq('tournament_id', tournamentId)
        .order('sold_at', { ascending: false })
        .then(unwrapList),
    ])

    const bids = currentPlayer
      ? await supabase
          .from('bids')
          .select(`*, teams!bids_team_id_fkey (${TEAM_FIELDS})`)
          .eq('tournament_player_id', currentPlayer.id)
          .eq('round', currentPlayer.auction_round)
          .order('amount', { ascending: false })
          .order('created_at', { ascending: false })
          .then(unwrapList)
      : []

    return NextResponse.json({
      tournament,
      teams,
      currentPlayer,
      bids,
      currentBid: bids[0] ?? null,
      maxPlayersPerTeam: tournament.num_players_per_team,
      results,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
