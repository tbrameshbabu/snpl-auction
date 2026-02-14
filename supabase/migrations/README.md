# Supabase Migrations

This directory contains database migrations for the cricket auction platform.

## Migration Files

Migrations are numbered sequentially and should be run in order:

1. **20240101000000_initial_schema.sql** - Creates all database tables, constraints, and indexes
2. **20240101000001_rls_policies.sql** - Sets up Row Level Security policies
3. **20240101000002_functions_triggers.sql** - Creates database functions and triggers
4. **20240101000003_storage_setup.sql** - Configures Supabase Storage bucket and policies

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order
4. Run each migration

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

### Option 3: Manual SQL Execution

Run each SQL file in order in your Supabase SQL Editor or any PostgreSQL client.

## Verification

After running migrations, verify:

1. All tables are created:
   - users, players, auctioneers, tournaments, teams
   - player_interests, tournament_players, bids, player_sales

2. RLS is enabled on all tables

3. Storage bucket `player-profiles` exists

4. All indexes are created

## Rollback

If you need to rollback, you can drop tables in reverse order:

```sql
DROP TABLE IF EXISTS player_sales CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS tournament_players CASCADE;
DROP TABLE IF EXISTS player_interests CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS auctioneers CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

## Environment Variables

After applying migrations, update your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
