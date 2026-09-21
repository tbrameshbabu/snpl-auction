import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuctioneer } from '@/lib/api/auth'
import { unwrapList, unwrapRequired } from '@/lib/api/db'
import { handleRouteError } from '@/lib/api/errors'
import { parseJsonBody } from '@/lib/api/request'
import { tournamentSchema } from '@/lib/validations/tournament'

const TOURNAMENT_STATUSES = ['draft', 'published', 'registering', 'live', 'completed', 'cancelled'] as const
const statusFilterSchema = z.array(z.enum(TOURNAMENT_STATUSES)).nonempty()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { auctioneerId } = await requireAuctioneer(supabase)
    const body = await parseJsonBody(request, tournamentSchema)

    const tournament = unwrapRequired(
      await supabase
        .from('tournaments')
        .insert({
          auctioneer_id: auctioneerId,
          ...body,
          auction_date:
            body.auction_date instanceof Date ? body.auction_date.toISOString().slice(0, 10) : body.auction_date,
        })
        .select()
        .single()
    )

    return NextResponse.json({ tournament, message: 'Tournament created successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}

// Public listing (RLS decides visibility). ?status=a,b filters by status.
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const status = new URL(request.url).searchParams.get('status')

    let query = supabase
      .from('tournaments')
      .select('*, auctioneers:auctioneer_id (id, name, organization)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.in('status', statusFilterSchema.parse(status.split(',')))
    }

    const tournaments = unwrapList(await query)
    return NextResponse.json({ tournaments })
  } catch (error) {
    return handleRouteError(error)
  }
}
