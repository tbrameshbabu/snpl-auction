import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Verify user is the auctioneer
    const { data: auctioneer } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!auctioneer) {
      return NextResponse.json({ error: 'Unauthorized - Not an auctioneer' }, { status: 403 })
    }

    // Verify user owns this tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ error: 'Unauthorized - You do not own this tournament' }, { status: 403 })
    }

    // 1. Get all players with status 'unsold' for this tournament
    const { data: unsoldPlayers, error: fetchError } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'unsold')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!unsoldPlayers || unsoldPlayers.length === 0) {
      return NextResponse.json({ message: 'No unsold players to re-auction' })
    }

    const playerIds = unsoldPlayers.map(p => p.id)

    // 2. Delete player_sales records for these players
    // This removes them from the "Unsold" list in results
    const { error: deleteError } = await supabase
      .from('player_sales')
      .delete()
      .in('tournament_player_id', playerIds)

    if (deleteError) {
      console.error('Error deleting player_sales:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 3. Update tournament_players status to 're_auction'
    const { error: updateError } = await supabase
      .from('tournament_players')
      .update({ status: 're_auction' })
      .in('id', playerIds)

    if (updateError) {
      console.error('Error updating tournament_players:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Successfully moved ${playerIds.length} players to re-auction pool`,
      count: playerIds.length
    })

  } catch (error: any) {
    console.error('Re-auction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
