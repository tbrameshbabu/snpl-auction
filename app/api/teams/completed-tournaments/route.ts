import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrapList } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const teams = unwrapList(
      await supabase
        .from('teams')
        .select(
          `id, name, short_name, color, budget, spent, tournament_id,
           tournaments!inner (id, title, auction_date, auction_time, status),
           player_sales!player_sales_team_id_fkey (status)`
        )
        .eq('owner_id', user.id)
        .eq('tournaments.status', 'completed')
    )

    const tournaments = teams.map(({ tournaments, player_sales, ...team }) => ({
      tournament: tournaments,
      team,
      players_bought: player_sales.filter((sale) => sale.status === 'sold').length,
    }))

    return NextResponse.json({ tournaments })
  } catch (error) {
    return handleRouteError(error)
  }
}
