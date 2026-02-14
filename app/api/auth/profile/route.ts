import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role and profile data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    const role = userData.role

    // Fetch role-specific profile
    let profile = null
    if (role === 'player') {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single()
      profile = data
    } else if (role === 'team_owner') {
      // Team owners don't have a separate profile table
      profile = { role: 'team_owner' }
    } else if (role === 'auctioneer') {
      const { data } = await supabase
        .from('auctioneers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      profile = data
    }

    return NextResponse.json({
      user,
      role,
      profile,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
