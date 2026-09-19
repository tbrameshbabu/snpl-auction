import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOwnedTournament } from '@/lib/api/auth'
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
    await requireOwnedTournament(supabase, tournamentId)

    const teams = unwrapList(
      await supabase
        .from('teams')
        .select('id, name, short_name, color, budget, spent, status, owner_id, created_at, users:owner_id (email)')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })
    )

    return NextResponse.json({ teams })
  } catch (error) {
    return handleRouteError(error)
  }
}
