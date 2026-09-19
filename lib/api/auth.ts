import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ServerSupabaseClient } from '@/lib/supabase/server'
import { unwrap, unwrapRequired } from './db'
import { ApiError } from './errors'

export type UserRole = Database['public']['Tables']['users']['Row']['role']

export async function requireUser(supabase: ServerSupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new ApiError(401, 'Unauthorized')
  }
  return user
}

export async function requireRole(supabase: ServerSupabaseClient, role: UserRole): Promise<User> {
  const user = await requireUser(supabase)
  const profile = unwrap(await supabase.from('users').select('role').eq('id', user.id).maybeSingle())
  if (profile?.role !== role) {
    throw new ApiError(403, `Only ${role.replace('_', ' ')}s can perform this action`)
  }
  return user
}

export async function requireAuctioneer(supabase: ServerSupabaseClient) {
  const user = await requireUser(supabase)
  const auctioneer = unwrap(
    await supabase.from('auctioneers').select('id').eq('user_id', user.id).maybeSingle()
  )
  if (!auctioneer) {
    throw new ApiError(403, 'Auctioneer profile not found')
  }
  return { user, auctioneerId: auctioneer.id }
}

export async function requireOwnedTournament(supabase: ServerSupabaseClient, tournamentId: string) {
  const { user, auctioneerId } = await requireAuctioneer(supabase)
  const tournament = unwrapRequired(
    await supabase.from('tournaments').select('*').eq('id', tournamentId).maybeSingle(),
    'Tournament not found'
  )
  if (tournament.auctioneer_id !== auctioneerId) {
    throw new ApiError(403, 'You do not own this tournament')
  }
  return { user, auctioneerId, tournament }
}
