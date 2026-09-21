import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { loadSeedEnv } from './lib/seed-env.mjs'
import { createSeedAdmin, ensureUser } from './lib/seed-users.mjs'

const { url, anonKey, serviceRoleKey, password } = loadSeedEnv()
const apiUrl = process.env.CONTACT_API_URL || 'http://localhost:3000'
const withApi = process.argv.includes('--api')
for (const target of [url, apiUrl]) {
  assert.ok(
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname),
    'Local testing only',
  )
}
const admin = createSeedAdmin({ url, serviceRoleKey })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const actors = []
const cookies = new Map()
const run = Date.now().toString(36)
let checked = 0

function must(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

function check(label, condition) {
  assert.ok(condition, label)
  checked++
  console.log(`PASS ${label}`)
}

async function actor(name, role) {
  const result = await ensureUser(
    { admin, url, anonKey },
    `contacts-${run}-${name}@snpl.test`,
    password,
    role,
  )
  actors.push(result)
  return result
}

async function cookieHeader(account) {
  if (!cookies.has(account.user.id)) {
    const { session } = must(await account.supabase.auth.getSession(), 'read session')
    const jar = new Map()
    const client = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (entries) => entries.forEach(({ name, value }) => jar.set(name, value)),
      },
    })
    must(await client.auth.setSession(session), 'prepare request cookies')
    cookies.set(account.user.id, [...jar].map(([name, value]) => `${name}=${value}`).join('; '))
  }
  return cookies.get(account.user.id)
}

async function request(account, path, method = 'GET', body) {
  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(account ? { Cookie: await cookieHeader(account) } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'manual',
  })
  return { status: response.status, body: await response.json() }
}

async function contact(account, subject, kind = 'player') {
  return must(
    await account.supabase
      .from('profile_contacts')
      .select('phone')
      .eq('user_id', subject.user.id)
      .eq('profile_kind', kind)
      .maybeSingle(),
    'read contact',
  )
}

try {
  const operator = await actor('operator', 'auctioneer')
  const unrelated = await actor('unrelated', 'auctioneer')
  const player = await actor('player', 'player')
  const otherPlayer = await actor('other-player', 'player')
  const owner = await actor('owner', 'team_owner')
  const phone = '9000000001'
  const operatorPhone = '9000000002'
  const playerBody = {
    name: 'Contact privacy player',
    phone,
    role: 'batsman',
    batting_hand: 'right',
    bowling_hand: 'right',
  }
  const operatorBody = { name: 'Contact privacy operator', phone: operatorPhone }

  let playerProfile
  let operatorProfile
  if (withApi) {
    const playerResponse = await request(player, '/api/players/register', 'POST', playerBody)
    check(
      'player registration API preserves the private phone response',
      playerResponse.status === 200 && playerResponse.body.player?.phone === phone,
    )
    playerProfile = playerResponse.body.player
    const operatorResponse = await request(
      operator,
      '/api/auctioneers/register',
      'POST',
      operatorBody,
    )
    check(
      'auctioneer registration API preserves the private phone response',
      operatorResponse.status === 200 && operatorResponse.body.auctioneer?.phone === operatorPhone,
    )
    operatorProfile = operatorResponse.body.auctioneer
    for (const [account, path, key, expected] of [
      [player, '/api/players/register', 'player', phone],
      [player, '/api/auth/profile', 'profile', phone],
      [operator, '/api/auth/profile', 'profile', operatorPhone],
    ]) {
      const response = await request(account, path)
      check(
        `owner reads phone through ${path} (${account === player ? 'player' : 'auctioneer'})`,
        response.status === 200 && response.body[key]?.phone === expected,
      )
    }
    check(
      'anonymous profile API is rejected',
      (await request(null, '/api/auth/profile')).status === 401,
    )
  } else {
    playerProfile = must(
      await player.supabase
        .from('players')
        .insert({ user_id: player.user.id, ...playerBody })
        .select()
        .single(),
      'create player',
    )
    operatorProfile = must(
      await operator.supabase
        .from('auctioneers')
        .insert({ user_id: operator.user.id, ...operatorBody })
        .select()
        .single(),
      'create operator',
    )
  }
  must(
    await unrelated.supabase.from('auctioneers').insert({
      user_id: unrelated.user.id,
      name: 'Unrelated operator',
      phone: '9000000003',
    }),
    'create unrelated operator',
  )

  check('player owner can read their phone', (await contact(player, player))?.phone === phone)
  check(
    'auctioneer owner can read their phone',
    (await contact(operator, operator, 'auctioneer'))?.phone === operatorPhone,
  )
  check(
    'anonymous contact-table reads are denied',
    (await anon.from('profile_contacts').select('*')).error?.code === '42501',
  )
  check(
    'anonymous nested contact reads are denied',
    (await anon.from('users').select('id, profile_contacts(phone)')).error?.code === '42501',
  )
  for (const [table, account, name] of [
    ['players', player, playerBody.name],
    ['auctioneers', operator, operatorBody.name],
  ]) {
    const profile = must(
      await anon.from(table).select('*').eq('user_id', account.user.id).single(),
      'public profile',
    )
    check(
      `public ${table} retain names but no phone`,
      profile.name === name && profile.phone === null,
    )
  }
  for (const [label, account] of [
    ['team owner', owner],
    ['other player', otherPlayer],
    ['unrelated auctioneer', unrelated],
  ]) {
    check(`${label} cannot read player phone`, (await contact(account, player)) === null)
    check(
      `${label} cannot read auctioneer phone`,
      (await contact(account, operator, 'auctioneer')) === null,
    )
  }
  check(
    'unrelated authenticated nested contact reads are empty',
    must(await owner.supabase.from('profile_contacts').select('phone, users(id)'), 'nested read')
      .length === 0,
  )

  const tournament = must(
    await operator.supabase
      .from('tournaments')
      .insert({
        auctioneer_id: operatorProfile.id,
        title: `Contact privacy ${run}`,
        num_teams: 2,
        num_players_per_team: 2,
        min_players_per_team: 1,
        budget_per_team: 1000,
        status: 'published',
      })
      .select()
      .single(),
    'create tournament',
  )
  must(
    await operator.supabase.from('tournament_players').insert({
      tournament_id: tournament.id,
      player_id: playerProfile.id,
      base_price: 100,
      order_index: 0,
      status: 'pending',
    }),
    'create queue entry',
  )
  check(
    'adding a player to a queue cannot grant contact access',
    (await contact(operator, player)) === null,
  )
  check(
    'auctioneer cannot fabricate a player registration',
    Boolean(
      (
        await operator.supabase.from('player_interests').insert({
          tournament_id: tournament.id,
          player_id: playerProfile.id,
          status: 'interested',
        })
      ).error,
    ),
  )
  must(
    await player.supabase.from('player_interests').insert({
      tournament_id: tournament.id,
      player_id: playerProfile.id,
      status: 'interested',
    }),
    'register interest',
  )
  check(
    'registered player grants contact access to the owning auctioneer',
    (await contact(operator, player))?.phone === phone,
  )
  check(
    'registration does not grant access to another auctioneer',
    (await contact(unrelated, player)) === null,
  )
  check(
    'registration does not grant access to a team owner',
    (await contact(owner, player)) === null,
  )
  check(
    'player cannot read the tournament auctioneer phone',
    (await contact(player, operator, 'auctioneer')) === null,
  )

  const playersPath = `/api/auctioneers/tournaments/${tournament.id}/players`
  if (withApi) {
    const response = await request(operator, playersPath)
    check(
      'owning auctioneer player-list API includes permitted phone',
      response.status === 200 &&
        response.body.players?.find((entry) => entry.id === playerProfile.id)?.phone === phone,
    )
    check(
      'other auctioneer player-list API is forbidden',
      (await request(unrelated, playersPath)).status === 403,
    )
    check(
      'anonymous player-list API is unauthorized',
      (await request(null, playersPath)).status === 401,
    )
    const state = await request(null, `/api/auction/${tournament.id}/state`)
    check(
      'public auction state excludes phone values',
      state.status === 200 &&
        !JSON.stringify(state.body).includes(phone) &&
        !JSON.stringify(state.body).includes(operatorPhone),
    )
  }

  must(
    await player.supabase
      .from('player_interests')
      .update({ status: 'withdrawn' })
      .eq('tournament_id', tournament.id)
      .eq('player_id', playerProfile.id),
    'withdraw',
  )
  check(
    'withdrawal revokes contact access despite the queue entry',
    (await contact(operator, player)) === null,
  )
  if (withApi) {
    const response = await request(operator, playersPath)
    check(
      'withdrawn player phone is absent from the auctioneer API',
      response.status === 200 &&
        response.body.players?.find((entry) => entry.id === playerProfile.id)?.phone === null,
    )
  }
  must(
    await player.supabase
      .from('player_interests')
      .update({ status: 'confirmed' })
      .eq('tournament_id', tournament.id)
      .eq('player_id', playerProfile.id),
    'confirm registration',
  )
  check(
    'confirmed registration permits operator access',
    (await contact(operator, player))?.phone === phone,
  )
  must(
    await operator.supabase
      .from('tournaments')
      .update({ status: 'cancelled' })
      .eq('id', tournament.id),
    'cancel tournament',
  )
  check(
    'cancelled tournaments do not grant contact access',
    (await contact(operator, player)) === null,
  )

  check(
    'authenticated contact-table mutation is denied',
    (
      await player.supabase
        .from('profile_contacts')
        .update({ phone: '9000000099' })
        .eq('user_id', player.user.id)
    ).error?.code === '42501',
  )
  check(
    'unrelated user cannot insert a profile for the owner',
    Boolean(
      (
        await otherPlayer.supabase.from('players').insert({
          user_id: player.user.id,
          ...playerBody,
          phone: '9000000099',
        })
      ).error,
    ),
  )
  check(
    'rejected insert rolls back trigger contact writes',
    (await contact(player, player))?.phone === phone,
  )
  check(
    'duplicate own profile insert is rejected',
    (
      await player.supabase.from('players').insert({
        user_id: player.user.id,
        ...playerBody,
        phone: '9000000099',
      })
    ).error?.code === '23505',
  )
  check(
    'duplicate insert rolls back contact writes',
    (await contact(player, player))?.phone === phone,
  )
  const attemptedUpdate = must(
    await otherPlayer.supabase
      .from('players')
      .update({ phone: '9000000099' })
      .eq('id', playerProfile.id)
      .select(),
    'unrelated profile update',
  )
  check('unrelated profile update changes no rows', attemptedUpdate.length === 0)
  check(
    'unrelated update leaves private phone intact',
    (await contact(player, player))?.phone === phone,
  )

  const replacement = '9000000004'
  must(
    await player.supabase.from('players').update({ phone: replacement }).eq('id', playerProfile.id),
    'update phone',
  )
  check(
    'owner can update phone through the existing profile write',
    (await contact(player, player))?.phone === replacement,
  )
  must(
    await player.supabase
      .from('players')
      .update({ name: 'Renamed private player' })
      .eq('id', playerProfile.id),
    'update name',
  )
  check(
    'non-phone edits preserve private contact',
    (await contact(player, player))?.phone === replacement,
  )
  check(
    'public profile remains scrubbed after phone update',
    must(
      await anon.from('players').select('phone').eq('id', playerProfile.id).single(),
      'public updated phone',
    ).phone === null,
  )
  must(
    await player.supabase.from('players').update({ phone: null }).eq('id', playerProfile.id),
    'clear phone',
  )
  check('owner can clear private phone explicitly', (await contact(player, player))?.phone === null)
  if (withApi) {
    const response = await request(player, '/api/auth/profile')
    check(
      'owner profile API returns null for cleared phone',
      response.status === 200 && response.body.profile?.phone === null,
    )
  }
  must(await admin.from('players').delete().eq('id', playerProfile.id), 'delete local profile')
  check('profile deletion removes its contact row', (await contact(player, player)) === null)
} finally {
  for (const account of actors) {
    const { error } = await admin.auth.admin.deleteUser(account.user.id)
    if (error) throw new Error(`Fixture cleanup failed: ${error.message}`)
  }
}

console.log(
  `\nAll ${checked} contact privacy checks passed${withApi ? ' (including authenticated HTTP routes)' : ''}`,
)
