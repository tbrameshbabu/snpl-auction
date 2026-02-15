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

    // Verify user is the auctioneer for this tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, status, budget_per_team, auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ error: 'Only the auctioneer can start the auction' }, { status: 403 })
    }

    if (!['published', 'registering', 'live'].includes(tournament.status)) {
      return NextResponse.json({ error: `Cannot start auction: tournament is ${tournament.status}` }, { status: 400 })
    }

    // Ensure at least one team is registered
    const { data: registeredTeams, error: teamsCheckError } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1)

    if (teamsCheckError) {
      return NextResponse.json({ error: teamsCheckError.message }, { status: 500 })
    }

    if (!registeredTeams || registeredTeams.length === 0) {
      return NextResponse.json({ error: 'Cannot start auction: no teams registered' }, { status: 400 })
    }

    // Check if tournament_players already exist (idempotent)
    const { data: existingPlayers, error: existingError } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1)

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    // Only seed if no tournament_players exist yet
    if (!existingPlayers || existingPlayers.length === 0) {
      // Get all interested/confirmed players
      const { data: interests, error: interestsError } = await supabase
        .from('player_interests')
        .select(`
          player_id,
          players:player_id (
            id,
            base_points
          )
        `)
        .eq('tournament_id', tournamentId)
        .in('status', ['interested', 'confirmed'])
        .order('created_at', { ascending: true })

      if (interestsError) {
        return NextResponse.json({ error: interestsError.message }, { status: 500 })
      }

      if (!interests || interests.length === 0) {
        return NextResponse.json({ error: 'No interested players found for this tournament' }, { status: 400 })
      }

      // Create tournament_players records
      const tournamentPlayers = interests.map((interest: any, index: number) => ({
        tournament_id: tournamentId,
        player_id: interest.player_id,
        base_price: interest.players?.base_points || 100,
        order_index: index + 1,
        status: 'pending',
      }))

      const { error: insertError } = await supabase
        .from('tournament_players')
        .insert(tournamentPlayers)

      if (insertError) {
        console.error('Error seeding tournament players:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Update tournament status to live
    const { data: updatedTournament, error: updateError } = await supabase
      .from('tournaments')
      .update({ status: 'live' })
      .eq('id', tournamentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      tournament: updatedTournament,
      message: 'Auction started successfully',
    })
  } catch (error: any) {
    console.error('Start auction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
