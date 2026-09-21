# Supabase Configuration

This directory contains Supabase-related configuration and migrations.

## Structure

```
supabase/
├── migrations/          # Database migration files
│   ├── README.md       # Migration instructions
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240101000001_rls_policies.sql
│   ├── 20240101000002_functions_triggers.sql
│   ├── 20240101000003_storage_setup.sql
│   ├── 20240101000004_fix_users_insert_policy.sql
│   ├── 20240101000005_add_team_logo.sql
│   ├── 20240101000006_add_active_player_status.sql
│   ├── 20260919000000_production_hardening.sql   # constraints, RLS rewrite, auth trigger, storage
│   └── 20260919000001_auction_rpcs.sql           # SECURITY DEFINER auction state machine
├── tests/
│   └── auction_hardening.test.sql   # pgTAP checks, run with `npx supabase@2.117.0 test db`
└── config.toml         # Supabase CLI project config (local stack ports/auth)
```

## Local development stack

Use the Supabase CLI through `npx` (Supabase does not support `npm install -g supabase`):

```bash
npx supabase@2.117.0 start      # starts Postgres/Auth/Storage/etc. in Docker and applies migrations
npx supabase@2.117.0 status     # prints API URL, anon key and service_role key
npx supabase@2.117.0 db reset   # wipes the local DB and re-applies supabase/migrations
npx supabase@2.117.0 stop       # `--no-backup` discards local data
npx supabase@2.117.0 test db    # runs supabase/tests/*.test.sql (pgTAP) against the local stack
```

After changing the schema, regenerate the TypeScript types the app compiles against:

```bash
npx supabase@2.117.0 gen types typescript --local --schema public > lib/database.types.ts
```

Then `npm run seed` (see the root README) populates local test data.

## Hosted project quick start

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Apply Migrations**
   - Follow instructions in `migrations/README.md`
   - Run migrations in order

3. **Update Environment Variables**

   ```bash
   cp .env.local.example .env.local
   # Add your Supabase credentials
   ```

4. **Verify Setup**
   - Check that all tables exist
   - Verify RLS policies are active
   - Test storage bucket access

## Database Schema

The database includes:

- **Users & Auth**: Role-based user management
- **Players**: Player profiles with cricket stats
- **Auctioneers**: Tournament organizers
- **Tournaments**: Auction events
- **Teams**: Team registrations
- **Bidding**: Auction bids and results

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure storage policies for images
