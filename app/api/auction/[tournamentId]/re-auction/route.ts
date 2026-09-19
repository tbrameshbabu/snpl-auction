import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapList } from '@/lib/api/db'
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

    const players = unwrapList(
      await supabase.rpc('re_auction_unsold', { p_tournament_id: tournamentId })
    )

    return NextResponse.json({
      players,
      count: players.length,
      message:
        players.length === 0
          ? 'No unsold players to re-auction'
          : `${players.length} unsold players moved to re-auction`,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
