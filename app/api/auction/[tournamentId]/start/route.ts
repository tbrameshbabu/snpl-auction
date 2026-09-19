import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseUuid } from '@/lib/api/request'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireUser(supabase)

    const tournament = unwrapRequired(
      await supabase.rpc('start_auction', { p_tournament_id: tournamentId })
    )

    return NextResponse.json({ tournament, message: 'Auction started successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
