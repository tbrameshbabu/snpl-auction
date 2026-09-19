import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'
import { bidSchema } from '@/lib/validations/auctioneer'

// Bids are placed by the tournament auctioneer on behalf of a team.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireUser(supabase)
    const body = await parseJsonBody(request, bidSchema)
    if (body.tournament_id !== tournamentId) {
      throw new ApiError(400, 'tournament_id does not match the URL')
    }

    const bid = unwrapRequired(
      await supabase.rpc('place_bid', {
        p_tournament_id: tournamentId,
        p_tournament_player_id: body.tournament_player_id,
        p_team_id: body.team_id,
        p_amount: body.amount,
      })
    )

    return NextResponse.json({ bid, message: 'Bid placed successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
