/**
 * Shared environment loader for development seed scripts.
 *
 * Resolution order: process env, then `.env.seed.local`, then `.env.local`.
 * Seeding is refused unless the target is a local Supabase stack
 * (localhost / 127.0.0.1 / *.local / *.test) or SEED_ALLOW_REMOTE=1 is set explicitly.
 * Seed scripts must never point at production by accident.
 *
 * SUPABASE_SERVICE_ROLE_KEY is required: accounts are provisioned through the Auth admin
 * API and the auctioneer role is assigned with privileged access (see seed-users.mjs).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile(name) {
  let content
  try {
    content = readFileSync(resolve(process.cwd(), name), 'utf-8')
  } catch {
    return false
  }
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    if (!process.env[key])
      process.env[key] = t
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
  }
  return true
}

function isLocalUrl(url) {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === 'host.docker.internal' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test')
    )
  } catch {
    return false
  }
}

export function loadSeedEnv() {
  loadEnvFile('.env.seed.local')
  loadEnvFile('.env.local')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey) {
    console.error(
      '❌ Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (env, .env.seed.local or .env.local)',
    )
    process.exit(1)
  }
  if (!serviceRoleKey) {
    console.error(
      '❌ Missing SUPABASE_SERVICE_ROLE_KEY (printed by `npx supabase@2 status` for the local stack)',
    )
    process.exit(1)
  }

  if (!isLocalUrl(url) && process.env.SEED_ALLOW_REMOTE !== '1') {
    console.error(`❌ Refusing to seed non-local Supabase at ${url}.`)
    console.error(
      '   Seeds are for disposable local/test stacks. Set SEED_ALLOW_REMOTE=1 to override.',
    )
    process.exit(1)
  }

  const password = process.env.SEED_PASSWORD || 'Test@123'
  return { url, anonKey, serviceRoleKey, password }
}
