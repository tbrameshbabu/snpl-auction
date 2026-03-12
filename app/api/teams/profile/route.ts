import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const teamUpdateSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(3, 'Team name must be at least 3 characters').max(50),
  short_name: z.string().min(2, 'Short name must be 2-3 characters').max(3),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use hex color)'),
})

export async function PUT(request: Request) {
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
      return NextResponse.json({ error: 'Only team owners can update team profiles' }, { status: 403 })
    }

    const body = await request.json()
    const { team_id, name, short_name, color } = teamUpdateSchema.parse(body)

    // Verify team ownership
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id, owner_id')
      .eq('id', team_id)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (existingTeam.owner_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this team' }, { status: 403 })
    }

    // Update team profile
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update({
        name,
        short_name,
        color,
      })
      .eq('id', team_id)
      .select()
      .single()

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    return NextResponse.json({ team, message: 'Team profile updated successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
