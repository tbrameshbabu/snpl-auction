import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwnedTournament } from '@/lib/api/auth'
import { unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'

// Status changes reachable directly; live/completed go through the auction RPCs.
const statusUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'registering', 'cancelled']),
}).strict()

const detailsUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  auction_date: z.string().min(1).optional(),
  auction_time: z.string().min(1).optional(),
  num_teams: z.number().int().min(2).max(20).optional(),
  budget_per_team: z.number().int().min(100).max(10000).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Provide at least one tournament detail')

const updateSchema = z.union([statusUpdateSchema, detailsUpdateSchema])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    const { tournament } = await requireOwnedTournament(supabase, tournamentId)
    return NextResponse.json({ tournament })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    const { tournament: existing } = await requireOwnedTournament(supabase, tournamentId)
    const body = await parseJsonBody(request, updateSchema)

    const isStatusChange = 'status' in body
    if (!isStatusChange && existing.status !== 'draft') {
      throw new ApiError(409, 'Only draft tournaments can be edited')
    }

    const tournament = unwrapRequired(
      await supabase.from('tournaments').update(body).eq('id', tournamentId).select().single()
    )

    return NextResponse.json({
      tournament,
      message: isStatusChange ? 'Tournament status updated successfully' : 'Tournament updated successfully',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
