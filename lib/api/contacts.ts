import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { unwrap } from './db'

export async function getProfilePhone(
  supabase: SupabaseClient<Database>,
  userId: string,
  profileKind: 'player' | 'auctioneer',
): Promise<string | null> {
  const contact = unwrap(
    await supabase
      .from('profile_contacts')
      .select('phone')
      .eq('user_id', userId)
      .eq('profile_kind', profileKind)
      .maybeSingle(),
  )
  return contact?.phone ?? null
}
