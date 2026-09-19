import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrap, unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const { role } = unwrapRequired(
      await supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
      'User profile not found'
    )

    const profile =
      role === 'player'
        ? unwrap(await supabase.from('players').select('*').eq('user_id', user.id).maybeSingle())
        : role === 'auctioneer'
          ? unwrap(await supabase.from('auctioneers').select('*').eq('user_id', user.id).maybeSingle())
          : { role }

    return NextResponse.json({ user, role, profile })
  } catch (error) {
    return handleRouteError(error)
  }
}
