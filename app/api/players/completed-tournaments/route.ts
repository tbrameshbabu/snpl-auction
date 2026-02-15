import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the player profile
    const { data: playerProfile, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('user_id', user.id)
      .single()

    if (playerError || !playerProfile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Get all tournament_players entries for this player
    const { data: tournamentPlayers, error: tpError } = await supabase
      .from('tournament_players')
      .select(`
        id,
        status,
        base_price,
        tournament_id,
        tournaments:tournament_id (
          id,
          title,
          auction_date,
          auction_time,
          status
        )
      `)
      .eq('player_id', playerProfile.id)

    if (tpError) {
      return NextResponse.json({ error: tpError.message }, { status: 500 })
    }

    // Filter to only completed tournaments
    const completedEntries = (tournamentPlayers || [])
      .filter((tp: any) => tp.tournaments?.status === 'completed')

    // For each entry, get the player_sales record
    const results = []
    for (const tp of completedEntries) {
      const { data: sale } = await supabase
        .from('player_sales')
        .select(`
          id,
          final_price,
          status,
          teams:team_id (
            id,
            name,
            short_name,
            color
          )
        `)
        .eq('tournament_player_id', tp.id)
        .single()

      results.push({
        tournament: (tp as any).tournaments,
        player_status: sale?.status || tp.status,
        sold_to: sale?.teams || null,
        sold_price: sale?.final_price || null,
        base_price: tp.base_price,
      })
    }

    return NextResponse.json({ tournaments: results })
  } catch (error: any) {
    console.error('Error fetching player completed tournaments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
