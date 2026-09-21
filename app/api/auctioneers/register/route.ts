import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/api/auth'
import { getProfilePhone } from '@/lib/api/contacts'
import { unwrap, unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody } from '@/lib/api/request'
import { auctioneerRegistrationSchema } from '@/lib/validations/auctioneer'

// Completes the profile of a user whose role was already set to 'auctioneer'
// by an operator; public signup cannot reach this role.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireRole(supabase, 'auctioneer')
    const body = await parseJsonBody(request, auctioneerRegistrationSchema)

    const existing = unwrap(
      await supabase.from('auctioneers').select('id').eq('user_id', user.id).maybeSingle()
    )
    if (existing) {
      throw new ApiError(409, 'Auctioneer profile already exists')
    }

    const auctioneer = unwrapRequired(
      await supabase
        .from('auctioneers')
        .insert({ user_id: user.id, ...body })
        .select()
        .single()
    )

    return NextResponse.json({
      auctioneer: { ...auctioneer, phone: await getProfilePhone(supabase, user.id, 'auctioneer') },
      message: 'Auctioneer registered successfully',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
