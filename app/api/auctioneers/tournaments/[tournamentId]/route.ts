import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get auctioneer profile
    const { data: auctioneer, error: auctioneerError } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (auctioneerError || !auctioneer) {
      console.error('Auctioneer error:', auctioneerError)
      return NextResponse.json({ 
        error: 'Auctioneer profile not found',
        details: auctioneerError?.message 
      }, { status: 404 })
    }

    console.log('Fetching tournament:', tournamentId, 'for auctioneer:', auctioneer.id)

    // Get tournament - try without auctioneer_id filter first
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    console.log('Tournament query result:', { tournament, error: tournamentError })

    if (tournamentError) {
      console.error('Tournament error:', tournamentError)
      return NextResponse.json({ 
        error: 'Tournament not found',
        details: tournamentError.message,
        tournamentId: tournamentId
      }, { status: 404 })
    }

    if (!tournament) {
      return NextResponse.json({ 
        error: 'Tournament not found',
        tournamentId: tournamentId
      }, { status: 404 })
    }

    // Check if tournament belongs to this auctioneer
    if (tournament.auctioneer_id !== auctioneer.id) {
      return NextResponse.json({ 
        error: 'Unauthorized - Tournament belongs to different auctioneer',
        tournamentAuctioneerId: tournament.auctioneer_id,
        yourAuctioneerId: auctioneer.id
      }, { status: 403 })
    }


    return NextResponse.json({ tournament })
  } catch (error: any) {
    console.error('Error fetching tournament:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

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

    // Get auctioneer ID from auctioneers table
    const { data: auctioneer, error: auctioneerError } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (auctioneerError || !auctioneer) {
      console.error('Auctioneer error:', auctioneerError)
      return NextResponse.json({ 
        error: 'Auctioneer profile not found',
        details: auctioneerError?.message 
      }, { status: 404 })
    }

    const body = await request.json()

    // If only status is being updated (publish action)
    if (body.status && Object.keys(body).length === 1) {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .update({ status: body.status })
        .eq('id', tournamentId)
        .eq('auctioneer_id', auctioneer.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating tournament status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ tournament, message: 'Tournament published successfully' })
    }

    // Full tournament update (edit action)
    const updateData: any = {}
    
    if (body.title) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.auction_date) updateData.auction_date = body.auction_date
    if (body.auction_time) updateData.auction_time = body.auction_time
    if (body.num_teams) updateData.num_teams = body.num_teams
    if (body.budget_per_team) updateData.budget_per_team = body.budget_per_team

    // Only allow editing draft tournaments
    const { data: existingTournament } = await supabase
      .from('tournaments')
      .select('status')
      .eq('id', tournamentId)
      .eq('auctioneer_id', auctioneer.id)
      .single()

    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (existingTournament.status !== 'draft') {
      return NextResponse.json({ 
        error: 'Only draft tournaments can be edited' 
      }, { status: 400 })
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', tournamentId)
      .eq('auctioneer_id', auctioneer.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tournament:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tournament, message: 'Tournament updated successfully' })
  } catch (error: any) {
    console.error('Error in PATCH tournament:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
