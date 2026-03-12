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
    const { team_id, action } = body

    if (!team_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request: team_id and action (approve/reject) required' }, { status: 400 })
    }

    // Verify team belongs to this tournament
    const { data: team } = await supabase
      .from('teams')
      .select('id, status')
      .eq('id', team_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await admin
      .from('teams')
      .update({ status: newStatus })
      .eq('id', team_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('Error updating team approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
