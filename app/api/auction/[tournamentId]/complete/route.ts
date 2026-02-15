import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Verify user owns this tournament
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

    if (tournament.status !== 'live') {
      return NextResponse.json({ error: `Cannot complete: tournament is ${tournament.status}` }, { status: 400 })
    }

    // Update tournament status to completed
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tournament completed successfully' })

  } catch (error: any) {
    console.error('Complete tournament error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
