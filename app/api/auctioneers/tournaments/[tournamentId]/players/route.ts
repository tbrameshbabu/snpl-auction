import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwnedTournament } from '@/lib/api/auth'
import { unwrap, unwrapList } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, parseUuid } from '@/lib/api/request'

const UNORDERED = 999

const playerOrderSchema = z.object({
  playerOrder: z
    .array(
      z.object({
        player_id: z.string().uuid(),
        order_index: z.number().int().min(0),
      })
    )
    .max(500),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    await requireOwnedTournament(supabase, tournamentId)

    const [interests, tournamentPlayers] = await Promise.all([
      supabase
        .from('player_interests')
        .select(
          `id, status,
           players:player_id (id, name, role, batting_hand, bowling_hand, base_points, matches_played, runs_scored, wickets_taken, profile_image_url)`
        )
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })
        .then(unwrapList),
      supabase
        .from('tournament_players')
        .select('player_id, order_index')
        .eq('tournament_id', tournamentId)
        .then(unwrapList),
    ])

    const orderMap = new Map(tournamentPlayers.map((tp) => [tp.player_id, tp.order_index ?? UNORDERED]))

    const players = interests
      .flatMap((interest) =>
        interest.players
          ? [
              {
                ...interest.players,
                interest_status: interest.status,
                order_index: orderMap.get(interest.players.id) ?? UNORDERED,
              },
            ]
          : []
      )
      .sort((a, b) => a.order_index - b.order_index)

    return NextResponse.json({ players })
  } catch (error) {
    return handleRouteError(error)
  }
}

// Saves the auction queue order. Rows are created for interested players that
// are not queued yet; start_auction keeps them and appends the rest.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseUuid((await params).tournamentId, 'tournament id')
    const supabase = await createClient()
    const { tournament } = await requireOwnedTournament(supabase, tournamentId)
    if (tournament.status === 'live' || tournament.status === 'completed') {
      throw new ApiError(409, 'Cannot reorder during or after auction')
    }
    const { playerOrder } = await parseJsonBody(request, playerOrderSchema)
    if (playerOrder.length === 0) {
      return NextResponse.json({ success: true })
    }

    const interested = unwrapList(
      await supabase
        .from('player_interests')
        .select('player_id, players:player_id (base_points)')
        .eq('tournament_id', tournamentId)
        .in('status', ['interested', 'confirmed'])
        .in(
          'player_id',
          playerOrder.map((item) => item.player_id)
        )
    )
    const basePoints = new Map(interested.map((row) => [row.player_id, row.players?.base_points ?? 100]))

    const rows = playerOrder.flatMap((item) => {
      const base = basePoints.get(item.player_id)
      return base === undefined
        ? []
        : [
            {
              tournament_id: tournamentId,
              player_id: item.player_id,
              base_price: Math.max(base, 1),
              order_index: item.order_index,
              status: 'pending',
            },
          ]
    })

    if (rows.length !== playerOrder.length) {
      throw new ApiError(400, 'playerOrder contains players not registered for this tournament')
    }

    unwrap(
      await supabase
        .from('tournament_players')
        .upsert(rows, { onConflict: 'tournament_id,player_id', ignoreDuplicates: false })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
