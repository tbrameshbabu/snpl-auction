/**
 * Seed Script for SNPL Auction App
 * 
 * Creates sample data:
 * - 1 Auctioneer user with a published tournament
 * - 4 Team Owner users with teams registered to the tournament
 * - 5 Player users with player profiles
 * 
 * Usage: node scripts/seed.mjs
 * 
 * Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * (reads from .env.local automatically)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Load env vars from .env.local ──────────────────────
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch (e) {
    console.error('Could not read .env.local:', e.message)
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

// ─── Helper: create a Supabase client and sign up a user ───
async function signUpUser(email, password, role) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    // If user already exists, try to sign in
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      console.log(`  ↳ User ${email} already exists, signing in...`)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw new Error(`Sign in failed for ${email}: ${signInError.message}`)
      return { supabase, user: signInData.user }
    }
    throw new Error(`Sign up failed for ${email}: ${authError.message}`)
  }

  if (!authData.user) throw new Error(`No user returned for ${email}`)

  // Insert into users table
  const { error: userError } = await supabase.from('users').upsert({
    id: authData.user.id,
    email,
    role,
  }, { onConflict: 'id' })

  if (userError) {
    console.warn(`  ⚠ users table insert for ${email}:`, userError.message)
  }

  return { supabase, user: authData.user }
}

// ─── SEED DATA ──────────────────────────────────────────
const PASSWORD = 'Test@123'

const AUCTIONEER = {
  email: 'auctioneer@snpl.com',
  name: 'Vikram Singh',
  organization: 'SNPL Cricket League',
  phone: '9876543210',
}

const TOURNAMENT = {
  title: 'SNPL Premier League 2026',
  description: 'The biggest cricket auction of the season! 6 teams battle it out to build their dream squad. Show your interest now to be part of the action.',
  auction_date: '2026-03-15',
  auction_time: '18:00:00',
  duration_minutes: 120,
  num_teams: 6,
  num_players_per_team: 11,
  min_players_per_team: 7,
  budget_per_team: 1000,
  player_list_type: 'system_generated',
}

const TEAM_OWNERS = [
  { email: 'owner1@snpl.com', teamName: 'Royal Strikers', shortName: 'RST', color: '#E63946' },
  { email: 'owner2@snpl.com', teamName: 'Thunder Kings', shortName: 'TKG', color: '#457B9D' },
  { email: 'owner3@snpl.com', teamName: 'Golden Eagles', shortName: 'GEG', color: '#F4A261' },
  { email: 'owner4@snpl.com', teamName: 'Storm Riders', shortName: 'SRD', color: '#2A9D8F' },
]

const PLAYERS = [
  { email: 'player1@snpl.com', name: 'Rahul Sharma',   role: 'batsman',        batting_hand: 'right', bowling_hand: 'right', base_points: 150, matches_played: 45, runs_scored: 1200, batting_average: 35.5, wickets_taken: 2,  bowling_average: 55.0, rating: 7.5 },
  { email: 'player2@snpl.com', name: 'Anil Kumar',     role: 'bowler',         batting_hand: 'right', bowling_hand: 'left',  base_points: 120, matches_played: 38, runs_scored: 210,  batting_average: 12.0, wickets_taken: 65, bowling_average: 22.5, rating: 8.0 },
  { email: 'player3@snpl.com', name: 'Suresh Patel',   role: 'all_rounder',    batting_hand: 'left',  bowling_hand: 'left',  base_points: 200, matches_played: 52, runs_scored: 980,  batting_average: 28.0, wickets_taken: 40, bowling_average: 28.0, rating: 8.5 },
  { email: 'player4@snpl.com', name: 'Deepak Yadav',   role: 'wicket_keeper',  batting_hand: 'right', bowling_hand: 'right', base_points: 130, matches_played: 40, runs_scored: 850,  batting_average: 30.0, wickets_taken: 0,  bowling_average: 0,    rating: 7.0 },
  { email: 'player5@snpl.com', name: 'Karthik Nair',   role: 'batsman',        batting_hand: 'left',  bowling_hand: 'right', base_points: 180, matches_played: 60, runs_scored: 2100, batting_average: 42.0, wickets_taken: 5,  bowling_average: 45.0, rating: 9.0 },
]

// ─── MAIN SEED FUNCTION ─────────────────────────────────
async function seed() {
  console.log('🌱 Starting SNPL Auction seed...\n')

  // ── 1. Create Auctioneer ─────────────────────
  console.log('👤 Creating Auctioneer...')
  const { supabase: auctioneerClient, user: auctioneerUser } = await signUpUser(AUCTIONEER.email, PASSWORD, 'auctioneer')
  
  // Register auctioneer profile
  const { data: existingAuctioneer } = await auctioneerClient.from('auctioneers').select('id').eq('user_id', auctioneerUser.id).single()
  
  let auctioneerId
  if (existingAuctioneer) {
    auctioneerId = existingAuctioneer.id
    console.log(`  ✅ Auctioneer already exists: ${AUCTIONEER.name} (${auctioneerId})`)
  } else {
    const { data: auctioneer, error } = await auctioneerClient.from('auctioneers').insert({
      user_id: auctioneerUser.id,
      name: AUCTIONEER.name,
      organization: AUCTIONEER.organization,
      phone: AUCTIONEER.phone,
    }).select().single()
    if (error) throw new Error(`Auctioneer profile error: ${error.message}`)
    auctioneerId = auctioneer.id
    console.log(`  ✅ ${AUCTIONEER.name} (${auctioneerId})`)
  }

  // ── 2. Create Tournament ─────────────────────
  console.log('\n🏆 Creating Tournament...')
  const { data: existingTournaments } = await auctioneerClient.from('tournaments').select('id, title').eq('auctioneer_id', auctioneerId)

  let tournamentId
  const existingTournament = existingTournaments?.find(t => t.title === TOURNAMENT.title)
  
  if (existingTournament) {
    tournamentId = existingTournament.id
    console.log(`  ✅ Tournament already exists: ${TOURNAMENT.title} (${tournamentId})`)
  } else {
    const { data: tournament, error } = await auctioneerClient.from('tournaments').insert({
      auctioneer_id: auctioneerId,
      ...TOURNAMENT,
    }).select().single()
    if (error) throw new Error(`Tournament creation error: ${error.message}`)
    tournamentId = tournament.id
    console.log(`  ✅ ${TOURNAMENT.title} (${tournamentId})`)
  }

  // Publish the tournament
  const { error: publishError } = await auctioneerClient.from('tournaments').update({ 
    status: 'published',
    published_at: new Date().toISOString(),
  }).eq('id', tournamentId)
  if (publishError) console.warn('  ⚠ Publish warning:', publishError.message)
  else console.log('  ✅ Tournament published!')

  // ── 3. Create Team Owners & Teams ────────────
  console.log('\n🏏 Creating Team Owners & Teams...')
  for (const ownerData of TEAM_OWNERS) {
    const { supabase: ownerClient, user: ownerUser } = await signUpUser(ownerData.email, PASSWORD, 'team_owner')
    
    // Check if team already exists
    const { data: existingTeam } = await ownerClient.from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('owner_id', ownerUser.id)
      .single()

    if (existingTeam) {
      console.log(`  ✅ Team already exists: ${ownerData.teamName}`)
    } else {
      const { data: team, error } = await ownerClient.from('teams').insert({
        tournament_id: tournamentId,
        owner_id: ownerUser.id,
        name: ownerData.teamName,
        short_name: ownerData.shortName,
        color: ownerData.color,
        budget: TOURNAMENT.budget_per_team,
        status: 'interested',
      }).select().single()
      if (error) {
        console.warn(`  ⚠ Team ${ownerData.teamName}: ${error.message}`)
      } else {
        console.log(`  ✅ ${ownerData.teamName} (${ownerData.shortName}) — ${ownerData.email}`)
      }
    }
  }

  // ── 4. Create Players ────────────────────────
  console.log('\n⚡ Creating Players...')
  const playerIds = []
  for (const playerData of PLAYERS) {
    const { supabase: playerClient, user: playerUser } = await signUpUser(playerData.email, PASSWORD, 'player')
    
    // Check if player profile exists
    const { data: existingPlayer } = await playerClient.from('players').select('id').eq('user_id', playerUser.id).single()
    
    let playerId
    if (existingPlayer) {
      playerId = existingPlayer.id
      console.log(`  ✅ Player already exists: ${playerData.name}`)
    } else {
      const { email, ...profileData } = playerData
      const { data: player, error } = await playerClient.from('players').insert({
        user_id: playerUser.id,
        ...profileData,
      }).select().single()
      if (error) {
        console.warn(`  ⚠ Player ${playerData.name}: ${error.message}`)
        continue
      }
      playerId = player.id
      console.log(`  ✅ ${playerData.name} (${playerData.role}) — ${playerData.email}`)
    }
    playerIds.push({ playerId, playerClient, playerData })
  }

  // ── 5. Summary ───────────────────────────────
  console.log('\n' + '═'.repeat(55))
  console.log('  🎉  SEED COMPLETE!')
  console.log('═'.repeat(55))
  console.log()
  console.log('  📧 All accounts use password: Test@123')
  console.log()
  console.log('  Auctioneer:')
  console.log(`    ${AUCTIONEER.email}`)
  console.log()
  console.log('  Team Owners:')
  TEAM_OWNERS.forEach(o => console.log(`    ${o.email} → ${o.teamName}`))
  console.log()
  console.log('  Players:')
  PLAYERS.forEach(p => console.log(`    ${p.email} → ${p.name} (${p.role})`))
  console.log()
  console.log('  Tournament: SNPL Premier League 2026')
  console.log('    Date: March 15, 2026 at 6:00 PM')
  console.log('    Status: Published')
  console.log()
  console.log('  🏏 Next Steps:')
  console.log('    1. Log in as a player (e.g. player1@snpl.com)')
  console.log('    2. Show interest in the tournament')
  console.log('    3. Log in as auctioneer (auctioneer@snpl.com)')
  console.log('    4. Start the auction!')
  console.log()
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
