/**
 * Seed account provisioning.
 *
 * Accounts are created through the Auth admin API (service-role key, local stack only)
 * so seeding works regardless of the email-confirmation setting. The database trigger
 * creates the `public.users` row with the self-service role from user metadata; the
 * `auctioneer` role is never accepted from a signup, so it is promoted here the same way an
 * operator would on a real project: `update public.users set role = 'auctioneer' ...` as a
 * privileged role.
 */

import { createClient } from '@supabase/supabase-js'

export function createSeedAdmin({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function findUserIdByEmail(admin, email) {
  const target = email.toLowerCase()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const match = data.users.find((u) => u.email?.toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 200) return null
  }
}

/**
 * Ensure a confirmed auth user with the given role exists and return an authenticated
 * anon-key client for it (`{ supabase, user }`). Idempotent.
 */
export async function ensureUser({ admin, url, anonKey }, email, password, role) {
  let userId = await findUserIdByEmail(admin, email)

  if (userId) {
    console.log(`  ↳ ${email} already exists`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    })
    if (error) throw new Error(`createUser failed for ${email}: ${error.message}`)
    userId = data.user.id
  }

  const { error: roleError } = await admin
    .from('users')
    .upsert({ id: userId, email, role }, { onConflict: 'id' })
  if (roleError) throw new Error(`role update failed for ${email}: ${roleError.message}`)

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign in failed for ${email}: ${error.message}`)
  return { supabase, user: data.user }
}
