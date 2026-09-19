import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unwrapList } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseUuid } from '@/lib/api/request'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()

    const availablePlayers = unwrapList(
      await supabase
        .from('tournament_players')
        .select(
          '*, players:player_id (id, name, profile_image_url, role, batting_hand, bowling_hand, rating)'
        )
        .eq('tournament_id', tournamentId)
        .in('status', ['pending', 're_auction'])
        .order('order_index', { ascending: true })
    )

    return NextResponse.json({ availablePlayers })
  } catch (error) {
    return handleRouteError(error)
  }
}
