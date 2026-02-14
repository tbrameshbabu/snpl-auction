import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bidSchema } from '@/lib/validations/auctioneer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is the auctioneer for this tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select(`
        id,
        status,
        auctioneers:auctioneer_id (
          user_id
        )
      `)
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.auctioneers?.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the auctioneer can place bids' }, { status: 403 })
    }

    if (tournament.status !== 'live') {
      return NextResponse.json({ error: 'Tournament is not live' }, { status: 400 })
    }

    const body = await request.json()
    const { tournament_player_id, team_id, amount } = bidSchema.parse(body)

    // Verify tournament_player belongs to this tournament
    const { data: tournamentPlayer } = await supabase
      .from('tournament_players')
      .select('id, status, base_price')
      .eq('id', tournament_player_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!tournamentPlayer) {
      return NextResponse.json({ error: 'Player not in this tournament' }, { status: 404 })
    }

    if (tournamentPlayer.status !== 'pending' && tournamentPlayer.status !== 're_auction') {
      return NextResponse.json({ error: 'Player is not available for bidding' }, { status: 400 })
    }

    // Verify team belongs to this tournament
    const { data: team } = await supabase
      .from('teams')
      .select('id, budget, spent')
      .eq('id', team_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not in this tournament' }, { status: 404 })
    }

    // Check if team has enough budget
    const remainingBudget = team.budget - team.spent
    if (amount > remainingBudget) {
      return NextResponse.json({ error: 'Team does not have enough budget' }, { status: 400 })
    }

    // Create bid
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        tournament_id: tournamentId,
        tournament_player_id,
        team_id,
        amount,
      })
      .select()
      .single()

    if (bidError) {
      return NextResponse.json({ error: bidError.message }, { status: 500 })
    }

    return NextResponse.json({ bid, message: 'Bid placed successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
