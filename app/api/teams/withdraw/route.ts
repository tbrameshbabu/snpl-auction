import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const body = await request.json()
    const { tournament_id } = body

    if (!tournament_id) {
      return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })
    }

    const { data: team, error } = await supabase
      .from('teams')
      .update({ status: 'withdrawn' })
      .eq('tournament_id', tournament_id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team, message: 'Withdrawn successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
