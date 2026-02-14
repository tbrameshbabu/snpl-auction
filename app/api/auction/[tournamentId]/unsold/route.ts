import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { markUnsoldSchema } from '@/lib/validations/auctioneer'

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
    const { tournament_player_id } = markUnsoldSchema.parse(body)

    // Update tournament_player status
    const { error: updateError } = await supabase
      .from('tournament_players')
      .update({ status: 'unsold' })
      .eq('id', tournament_player_id)
      .eq('tournament_id', tournamentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create player_sale record
    const { data: sale, error: saleError } = await supabase
      .from('player_sales')
      .insert({
        tournament_id: tournamentId,
        tournament_player_id,
        team_id: null,
        final_price: null,
        status: 'unsold',
      })
      .select()
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    return NextResponse.json({ sale, message: 'Player marked as unsold' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
