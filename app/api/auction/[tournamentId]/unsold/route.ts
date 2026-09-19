import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'
import { markUnsoldSchema } from '@/lib/validations/auctioneer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireUser(supabase)
    const body = await parseJsonBody(request, markUnsoldSchema)

    const sale = unwrapRequired(
      await supabase.rpc('mark_player_unsold', {
        p_tournament_id: tournamentId,
        p_tournament_player_id: body.tournament_player_id,
      })
    )

    return NextResponse.json({ sale, message: 'Player marked as unsold' })
  } catch (error) {
    return handleRouteError(error)
  }
}
