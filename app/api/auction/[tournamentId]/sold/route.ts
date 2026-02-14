import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { markSoldSchema } from '@/lib/validations/auctioneer'

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

    if (!tournament || tournament.auctioneers?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { tournament_player_id, team_id, final_price } = markSoldSchema.parse(body)

    // Verify tournament_player
    const { data: tournamentPlayer } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('id', tournament_player_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!tournamentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Verify team has enough budget
    const { data: team } = await supabase
      .from('teams')
      .select('budget, spent')
      .eq('id', team_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const remainingBudget = team.budget - team.spent
    if (final_price > remainingBudget) {
      return NextResponse.json({ error: 'Team does not have enough budget' }, { status: 400 })
    }

    // Update tournament_player status
    const { error: updateError } = await supabase
      .from('tournament_players')
      .update({ status: 'sold' })
      .eq('id', tournament_player_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create player_sale record
    const { data: sale, error: saleError } = await supabase
      .from('player_sales')
      .insert({
        tournament_id: tournamentId,
        tournament_player_id,
        team_id,
        final_price,
        status: 'sold',
      })
      .select()
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    // Update team's spent amount
    const { error: teamError } = await supabase
      .from('teams')
      .update({ spent: team.spent + final_price })
      .eq('id', team_id)

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    return NextResponse.json({ sale, message: 'Player sold successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
