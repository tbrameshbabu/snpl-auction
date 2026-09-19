/**
 * Repeatable integration check of the auction database contract (RLS, RPC state
 * machine, races) through the real Supabase REST/RPC API of a LOCAL stack.
 *
 * Usage: npm run db:check   (env rules as for the seeds: scripts/lib/seed-env.mjs)
 *
 * Creates its own throw-away users/tournament per run (unique suffix), so it is
 * independent of the seed data and safe to re-run. Exits non-zero on failure.
 */

import { createClient } from '@supabase/supabase-js'
import { loadSeedEnv } from './lib/seed-env.mjs'
import { createSeedAdmin, ensureUser } from './lib/seed-users.mjs'

const { url, anonKey, serviceRoleKey, password } = loadSeedEnv()
const ctx = { admin: createSeedAdmin({ url, serviceRoleKey }), url, anonKey }
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const run = Date.now().toString(36)

let failed = 0
function check(name, ok, detail = '') {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data
}
/** Expects the call to be rejected; passes when an error is returned. */
function rejects(name, result, pattern) {
  const message = result.error?.message ?? ''
  const ok = Boolean(result.error) && (!pattern || pattern.test(message))
  check(name, ok, result.error ? message : `unexpectedly succeeded: ${JSON.stringify(result.data)}`)
}
async function user(label, role) {
  return ensureUser(ctx, `dbcheck-${run}-${label}@snpl.test`, password, role)
}

// ─── Fixtures ────────────────────────────────────────────
const auctioneer = await user('auctioneer', 'auctioneer')
const outsider = await user('outsider', 'auctioneer')
const owners = await Promise.all([user('owner-a', 'team_owner'), user('owner-b', 'team_owner')])
const players = await Promise.all([user('player-1', 'player'), user('player-2', 'player'), user('player-3', 'player')])

const auctioneerRow = must(
  await auctioneer.supabase
    .from('auctioneers')
    .insert({ user_id: auctioneer.user.id, name: 'DB Check', phone: '9999999999' })
    .select()
    .single(),
  'auctioneer profile'
)
must(
  await outsider.supabase
    .from('auctioneers')
    .insert({ user_id: outsider.user.id, name: 'Outsider', phone: '9999999998' })
    .select()
    .single(),
  'outsider profile'
)

// budget 200, one player per team: overspend and roster limits are reachable in a few bids.
const tournament = must(
  await auctioneer.supabase
    .from('tournaments')
    .insert({
      auctioneer_id: auctioneerRow.id,
      title: `DB check ${run}`,
      num_teams: 2,
      num_players_per_team: 1,
      min_players_per_team: 1,
      budget_per_team: 200,
      status: 'published',
    })
    .select()
    .single(),
  'tournament'
)
const createTournament = async (title, status) =>
  must(
    await auctioneer.supabase
      .from('tournaments')
      .insert({
        auctioneer_id: auctioneerRow.id,
        title: `${title} ${run}`,
        num_teams: 2,
        num_players_per_team: 1,
        min_players_per_team: 1,
        budget_per_team: 200,
        status,
      })
      .select()
      .single(),
    title
  )
const otherTournament = await createTournament('DB check other', 'published')
const draftTournament = await createTournament('DB check draft', 'draft')

const teams = []
for (const [i, owner] of owners.entries()) {
  teams.push(
    must(
      await owner.supabase
        .from('teams')
        .insert({
          tournament_id: tournament.id,
          owner_id: owner.user.id,
          name: `Team ${i} ${run}`,
          short_name: `T${i}`,
          color: '#123456',
          budget: tournament.budget_per_team,
        })
        .select()
        .single(),
      `team ${i}`
    )
  )
}
const foreignTeam = must(
  await owners[0].supabase
    .from('teams')
    .insert({
      tournament_id: otherTournament.id,
      owner_id: owners[0].user.id,
      name: `Foreign ${run}`,
      short_name: 'FRN',
      color: '#654321',
      budget: otherTournament.budget_per_team,
    })
    .select()
    .single(),
  'foreign team'
)

for (const [i, p] of players.entries()) {
  const profile = must(
    await p.supabase
      .from('players')
      .insert({
        user_id: p.user.id,
        name: `Player ${i} ${run}`,
        role: 'batsman',
        batting_hand: 'right',
        bowling_hand: 'right',
        // Player 2 is cheap so the winner's leftover budget still covers it: roster limit, not budget, must block.
        base_points: i === 1 ? 10 : 150,
      })
      .select()
      .single(),
    `player ${i}`
  )
  must(
    await p.supabase.from('player_interests').insert({ player_id: profile.id, tournament_id: tournament.id }),
    `interest ${i}`
  )
}

// ─── Direct-write and privilege checks ───────────────────
rejects('anon cannot execute auction RPCs', await anon.rpc('start_auction', { p_tournament_id: tournament.id }))
rejects(
  'non-owner auctioneer cannot start someone else\'s auction',
  await outsider.supabase.rpc('start_auction', { p_tournament_id: tournament.id })
)
rejects(
  'team owner cannot start an auction',
  await owners[0].supabase.rpc('start_auction', { p_tournament_id: tournament.id })
)
rejects(
  'owner cannot edit own team budget/spent directly',
  await owners[0].supabase.from('teams').update({ spent: 100 }).eq('id', teams[0].id).select().single()
)
rejects(
  'user cannot promote own role',
  await players[0].supabase.from('users').update({ role: 'auctioneer' }).eq('id', players[0].user.id).select().single()
)
rejects(
  'auctioneer cannot set tournament live via REST',
  await auctioneer.supabase.from('tournaments').update({ status: 'live' }).eq('id', tournament.id).select().single()
)

// ─── State machine ───────────────────────────────────────
rejects(
  'start_auction refuses a draft tournament',
  await auctioneer.supabase.rpc('start_auction', { p_tournament_id: draftTournament.id }),
  /is draft/i
)
rejects(
  'start_auction refuses a tournament without interested players',
  await auctioneer.supabase.rpc('start_auction', { p_tournament_id: otherTournament.id }),
  /No interested players/i
)
const live = must(await auctioneer.supabase.rpc('start_auction', { p_tournament_id: tournament.id }), 'start_auction')
check('start_auction moves published -> live', live.status === 'live')
const queue = must(
  await auctioneer.supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('order_index'),
  'queue'
)
check('start_auction queued all interested players', queue.length === players.length, `${queue.length} queued`)
const [tp1, tp2, tp3] = queue

rejects(
  'place_bid rejected before a player is active',
  await auctioneer.supabase.rpc('place_bid', {
    p_tournament_id: tournament.id,
    p_tournament_player_id: tp1.id,
    p_team_id: teams[0].id,
    p_amount: tp1.base_price,
  }),
  /not up for auction/i
)
rejects(
  'authenticated cannot insert bids via REST',
  await auctioneer.supabase
    .from('bids')
    .insert({ tournament_id: tournament.id, tournament_player_id: tp1.id, team_id: teams[0].id, amount: 150 })
    .select()
    .single()
)

const activate = (tp) =>
  auctioneer.supabase.rpc('activate_player', { p_tournament_id: tournament.id, p_tournament_player_id: tp.id })
const activeTp2 = must(await activate(tp2), 'activate tp2')
check(
  'activate_player makes the player active and opens a new round',
  activeTp2.status === 'active' && activeTp2.auction_round === tp2.auction_round + 1
)
const active = must(await activate(tp1), 'activate tp1')
const activeRows = must(
  await auctioneer.supabase.from('tournament_players').select('id, status').eq('tournament_id', tournament.id).eq('status', 'active'),
  'active rows'
)
check(
  'switching the active player demotes the previous one (single active player)',
  active.status === 'active' && activeRows.length === 1 && activeRows[0].id === tp1.id
)
check('re-activating the active player is a no-op', must(await activate(tp1), 'reactivate').auction_round === active.auction_round)
rejects(
  'complete_auction refused while a player is active',
  await auctioneer.supabase.rpc('complete_auction', { p_tournament_id: tournament.id })
)

const bid = (team, amount, tp = tp1, who = auctioneer) =>
  who.supabase.rpc('place_bid', {
    p_tournament_id: tournament.id,
    p_tournament_player_id: tp.id,
    p_team_id: team.id,
    p_amount: amount,
  })

rejects('bid below base price rejected', await bid(teams[0], tp1.base_price - 10), /at least/i)
rejects('non-positive bid rejected', await bid(teams[0], 0))
rejects('team from another tournament rejected', await bid(foreignTeam, tp1.base_price), /Team not found/i)
rejects(
  'tournament_player from another tournament rejected',
  await auctioneer.supabase.rpc('place_bid', {
    p_tournament_id: otherTournament.id,
    p_tournament_player_id: tp1.id,
    p_team_id: foreignTeam.id,
    p_amount: tp1.base_price,
  })
)
rejects('team owner cannot place bids', await bid(teams[0], tp1.base_price, tp1, owners[0]))

const opening = must(await bid(teams[0], tp1.base_price), 'opening bid')
check('opening bid at base price accepted, stored with round', opening.amount === 150 && opening.round === active.auction_round)
rejects('bid below ladder increment rejected', await bid(teams[1], 155), /at least 170/)
must(await bid(teams[1], 170), 'second bid')

// Race: both teams try the same next amount concurrently; exactly one may win.
const raceAmount = 190
const race = await Promise.all([bid(teams[0], raceAmount), bid(teams[1], raceAmount), bid(teams[0], raceAmount)])
const raceWins = race.filter((r) => !r.error).length
check('concurrent identical bids: exactly one accepted', raceWins === 1, `${raceWins} accepted`)

const bids = must(
  await anon.from('bids').select('amount, team_id, round').eq('tournament_player_id', tp1.id).order('amount', { ascending: false }),
  'public bid read'
)
check('viewer (anon) can read persisted bids of the active player', bids.length === 3 && bids[0].amount === raceAmount)
const leader = bids[0].team_id
const loser = teams.find((t) => t.id !== leader)

rejects('bid beyond remaining budget rejected', await bid(loser, 210), /budget/i)

const sold = (team, price, tp = tp1) =>
  auctioneer.supabase.rpc('mark_player_sold', {
    p_tournament_id: tournament.id,
    p_tournament_player_id: tp.id,
    p_team_id: team.id,
    p_final_price: price,
  })

rejects('sold with stale price rejected', await sold({ id: leader }, 170), /stale|latest bid/i)
rejects('sold to a non-leading team rejected', await sold(loser, raceAmount), /stale|latest bid/i)

// Race: repeated sold calls must yield a single sale and a single spend.
const soldRace = await Promise.all([sold({ id: leader }, raceAmount), sold({ id: leader }, raceAmount), sold({ id: leader }, raceAmount)])
const saleIds = new Set(soldRace.filter((r) => !r.error).map((r) => r.data.id))
check('concurrent/repeat sold: idempotent single sale', soldRace.every((r) => !r.error) && saleIds.size === 1)
rejects('repeat sold with a different price rejected', await sold({ id: leader }, raceAmount + 50))
rejects('bid after sale rejected', await bid({ id: leader }, raceAmount + 50), /not up for auction/i)

const salesRows = must(await anon.from('player_sales').select('id, team_id, final_price').eq('tournament_player_id', tp1.id), 'sales')
const leaderTeam = must(await anon.from('teams').select('spent').eq('id', leader).single(), 'leader team')
check('exactly one player_sales row, spent charged once', salesRows.length === 1 && leaderTeam.spent === raceAmount)

// Roster capacity: winner already holds num_players_per_team (1) players and can still afford tp2.
must(await activate(tp2), 'activate tp2 again')
rejects('bid by a team with a full roster rejected', await bid({ id: leader }, tp2.base_price, tp2), /roster/i)
const unsold = must(
  await auctioneer.supabase.rpc('mark_player_unsold', { p_tournament_id: tournament.id, p_tournament_player_id: tp2.id }),
  'unsold'
)
check('mark_player_unsold records an unsold result', unsold.status === 'unsold')
must(await auctioneer.supabase.rpc('mark_player_unsold', { p_tournament_id: tournament.id, p_tournament_player_id: tp2.id }), 'unsold repeat')

// Re-auction: old bids must not leak into the new round.
must(await activate(tp3), 'activate tp3')
must(await bid(loser, tp3.base_price, tp3), 'bid tp3')
must(await auctioneer.supabase.rpc('mark_player_unsold', { p_tournament_id: tournament.id, p_tournament_player_id: tp3.id }), 'unsold tp3')
must(await auctioneer.supabase.rpc('re_auction_unsold', { p_tournament_id: tournament.id }), 're_auction_unsold')
const reactivated = must(await activate(tp3), 'reactivate tp3')
check(
  're-auctioned player starts a new round',
  reactivated.status === 'active' && reactivated.auction_round === tp3.auction_round + 2
)
const roundBids = must(
  await anon.from('bids').select('id').eq('tournament_player_id', tp3.id).eq('round', reactivated.auction_round),
  'round bids'
)
check('previous-round bids are not part of the new round', roundBids.length === 0)
rejects('re-auction opening bid below base rejected (old bid ignored)', await bid(loser, tp3.base_price - 10, tp3), /at least/i)
must(await auctioneer.supabase.rpc('mark_player_unsold', { p_tournament_id: tournament.id, p_tournament_player_id: tp3.id }), 'unsold tp3 again')

const completed = must(await auctioneer.supabase.rpc('complete_auction', { p_tournament_id: tournament.id }), 'complete_auction')
check('complete_auction moves live -> completed', completed.status === 'completed')
rejects('activate_player refused once completed', await activate(tp2), /not live/i)
rejects(
  'owner cannot withdraw a team after the auction',
  await owners[0].supabase.from('teams').update({ status: 'withdrawn' }).eq('id', teams[0].id).select().single()
)

// ─── Cleanup (own fixtures only; auctioneer -> tournaments -> teams/bids/sales cascade) ───
for (const u of [auctioneer, outsider, ...owners, ...players]) {
  const { error } = await ctx.admin.auth.admin.deleteUser(u.user.id)
  if (error) console.warn(`cleanup: could not delete ${u.user.email}: ${error.message}`)
}

if (failed > 0) {
  console.error(`\n${failed} database check(s) failed`)
  process.exit(1)
}
console.log('\nAll database checks passed')
