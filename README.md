# SNPL Auction

Cricket player auction platform: auctioneers publish tournaments and run live auctions,
team owners register teams and bid, players register profiles and show interest.

Stack: Next.js 16 (App Router) · React 19 · TypeScript (strict) · Supabase (Postgres, Auth,
Storage, RLS) · Tailwind CSS 3 + shadcn/ui · Zod.

## Prerequisites

| Tool         | Version                                | Notes                                                                                |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------ |
| Node.js      | 24 (see `.nvmrc`; `>=20.19` supported) | `nvm use` picks it up. On machines with NVM: `source "$HOME/.nvm/nvm.sh" && nvm use` |
| npm          | 10+                                    | ships with Node                                                                      |
| Docker       | any recent                             | only for the local Supabase stack                                                    |
| Supabase CLI | pinned via `npx supabase@2.117.0` (the version validated here)            | do **not** `npm install -g supabase` (unsupported by Supabase)                       |

## Setup

```bash
git clone https://github.com/tbrameshbabu/snpl-auction.git
cd snpl-auction
nvm use            # or: source "$HOME/.nvm/nvm.sh" && nvm use
npm ci
cp .env.local.example .env.local   # then fill in values (see Environment)
npm run dev        # http://localhost:3000
```

## Scripts

| Command                                   | What it does                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Next.js dev server                                                                             |
| `npm run build`                           | Production build. Type errors fail the build (no `ignoreBuildErrors`).                         |
| `npm start`                               | Serve the production build                                                                     |
| `npm run lint`                            | ESLint (`eslint-config-next` core-web-vitals + typescript, flat config in `eslint.config.mjs`) |
| `npm run typecheck`                       | `next typegen` (route types + `next-env.d.ts`) then `tsc --noEmit`                             |
| `npm run format` / `npm run format:check` | Prettier write / check                                                                         |
| `npm run check`                           | `lint` → `typecheck` → `build` (what CI runs)                                                  |
| `npm run seed` / `npm run seed:players`   | Development seed scripts against a **local** Supabase stack (see Seeding)                      |
| `npm run db:check`                        | Integration check of RLS + auction RPCs (incl. concurrent bids/sales) through the local REST API |
| `npm run contacts:check` | Local contact privacy integration checks; add `-- --api` to include authenticated routes against a running production build |

Lint policy: `@typescript-eslint/no-explicit-any`, `ban-ts-comment` and unused vars/imports are
errors (`_`-prefixed names are allowed). The React Compiler heuristics
(`react-hooks/set-state-in-effect`, `immutability`, `purity`) are reported as warnings.

## Environment

Public (safe to expose to the browser; **required for `next build`** because the Supabase
browser client is created at module scope):

| Variable                        | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key                        |

The app itself needs **no** service-role key: every privileged auction operation runs as a
`SECURITY DEFINER` RPC in the database (`supabase/migrations/20260919000001_auction_rpcs.sql`)
and is authorised there. There is no `lib/supabase/admin.ts`.

Seed-only, local stack (never expose to the client, never commit; see Seeding):
`SUPABASE_SERVICE_ROLE_KEY`, `SEED_PASSWORD`, `SEED_ALLOW_REMOTE`.

For a static compile without a real project (CI, smoke builds) any syntactically valid,
non-secret values work, e.g.:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key \
npm run build
```

## Local Supabase (disposable, recommended for development)

```bash
npx supabase@2.117.0 start            # first run pulls Docker images
npx supabase@2.117.0 status           # prints API URL, anon key, service_role key
npx supabase@2.117.0 db reset         # recreate DB and re-apply supabase/migrations/*.sql
npx supabase@2.117.0 stop             # add --no-backup to discard data
```

Put the printed `API URL` / `anon key` into `.env.local`. `supabase/config.toml` is the CLI
project config (ports, auth settings) and is committed; `supabase/.temp` is ignored.

```bash
npx supabase@2.117.0 test db    # pgTAP: supabase/tests/*.test.sql (RLS, RPC state machine, storage)
npm run db:check                # scripts/db-check.mjs: same env as the seeds; creates and removes its own users
npm run smoke                   # HTTP smoke against a running `npm run dev`/`npm start`
```

## Seeding development data

`npm run seed` creates 1 auctioneer, 4 team owners (+ teams) and 5 players with a published
tournament; `npm run seed:players` adds 25 more players. Both are idempotent. Accounts are
created with the Auth admin API using the local `SUPABASE_SERVICE_ROLE_KEY` (printed by
`npx supabase@2.117.0 status`) so they are confirmed immediately, and the seed auctioneer is promoted
with the same privileged `update public.users set role = 'auctioneer'` an operator would run.
Everything after sign-in (tournament, teams, interests) goes through the normal anon-key API
and RLS.

Safety rails (`scripts/lib/seed-env.mjs`):

- env is read from the process, then `.env.seed.local`, then `.env.local`;
- the target must be local (`localhost`, `127.0.0.1`, `*.local`, `*.test`) unless
  `SEED_ALLOW_REMOTE=1` is set explicitly;
- `SUPABASE_SERVICE_ROLE_KEY` is required (the seed refuses to run without it);
- account password defaults to `Test@123`; override with `SEED_PASSWORD`.

Seeded accounts are for local/test stacks only. Do not run seeds against production.

## Roles, permissions and provisioning

| Role         | Sign-up                                  | Access                                                                                  |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `player`     | Public (`/auth/signup`)                  | `/player/**`, shows interest, views auctions/results                                    |
| `team_owner` | Public (`/auth/signup`)                  | `/team-owner/**`, registers/withdraws a team, follows the live auction and results      |
| `auctioneer` | **Not offered in the public sign-up UI** | `/auctioneer/**`: creates tournaments, runs auctions, can place bids on behalf of teams |

Auctioneers are provisioned deliberately, not self-served. `POST /api/auth/signup` accepts only
`player` / `team_owner`, and the `auth.users` trigger maps any other requested role to
`player`, so the only way to become an auctioneer is a privileged role update:

1. The person signs up normally at `/auth/signup` (or an operator adds the user in
   Supabase Dashboard → Authentication → Add user).
2. An operator runs, as `postgres`/service role (SQL Editor or `psql`):
   `update public.users set role = 'auctioneer' where email = '<email>';`
   Users cannot change their own `role` (blocked by RLS and a trigger).
3. The user then completes the profile at `/auctioneer/register`.

`proxy.ts` (Next.js 16 middleware convention) refreshes the Supabase session and enforces
role-based route access; Row Level Security policies and `SECURITY DEFINER` RPCs
(`supabase/migrations/20260919000000_production_hardening.sql`, `…0001_auction_rpcs.sql`)
enforce data access and the auction state machine.

### Contact privacy

Phone numbers live in `profile_contacts`, protected by RLS. Profile owners can read their
own contact details. An auctioneer can read a player's phone only while that player has
an `interested` or `confirmed` registration in a non-cancelled tournament they manage.
Withdrawal revokes that relationship; adding a player to an auction queue alone grants
no contact access. Team owners, anonymous visitors and unrelated auctioneers cannot read
these contacts.

The forward migration preserves existing player and auctioneer numbers separately.
Profile `phone` columns remain as write-compatible inputs: a trigger stores the value
privately and clears it before the public row is written. Public profile reads always
return `phone: null`; authenticated profile APIs restore the owner's phone, and the
auctioneer's tournament-player API adds permitted contacts. Public names and statistics
remain readable.

## Deployment

1. **Database**: apply `supabase/migrations/*.sql` in order to the target project
   (`npx supabase@2.117.0 link --project-ref <ref> && npx supabase@2.117.0 db push`). Migrations are
   forward-only; never edit an applied migration — add a new one.
   Review any `WARNING` output from `20260919000000_production_hardening.sql`: it reports
   (but never deletes) legacy rows that fail the new same-tournament constraints or have more
   than one active player per tournament.
2. **Auth**: in the Supabase Dashboard set Site URL and Redirect URLs to the deployed origin
   (`/auth/callback`). Storage buckets `player-profiles` and `team-logos` are created by the
   migrations.
3. **App**: deploy the Next.js app (Vercel or any Node host running `npm run build && npm start`)
   with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set. No service-role key
   is needed by the app. Node `>=20.19`.
4. **Verify** (production smoke):
   - `GET /` renders; `GET /tournaments` lists published tournaments.
   - Sign up a player and a team owner; confirm redirects to `/player/register` and
     `/team-owner/dashboard` and that `/auctioneer/**` is refused for them.
   - Log in as the provisioned auctioneer, create a draft tournament, publish it, start an
     auction, place a bid, mark a player sold; confirm team `spent` updates and that a
     reload of the auctioneer console and the viewer both show the persisted bids.
   - `npm audit --audit-level=high` is clean for the deployed lockfile.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → `npm audit --audit-level=high`,
using the non-secret placeholder Supabase env above.

## Repository layout

- `app/` App Router pages and `app/api/**` route handlers
- `components/ui/` shadcn/ui primitives (themed via CSS variables in `app/globals.css` and `tailwind.config.ts`)
- `lib/supabase/` typed browser/server Supabase clients (`lib/database.types.ts` is generated:
  `npx supabase@2.117.0 gen types typescript --local --schema public > lib/database.types.ts`)
- `lib/api/` route-handler helpers (auth, Zod body parsing, error mapping, uploads)
- `supabase/migrations/` forward-only SQL migrations; `supabase/README.md` for DB details
- `scripts/` development seed scripts
