import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an auctioneer and owns this tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Get players who have shown interest in this tournament
    const { data: interests, error } = await supabase
      .from('player_interests')
      .select(`
        id,
        status,
        players:player_id (
          id,
          name,
          role,
          batting_hand,
          bowling_hand,
          base_points,
          matches_played,
          runs_scored,
          wickets_taken,
          profile_image_url
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching players:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get tournament_players for order_index
    const { data: tournamentPlayers } = await supabase
      .from('tournament_players')
      .select('player_id, order_index')
      .eq('tournament_id', tournamentId)

    const orderMap = new Map<string, number>()
    tournamentPlayers?.forEach((tp: any) => {
      orderMap.set(tp.player_id, tp.order_index ?? 999)
    })

    // Transform the data to flatten player info
    const players = interests?.map(interest => ({
      ...interest.players,
      interest_status: interest.status,
      order_index: orderMap.get((interest.players as any)?.id) ?? 999,
    })) || []

    // Sort by order_index
    players.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))

    return NextResponse.json({ players })
  } catch (error: any) {
    console.error('Error in players API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// PUT: Save player order
export async function PUT(
  request: Request,
  context: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify auctioneer owns this tournament
    const { data: auctioneer } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!auctioneer) {
      return NextResponse.json({ error: 'Not an auctioneer' }, { status: 403 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, auctioneer_id, status')
      .eq('id', tournamentId)
      .single()

    if (!tournament || tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ error: 'Tournament not found or not owned' }, { status: 404 })
    }

    if (tournament.status === 'live' || tournament.status === 'completed') {
      return NextResponse.json({ error: 'Cannot reorder during or after auction' }, { status: 400 })
    }

    const body = await request.json()
    const { playerOrder } = body // Array of { player_id, order_index }

    if (!Array.isArray(playerOrder)) {
      return NextResponse.json({ error: 'Invalid playerOrder' }, { status: 400 })
    }

    // Use admin client for batch update
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // Update each tournament_player's order_index
    for (const item of playerOrder) {
      const { error: updateErr } = await admin
        .from('tournament_players')
        .update({ order_index: item.order_index })
        .eq('tournament_id', tournamentId)
        .eq('player_id', item.player_id)

      if (updateErr) {
        console.error(`Failed to update order for ${item.player_id}:`, updateErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving player order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
