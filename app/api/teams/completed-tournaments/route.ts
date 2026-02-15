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

    // Get all teams owned by this user
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        short_name,
        color,
        budget,
        spent,
        tournament_id,
        tournaments:tournament_id (
          id,
          title,
          auction_date,
          auction_time,
          status
        )
      `)
      .eq('owner_id', user.id)

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 })
    }

    // Filter to only completed tournaments
    const completedTournaments = (teams || [])
      .filter((t: any) => t.tournaments?.status === 'completed')
      .map((t: any) => ({
        tournament: t.tournaments,
        team: {
          id: t.id,
          name: t.name,
          short_name: t.short_name,
          color: t.color,
          budget: t.budget,
          spent: t.spent,
        },
        players_bought: 0,
      }))

    // For each, get player count from player_sales
    for (const ct of completedTournaments) {
      const { count } = await supabase
        .from('player_sales')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', ct.tournament.id)
        .eq('team_id', ct.team.id)
        .eq('status', 'sold')

      ct.players_bought = count || 0
    }

    return NextResponse.json({ tournaments: completedTournaments })
  } catch (error: any) {
    console.error('Error fetching completed tournaments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
