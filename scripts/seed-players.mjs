/**
 * Add More Players for Mock Auction
 * 
 * Creates 25 additional players (total 30 with existing 5)
 * for running a mock auction with 6 teams × 11 players.
 * 
 * Usage: node scripts/seed-players.mjs
 * All accounts use password: Test@123
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Load env ───────────────
function loadEnv() {
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of envContent.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      if (!process.env[key]) process.env[key] = t.slice(eq + 1).trim()
    }
  } catch (e) { console.error('.env.local not found:', e.message) }
}
loadEnv()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) { console.error('❌ Missing Supabase env vars'); process.exit(1) }

const PASSWORD = 'Test@123'

async function signUpUser(email, password, role) {
  const supabase = createClient(URL, KEY)
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.includes('already') ) {
      const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if (e2) throw new Error(`Sign in failed ${email}: ${e2.message}`)
      return { supabase, user: d2.user }
    }
    throw new Error(`Sign up failed ${email}: ${error.message}`)
  }

  await supabase.from('users').upsert({ id: data.user.id, email, role }, { onConflict: 'id' })
  return { supabase, user: data.user }
}

// ─── 25 Additional Players ──────────────────────
const PLAYERS = [
  { email: 'player6@snpl.com',  name: 'Virat Reddy',      role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 200, matches_played: 70, runs_scored: 2800, batting_average: 45.2, wickets_taken: 3,  bowling_average: 65.0, rating: 9.5 },
  { email: 'player7@snpl.com',  name: 'Mohammed Siraj',    role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 150, matches_played: 55, runs_scored: 120,  batting_average: 8.5,  wickets_taken: 85, bowling_average: 19.8, rating: 8.8 },
  { email: 'player8@snpl.com',  name: 'Pradeep Ranjan',    role: 'all_rounder',   batting_hand: 'right', bowling_hand: 'left',  base_points: 170, matches_played: 48, runs_scored: 920,  batting_average: 28.5, wickets_taken: 42, bowling_average: 26.0, rating: 8.2 },
  { email: 'player9@snpl.com',  name: 'Arjun Deshmukh',    role: 'batsman',       batting_hand: 'left',  bowling_hand: 'right', base_points: 160, matches_played: 42, runs_scored: 1500, batting_average: 38.0, wickets_taken: 1,  bowling_average: 80.0, rating: 7.8 },
  { email: 'player10@snpl.com', name: 'Sanjay Gupta',      role: 'wicket_keeper', batting_hand: 'right', bowling_hand: 'right', base_points: 140, matches_played: 50, runs_scored: 1100, batting_average: 32.0, wickets_taken: 0,  bowling_average: 0,    rating: 7.5 },
  { email: 'player11@snpl.com', name: 'Ravindra Jadeja',   role: 'all_rounder',   batting_hand: 'left',  bowling_hand: 'left',  base_points: 190, matches_played: 65, runs_scored: 1800, batting_average: 33.0, wickets_taken: 55, bowling_average: 24.5, rating: 9.2 },
  { email: 'player12@snpl.com', name: 'Amit Mishra',       role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 130, matches_played: 40, runs_scored: 180,  batting_average: 10.0, wickets_taken: 70, bowling_average: 21.5, rating: 7.8 },
  { email: 'player13@snpl.com', name: 'Rohit Menon',       role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 180, matches_played: 58, runs_scored: 2200, batting_average: 40.5, wickets_taken: 5,  bowling_average: 50.0, rating: 8.5 },
  { email: 'player14@snpl.com', name: 'Faisal Khan',       role: 'bowler',        batting_hand: 'left',  bowling_hand: 'left',  base_points: 140, matches_played: 35, runs_scored: 90,   batting_average: 6.5,  wickets_taken: 58, bowling_average: 23.0, rating: 7.9 },
  { email: 'player15@snpl.com', name: 'Nikhil Chopra',     role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 150, matches_played: 45, runs_scored: 1650, batting_average: 36.5, wickets_taken: 8,  bowling_average: 42.0, rating: 8.0 },
  { email: 'player16@snpl.com', name: 'Sachin Tendulkar',  role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 250, matches_played: 80, runs_scored: 3500, batting_average: 50.0, wickets_taken: 10, bowling_average: 40.0, rating: 9.8 },
  { email: 'player17@snpl.com', name: 'Ishant Sharma',     role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 120, matches_played: 50, runs_scored: 150,  batting_average: 7.5,  wickets_taken: 90, bowling_average: 20.5, rating: 8.0 },
  { email: 'player18@snpl.com', name: 'Dinesh Karthik',    role: 'wicket_keeper', batting_hand: 'right', bowling_hand: 'right', base_points: 160, matches_played: 55, runs_scored: 1400, batting_average: 34.0, wickets_taken: 0,  bowling_average: 0,    rating: 8.0 },
  { email: 'player19@snpl.com', name: 'Ajinkya Rahane',    role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 170, matches_played: 60, runs_scored: 1900, batting_average: 38.5, wickets_taken: 2,  bowling_average: 55.0, rating: 8.3 },
  { email: 'player20@snpl.com', name: 'Bhuvneshwar Kumar', role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 150, matches_played: 48, runs_scored: 280,  batting_average: 15.0, wickets_taken: 75, bowling_average: 22.0, rating: 8.5 },
  { email: 'player21@snpl.com', name: 'Hardik Pandya',     role: 'all_rounder',   batting_hand: 'right', bowling_hand: 'right', base_points: 200, matches_played: 55, runs_scored: 1500, batting_average: 32.0, wickets_taken: 48, bowling_average: 27.0, rating: 8.8 },
  { email: 'player22@snpl.com', name: 'Shreyas Iyer',      role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 170, matches_played: 50, runs_scored: 1800, batting_average: 39.0, wickets_taken: 3,  bowling_average: 52.0, rating: 8.2 },
  { email: 'player23@snpl.com', name: 'Yuzvendra Chahal',  role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 140, matches_played: 45, runs_scored: 50,   batting_average: 4.0,  wickets_taken: 82, bowling_average: 21.0, rating: 8.3 },
  { email: 'player24@snpl.com', name: 'Rishabh Pant',      role: 'wicket_keeper', batting_hand: 'left',  bowling_hand: 'right', base_points: 190, matches_played: 45, runs_scored: 1600, batting_average: 40.0, wickets_taken: 0,  bowling_average: 0,    rating: 8.8 },
  { email: 'player25@snpl.com', name: 'Shubman Gill',      role: 'batsman',       batting_hand: 'right', bowling_hand: 'right', base_points: 180, matches_played: 40, runs_scored: 1700, batting_average: 42.5, wickets_taken: 2,  bowling_average: 60.0, rating: 8.7 },
  { email: 'player26@snpl.com', name: 'Washington Sundar', role: 'all_rounder',   batting_hand: 'left',  bowling_hand: 'right', base_points: 150, matches_played: 38, runs_scored: 700,  batting_average: 25.0, wickets_taken: 38, bowling_average: 28.5, rating: 7.8 },
  { email: 'player27@snpl.com', name: 'Jasprit Bumrah',    role: 'bowler',        batting_hand: 'right', bowling_hand: 'right', base_points: 220, matches_played: 60, runs_scored: 30,   batting_average: 3.0,  wickets_taken: 110,bowling_average: 18.5, rating: 9.5 },
  { email: 'player28@snpl.com', name: 'KL Rahul',          role: 'wicket_keeper', batting_hand: 'right', bowling_hand: 'right', base_points: 190, matches_played: 55, runs_scored: 2000, batting_average: 41.0, wickets_taken: 0,  bowling_average: 0,    rating: 8.9 },
  { email: 'player29@snpl.com', name: 'Axar Patel',        role: 'all_rounder',   batting_hand: 'left',  bowling_hand: 'left',  base_points: 160, matches_played: 42, runs_scored: 600,  batting_average: 22.0, wickets_taken: 52, bowling_average: 24.0, rating: 8.0 },
  { email: 'player30@snpl.com', name: 'Ishan Kishan',      role: 'wicket_keeper', batting_hand: 'left',  bowling_hand: 'right', base_points: 170, matches_played: 38, runs_scored: 1300, batting_average: 36.0, wickets_taken: 0,  bowling_average: 0,    rating: 8.2 },
]

async function seed() {
  console.log('⚡ Creating 25 additional players...\n')

  let created = 0
  for (const p of PLAYERS) {
    try {
      const { supabase, user } = await signUpUser(p.email, PASSWORD, 'player')

      const { data: existing } = await supabase.from('players').select('id').eq('user_id', user.id).single()
      if (existing) {
        console.log(`  ↳ ${p.name} already exists, skipping`)
        continue
      }

      const { email, ...profile } = p
      const { error } = await supabase.from('players').insert({ user_id: user.id, ...profile }).select().single()
      if (error) { console.warn(`  ⚠ ${p.name}: ${error.message}`); continue }

      created++
      console.log(`  ✅ ${p.name} (${p.role}, ${p.base_points} pts) — ${p.email}`)
    } catch (e) {
      console.warn(`  ⚠ ${p.name}: ${e.message}`)
    }
  }

  console.log(`\n🎉 Done! Created ${created} new players (total pool: ~30 players)`)
  console.log('   All accounts use password: Test@123')
  console.log('   Enough for 6 teams × 5 players each for a mock auction.\n')
}

seed().catch(err => { console.error('❌', err.message); process.exit(1) })
