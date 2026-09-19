import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'
import { markSoldSchema } from '@/lib/validations/auctioneer'

// team_id/final_price are a confirmation of what the auctioneer saw; the
// database rejects them unless they match the latest bid of the current round.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireUser(supabase)
    const body = await parseJsonBody(request, markSoldSchema)

    const sale = unwrapRequired(
      await supabase.rpc('mark_player_sold', {
        p_tournament_id: tournamentId,
        p_tournament_player_id: body.tournament_player_id,
        p_team_id: body.team_id,
        p_final_price: body.final_price,
      })
    )

    return NextResponse.json({ sale, message: 'Player sold successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
