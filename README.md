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
| Supabase CLI | pinned via `npx supabase@2`            | do **not** `npm install -g supabase` (unsupported by Supabase)                       |

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

Server-only (never expose to the client, never commit):

| Variable                    | Description                                                                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. Used by `lib/supabase/admin.ts`; currently read at runtime by `POST /api/auction/[tournamentId]/sold` to update team budgets. Not needed to build. Intended for server-side privileged operations and explicit provisioning scripts only. |

Seed-only (see Seeding): `SEED_PASSWORD`, `SEED_ALLOW_REMOTE`.

For a static compile without a real project (CI, smoke builds) any syntactically valid,
non-secret values work, e.g.:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key \
npm run build
```

## Local Supabase (disposable, recommended for development)

```bash
npx supabase@2 start            # first run pulls Docker images
npx supabase@2 status           # prints API URL, anon key, service_role key
npx supabase@2 db reset         # recreate DB and re-apply supabase/migrations/*.sql
npx supabase@2 stop             # add --no-backup to discard data
```

Put the printed `API URL` / `anon key` into `.env.local`. `supabase/config.toml` is the CLI
project config (ports, auth settings) and is committed; `supabase/.temp` is ignored.

## Seeding development data

`npm run seed` creates 1 auctioneer, 4 team owners (+ teams) and 5 players with a published
tournament; `npm run seed:players` adds 25 more players. Both sign up via the anon key
(no service-role key needed) and are idempotent.

Safety rails (`scripts/lib/seed-env.mjs`):

- env is read from the process, then `.env.seed.local`, then `.env.local`;
- the target must be local (`localhost`, `127.0.0.1`, `*.local`, `*.test`) unless
  `SEED_ALLOW_REMOTE=1` is set explicitly;
- account password defaults to `Test@123`; override with `SEED_PASSWORD`.

Seeded accounts are for local/test stacks only. Do not run seeds against production.

## Roles, permissions and provisioning

| Role         | Sign-up                                  | Access                                                                                  |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `player`     | Public (`/auth/signup`)                  | `/player/**`, shows interest, views auctions/results                                    |
| `team_owner` | Public (`/auth/signup`)                  | `/team-owner/**`, registers a team, bids                                                |
| `auctioneer` | **Not offered in the public sign-up UI** | `/auctioneer/**`: creates tournaments, runs auctions, can place bids on behalf of teams |

Auctioneers are provisioned deliberately, not self-served:

1. Create the auth user (Supabase Dashboard → Authentication → Add user, or the local seed).
2. Ensure the `public.users` row has `role = 'auctioneer'` (the seed does this via the API;
   for a real project run in SQL Editor:
   `update public.users set role = 'auctioneer' where email = '<email>';`).
3. The user then completes the profile at `/auctioneer/register`.

`middleware.ts` enforces role-based route access; Row Level Security policies in
`supabase/migrations/20240101000001_rls_policies.sql` (and later fixes) enforce data access.

## Deployment

1. **Database**: apply `supabase/migrations/*.sql` in order to the target project
   (`npx supabase@2 link --project-ref <ref> && npx supabase@2 db push`). Migrations are
   forward-only; never edit an applied migration — add a new one.
2. **Auth**: in the Supabase Dashboard set Site URL and Redirect URLs to the deployed origin
   (`/auth/callback`). Storage bucket `player-profiles` is created by migration `…0003`.
3. **App**: deploy the Next.js app (Vercel or any Node host running `npm run build && npm start`)
   with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and, for the sold endpoint,
   `SUPABASE_SERVICE_ROLE_KEY` set as platform secrets. Node `>=20.19`.
4. **Verify** (production smoke):
   - `GET /` renders; `GET /tournaments` lists published tournaments.
   - Sign up a player and a team owner; confirm redirects to `/player/register` and
     `/team-owner/dashboard` and that `/auctioneer/**` is refused for them.
   - Log in as the provisioned auctioneer, create a draft tournament, publish it, start an
     auction, place a bid, mark a player sold; confirm team `spent` updates.
   - `npm audit --audit-level=high` is clean for the deployed lockfile.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → `npm audit --audit-level=high`,
using the non-secret placeholder Supabase env above.

## Repository layout

- `app/` App Router pages and `app/api/**` route handlers
- `components/ui/` shadcn/ui primitives (themed via CSS variables in `app/globals.css` and `tailwind.config.ts`)
- `lib/supabase/` browser/server/admin Supabase clients
- `supabase/migrations/` forward-only SQL migrations; `supabase/README.md` for DB details
- `scripts/` development seed scripts
