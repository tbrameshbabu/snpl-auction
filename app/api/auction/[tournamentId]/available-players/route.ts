import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const supabase = await createClient()

    const { data: availablePlayers, error: playersError } = await supabase
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

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    return NextResponse.json({
      availablePlayers: availablePlayers || [],
    })
  } catch (error) {
    console.error('Fetch available players error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
