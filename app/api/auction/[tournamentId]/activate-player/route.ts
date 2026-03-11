import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const activateSchema = z.object({
  tournament_player_id: z.string().uuid(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { tournament_player_id } = activateSchema.parse(body)

    // 3. Verify user is auctioneer for this tournament
    const { data: auctioneerData, error: auctioneerError } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (auctioneerError || !auctioneerData) {
      return NextResponse.json({ error: 'Unauthorized - Not an auctioneer' }, { status: 403 })
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, status, auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.auctioneer_id !== auctioneerData.id) {
      return NextResponse.json({ error: 'Unauthorized - You do not own this tournament' }, { status: 403 })
    }

    if (tournament.status !== 'live') {
      return NextResponse.json({ error: 'Tournament is not live' }, { status: 400 })
    }

    // 4. Reset any currently active players to pending
    const { error: resetError } = await supabase
      .from('tournament_players')
      .update({ status: 'pending' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 })
    }

    // 5. Activate the new player
    const { error: activateError } = await supabase
      .from('tournament_players')
      .update({ status: 'active' })
      .eq('id', tournament_player_id)
      .eq('tournament_id', tournamentId)

    if (activateError) {
      return NextResponse.json({ error: activateError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Player activated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Activate player error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
