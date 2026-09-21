import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'

const activateSchema = z.object({
  tournament_player_id: z.string().uuid(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireUser(supabase)
    const { tournament_player_id } = await parseJsonBody(request, activateSchema)

    const player = unwrapRequired(
      await supabase.rpc('activate_player', {
        p_tournament_id: tournamentId,
        p_tournament_player_id: tournament_player_id,
      })
    )

    return NextResponse.json({ player, message: 'Player activated successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
