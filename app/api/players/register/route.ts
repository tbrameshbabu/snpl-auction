import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, requireUser } from '@/lib/api/auth'
import { getProfilePhone } from '@/lib/api/contacts'
import { unwrap, unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody } from '@/lib/api/request'
import { playerRegistrationSchema } from '@/lib/validations/player'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireRole(supabase, 'player')
    const body = await parseJsonBody(request, playerRegistrationSchema)

    const existing = unwrap(await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle())
    if (existing) {
      throw new ApiError(409, 'Player profile already exists')
    }

    const player = unwrapRequired(
      await supabase
        .from('players')
        .insert({ user_id: user.id, ...body })
        .select()
        .single()
    )

    return NextResponse.json({
      player: { ...player, phone: await getProfilePhone(supabase, user.id, 'player') },
      message: 'Player registered successfully',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const player = unwrapRequired(
      await supabase.from('players').select('*').eq('user_id', user.id).maybeSingle(),
      'Player profile not found'
    )

    return NextResponse.json({
      player: { ...player, phone: await getProfilePhone(supabase, user.id, 'player') },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
