import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapList, unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const player = unwrapRequired(
      await supabase.from('players').select('id, name').eq('user_id', user.id).maybeSingle(),
      'Player not found'
    )

    const entries = unwrapList(
      await supabase
        .from('tournament_players')
        .select(
          `id, status, base_price, tournament_id,
           tournaments!inner (id, title, auction_date, auction_time, status),
           player_sales!player_sales_tournament_player_id_fkey (id, final_price, status, teams!player_sales_team_id_fkey (id, name, short_name, color))`
        )
        .eq('player_id', player.id)
        .eq('tournaments.status', 'completed')
    )

    const tournaments = entries.map((entry) => {
      const sale = entry.player_sales
      return {
        tournament: entry.tournaments,
        player_status: sale?.status ?? entry.status,
        sold_to: sale?.teams ?? null,
        sold_price: sale?.final_price ?? null,
        base_price: entry.base_price,
      }
    })

    return NextResponse.json({ tournaments })
  } catch (error) {
    return handleRouteError(error)
  }
}
