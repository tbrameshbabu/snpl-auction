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
    const { data: auctioneer } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!auctioneer) {
      return NextResponse.json({ error: 'Unauthorized - Not an auctioneer' }, { status: 403 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, status, auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ error: 'Unauthorized - You do not own this tournament' }, { status: 403 })
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
      console.error('Error updating tournament_player:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    console.log('Updated tournament_player status to sold')

    // Create or update player_sale record
    const { data: sale, error: saleError } = await supabase
      .from('player_sales')
      .upsert({
        tournament_id: tournamentId,
        tournament_player_id,
        team_id,
        final_price,
        status: 'sold',
      }, { onConflict: 'tournament_player_id' })
      .select()
      .single()

    if (saleError) {
      console.error('Error creating player_sale:', saleError)
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }
    console.log('Created player_sale record:', sale)

    // Update team's spent amount using admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const hasAdminKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('Admin key present:', hasAdminKey)
    
    if (!hasAdminKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createAdminClient()
    const newSpent = (team.spent || 0) + final_price
    
    console.log('Updating team budget with admin client:', { team_id, old_spent: team.spent, new_spent: newSpent })
    const { error: teamError } = await adminClient
      .from('teams')
      .update({ spent: newSpent })
      .eq('id', team_id)

    if (teamError) {
      console.error('Error updating team budget:', teamError)
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }
    console.log('Updated team budget successfully')

    return NextResponse.json({ sale, message: 'Player sold successfully' })
  } catch (error: any) {
    console.error('Error in sold route:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
