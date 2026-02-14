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

    // Get teams registered for this tournament
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        short_name,
        color,
        budget,
        spent,
        status,
        owner_id,
        created_at,
        users:owner_id (
          email
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams: teams || [] })
  } catch (error: any) {
    console.error('Error in teams API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
