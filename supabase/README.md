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
│   └── 20240101000003_storage_setup.sql
└── config.toml         # Supabase CLI configuration (optional)
```

## Quick Start

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
