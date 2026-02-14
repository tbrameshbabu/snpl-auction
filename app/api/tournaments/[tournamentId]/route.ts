import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  
  try {
    const supabase = await createClient()

    // Get tournament with auctioneer info (public access)
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        auctioneers:auctioneer_id (
          name,
          organization
        )
      `)
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ 
        error: 'Tournament not found',
        details: tournamentError?.message 
      }, { status: 404 })
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
