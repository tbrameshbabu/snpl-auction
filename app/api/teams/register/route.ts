import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { teamRegistrationSchema } from '@/lib/validations/team'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a team owner
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'team_owner') {
      return NextResponse.json({ error: 'Only team owners can register teams' }, { status: 403 })
    }

    const body = await request.json()
    const { tournament_id, name, short_name, color } = teamRegistrationSchema.parse(body)

    // Get tournament details to get budget
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('budget_per_team, status')
      .eq('id', tournament_id)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.status !== 'published' && tournament.status !== 'registering') {
      return NextResponse.json({ error: 'Tournament is not accepting registrations' }, { status: 400 })
    }

    // Check if user already has a team in this tournament
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournament_id)
      .eq('owner_id', user.id)
      .single()

    if (existingTeam) {
      return NextResponse.json({ error: 'You already have a team in this tournament' }, { status: 400 })
    }

    // Create team
    const { data: team, error: teamError } = await supabase
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

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    return NextResponse.json({ team, message: 'Team registered successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all teams for the current user
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        tournaments:tournament_id (
          id,
          title,
          status,
          auction_date,
          auction_time,
          num_teams,
          budget_per_team
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
