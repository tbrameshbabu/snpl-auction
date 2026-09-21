import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseUuid } from '@/lib/api/request'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()

    const tournament = unwrapRequired(
      await supabase
        .from('tournaments')
        .select('*, auctioneers:auctioneer_id (name, organization)')
        .eq('id', tournamentId)
        .maybeSingle(),
      'Tournament not found'
    )

    return NextResponse.json({ tournament })
  } catch (error) {
    return handleRouteError(error)
  }
}
