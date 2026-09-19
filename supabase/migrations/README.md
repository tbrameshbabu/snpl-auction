# Supabase Migrations

This directory contains database migrations for the cricket auction platform.

## Migration Files

Migrations are numbered sequentially and should be run in order:

1. **20240101000000_initial_schema.sql** - Creates all database tables, constraints, and indexes
2. **20240101000001_rls_policies.sql** - Sets up Row Level Security policies
3. **20240101000002_functions_triggers.sql** - Creates database functions and triggers
4. **20240101000003_storage_setup.sql** - Configures Supabase Storage bucket and policies
5. **20240101000004_fix_users_insert_policy.sql** - Fixes the `users` INSERT RLS policy
6. **20240101000005_add_team_logo.sql** - Adds team logo support
7. **20240101000006_add_active_player_status.sql** - Adds the `active` player status
8. **20260919000000_production_hardening.sql** - Production hardening (non-destructive):
   `private` helper schema, `auction_round` on `tournament_players` / `round` on `bids`,
   same-tournament composite foreign keys, one-active-player-per-tournament index, `auth.users`
   profile trigger (self-service roles limited to `player`/`team_owner`), RLS rewrite with
   write-guard triggers, table privilege revokes, `player-profiles`/`team-logos` storage buckets
   and path-scoped policies
9. **20260919000001_auction_rpcs.sql** - `SECURITY DEFINER` auction state machine
   (`start_auction`, `activate_player`, `place_bid`, `mark_player_sold`, `mark_player_unsold`,
   `re_auction_unsold`, `complete_auction`); the only write path for auction-state tables

Migration 8 validates legacy data instead of deleting it: constraints are added `NOT VALID` and
then validated inside `DO` blocks that `RAISE WARNING` (listing the offending table) when rows
reference another tournament, and any extra `active` tournament player is demoted to `pending`
with a warning. Read the warnings when applying to a database with existing data and fix the
rows by hand, then run `ALTER TABLE ... VALIDATE CONSTRAINT ...` for the named constraint.

Migrations are forward-only. Never edit a migration that has been applied to any environment;
add a new `<timestamp>_name.sql` file instead (the CLI ignores files that do not match that pattern).

## How to Apply Migrations

### Option 1: Supabase CLI (recommended)

```bash
# No global install: run the pinned CLI through npx
npx supabase@2 login
npx supabase@2 link --project-ref your-project-ref

# Preview, then apply pending migrations
npx supabase@2 db push --dry-run
npx supabase@2 db push
```

For a disposable local stack use `npx supabase@2 start` / `db reset` instead (see `../README.md`).

### Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order
4. Run each migration

### Option 3: Manual SQL Execution

Run each SQL file in order in your Supabase SQL Editor or any PostgreSQL client.

## Verification

After running migrations, verify:

1. All tables are created:
   - users, players, auctioneers, tournaments, teams
   - player_interests, tournament_players, bids, player_sales

2. RLS is enabled on all tables

3. Storage buckets `player-profiles` and `team-logos` exist

4. All indexes are created

5. The auction RPCs exist and are executable only by `authenticated`:
   `select proname from pg_proc where pronamespace = 'public'::regnamespace and proname like '%auction%';`

On a local stack, `npx supabase@2 test db` runs `../tests/auction_hardening.test.sql`, which
asserts the RLS, privilege and state-machine behaviour above.

## Rollback

There is no automated rollback. **Dropping tables destroys data**; only do this on a disposable
local/test database (`npx supabase@2 db reset` is the safe equivalent). On a real project, write a
new forward migration that reverses the change instead.

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
