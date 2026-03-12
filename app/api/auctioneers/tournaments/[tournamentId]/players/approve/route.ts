import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
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

    // Verify user is an auctioneer
    const { data: auctioneer } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!auctioneer) {
      return NextResponse.json({ error: 'Not an auctioneer' }, { status: 403 })
    }

    // Verify tournament ownership
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, auctioneer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament || tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ error: 'Tournament not found or not owned' }, { status: 404 })
    }

    const body = await request.json()
    const { interest_id, action } = body

    if (!interest_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request: interest_id and action (approve/reject) required' }, { status: 400 })
    }

    // Get the interest record
    const { data: interest } = await supabase
      .from('player_interests')
      .select('id, player_id, tournament_id, status')
      .eq('id', interest_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!interest) {
      return NextResponse.json({ error: 'Interest record not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update interest status
    const { error: updateError } = await admin
      .from('player_interests')
      .update({ status: newStatus })
      .eq('id', interest_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (action === 'approve') {
      // Add player to tournament_players (auction pool) if not already present
      const { data: existing } = await admin
        .from('tournament_players')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', interest.player_id)
        .single()

      if (!existing) {
        const { error: insertError } = await admin
          .from('tournament_players')
          .insert({
            tournament_id: tournamentId,
            player_id: interest.player_id,
            status: 'available',
            order_index: 999,
          })

        if (insertError) {
          console.error('Failed to add player to tournament_players:', insertError)
        }
      }
    } else {
      // On reject, remove from tournament_players if present
      await admin
        .from('tournament_players')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', interest.player_id)
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('Error updating player approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
