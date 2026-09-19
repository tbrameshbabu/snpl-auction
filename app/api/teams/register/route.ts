import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, requireUser } from '@/lib/api/auth'
import { unwrap, unwrapList, unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody } from '@/lib/api/request'
import { teamInterestSchema, teamRegistrationSchema } from '@/lib/validations/team'

// The team budget is copied from the tournament; the database rejects any
// other budget or a non-zero spend (guard_teams_write).
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireRole(supabase, 'team_owner')
    const { tournament_id, name, short_name, color } = await parseJsonBody(request, teamRegistrationSchema)

    const tournament = unwrapRequired(
      await supabase.from('tournaments').select('budget_per_team, status').eq('id', tournament_id).maybeSingle(),
      'Tournament not found'
    )
    if (tournament.status !== 'published' && tournament.status !== 'registering') {
      throw new ApiError(409, 'Tournament is not accepting registrations')
    }

    const existing = unwrap(
      await supabase.from('teams').select('id').eq('tournament_id', tournament_id).eq('owner_id', user.id).maybeSingle()
    )
    if (existing) {
      throw new ApiError(409, 'You already have a team in this tournament')
    }

    const team = unwrapRequired(
      await supabase
        .from('teams')
        .insert({
          tournament_id,
          owner_id: user.id,
          name,
          short_name,
          color,
          budget: tournament.budget_per_team,
          status: 'interested',
        })
        .select()
        .single()
    )

    return NextResponse.json({ team, message: 'Team registered successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}

// Withdraw or re-join with an existing team. The database freezes team
// status once the tournament leaves registration (guard_teams_write).
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireRole(supabase, 'team_owner')
    const { tournament_id, status } = await parseJsonBody(request, teamInterestSchema)

    const team = unwrapRequired(
      await supabase
        .from('teams')
        .update({ status })
        .eq('tournament_id', tournament_id)
        .eq('owner_id', user.id)
        .select()
        .maybeSingle(),
      'Team not found'
    )

    return NextResponse.json({ team, message: status === 'withdrawn' ? 'Team withdrawn' : 'Team re-joined' })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const teams = unwrapList(
      await supabase
        .from('teams')
        .select(
          '*, tournaments:tournament_id (id, title, status, auction_date, auction_time, num_teams, budget_per_team)'
        )
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
    )

    return NextResponse.json({ teams })
  } catch (error) {
    return handleRouteError(error)
  }
}
