import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const supabase = await createClient()

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        auctioneers:auctioneer_id (
          id,
          name,
          organization
        )
      `)
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Get all teams in the tournament
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name')

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 })
    }

    // Get current player (first pending or re_auction player)
    const { data: currentPlayer, error: currentPlayerError } = await supabase
      .from('tournament_players')
      .select(`
        *,
        players:player_id (
          id,
          name,
          profile_image_url,
          role,
          batting_hand,
          bowling_hand,
          rating
        )
      `)
      .eq('tournament_id', tournamentId)
      .in('status', ['pending', 're_auction'])
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    // Get bid history for current player
    let bids = []
    if (currentPlayer) {
      const { data: bidData } = await supabase
        .from('bids')
        .select(`
          *,
          teams:team_id (
            id,
            name,
            short_name,
            color
          )
        `)
        .eq('tournament_player_id', currentPlayer.id)
        .order('created_at', { ascending: false })

      bids = bidData || []
    }

    // Get auction results (sold/unsold players)
    const { data: results } = await supabase
      .from('player_sales')
      .select(`
        *,
        tournament_players:tournament_player_id (
          id,
          base_price,
          players:player_id (
            id,
            name,
            profile_image_url,
            role
          )
        ),
        teams:team_id (
          id,
          name,
          short_name,
          color
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('sold_at', { ascending: false })

    return NextResponse.json({
      tournament,
      teams,
      currentPlayer: currentPlayer || null,
      bids,
      results: results || [],
    })
  } catch (error) {
    console.error('Auction state error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
