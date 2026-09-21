import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapList, unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseJsonBody } from '@/lib/api/request'
import type { ServerSupabaseClient } from '@/lib/supabase/server'
import { playerInterestSchema } from '@/lib/validations/player'

async function requirePlayerId(supabase: ServerSupabaseClient): Promise<string> {
  const user = await requireUser(supabase)
  const player = unwrapRequired(
    await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle(),
    'Player profile not found'
  )
  return player.id
}

// Registration windows are enforced by the database (guard_player_interests_write).
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const playerId = await requirePlayerId(supabase)
    const { tournament_id, status, bid_preference } = await parseJsonBody(request, playerInterestSchema)

    const interest = unwrapRequired(
      await supabase
        .from('player_interests')
        .upsert(
          { player_id: playerId, tournament_id, status, bid_preference },
          { onConflict: 'player_id,tournament_id' }
        )
        .select()
        .single()
    )

    return NextResponse.json({ interest, message: 'Interest saved' })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const playerId = await requirePlayerId(supabase)

    const interests = unwrapList(
      await supabase
        .from('player_interests')
        .select(
          '*, tournaments:tournament_id (id, title, description, auction_date, auction_time, status, num_teams, budget_per_team)'
        )
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
    )

    return NextResponse.json({ interests })
  } catch (error) {
    return handleRouteError(error)
  }
}
