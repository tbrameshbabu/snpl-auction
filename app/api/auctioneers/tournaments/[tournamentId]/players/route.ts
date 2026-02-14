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

    // Transform the data to flatten player info
    const players = interests?.map(interest => ({
      ...interest.players,
      interest_status: interest.status
    })) || []

    return NextResponse.json({ players })
  } catch (error: any) {
    console.error('Error in players API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
