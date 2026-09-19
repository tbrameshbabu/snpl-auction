-- Database integration checks for the production-hardening migrations.
-- Run against a disposable local stack only:
--   supabase test db
-- or, without pg_prove:
--   docker exec -i supabase_db_snpl-auction psql -U postgres -v ON_ERROR_STOP=1 \
--     -f - < supabase/tests/auction_hardening.test.sql
-- Everything runs inside one transaction that is rolled back at the end.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(65);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE fixture (key TEXT PRIMARY KEY, id UUID NOT NULL);
GRANT ALL ON fixture TO authenticated;

CREATE FUNCTION pg_temp.fx(p_key TEXT) RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM fixture WHERE key = p_key;
$$;

CREATE FUNCTION pg_temp.new_auth_user(p_key TEXT, p_email TEXT, p_role TEXT) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  uid UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          jsonb_build_object('role', p_role), '{"provider":"email","providers":["email"]}');
  INSERT INTO fixture VALUES (p_key, uid);
  RETURN uid;
END;
$$;

-- Impersonate an authenticated user the way PostgREST does.
CREATE FUNCTION pg_temp.login(p_key TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  claims TEXT;
BEGIN
  SELECT json_build_object('sub', u.id, 'role', 'authenticated', 'email', u.email)::text
  INTO claims
  FROM auth.users u WHERE u.id = pg_temp.fx(p_key);
  PERFORM set_config('request.jwt.claims', claims, true);
  SET LOCAL ROLE authenticated;
END;
$$;

CREATE FUNCTION pg_temp.logout() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- profile trigger and role protection
-- ---------------------------------------------------------------------------

SELECT pg_temp.new_auth_user('auctioneer', 'auctioneer@test.local', 'auctioneer');
SELECT pg_temp.new_auth_user('auctioneer2', 'auctioneer2@test.local', 'player');
SELECT pg_temp.new_auth_user('owner1', 'owner1@test.local', 'team_owner');
SELECT pg_temp.new_auth_user('owner2', 'owner2@test.local', 'team_owner');
SELECT pg_temp.new_auth_user('player1', 'player1@test.local', 'player');
SELECT pg_temp.new_auth_user('player2', 'player2@test.local', 'player');
SELECT pg_temp.new_auth_user('player3', 'player3@test.local', 'player');

SELECT is(
  (SELECT role FROM public.users WHERE id = pg_temp.fx('auctioneer')),
  'player',
  'signup metadata role=auctioneer is downgraded to player by the profile trigger'
);
SELECT is(
  (SELECT role FROM public.users WHERE id = pg_temp.fx('owner1')),
  'team_owner',
  'signup metadata role=team_owner is honoured'
);

SELECT pg_temp.login('auctioneer');
SELECT throws_ok(
  $$ UPDATE public.users SET role = 'auctioneer' WHERE id = auth.uid() $$,
  '42501',
  NULL,
  'authenticated users cannot update public.users (role is protected)'
);
SELECT throws_ok(
  $$ INSERT INTO public.auctioneers (user_id, name) VALUES (auth.uid(), 'Not provisioned') $$,
  '42501',
  NULL,
  'a player cannot create an auctioneer profile'
);
SELECT pg_temp.logout();

-- Operator provisioning (documented in 20260919000000_production_hardening.sql).
UPDATE public.users SET role = 'auctioneer' WHERE id IN (pg_temp.fx('auctioneer'), pg_temp.fx('auctioneer2'));

SELECT pg_temp.login('auctioneer');
SELECT lives_ok(
  $$ INSERT INTO public.auctioneers (user_id, name) VALUES (auth.uid(), 'Main Auctioneer') $$,
  'a provisioned auctioneer can complete their profile'
);
SELECT pg_temp.logout();

SELECT pg_temp.login('auctioneer2');
INSERT INTO public.auctioneers (user_id, name) VALUES (auth.uid(), 'Other Auctioneer');
SELECT pg_temp.logout();

-- ---------------------------------------------------------------------------
-- tournament, teams, players
-- ---------------------------------------------------------------------------

SELECT pg_temp.login('auctioneer');
WITH ins AS (
  INSERT INTO public.tournaments (auctioneer_id, title, auction_date, auction_time, num_teams, num_players_per_team, min_players_per_team, budget_per_team, status)
  SELECT a.id, 'Hardening Cup', current_date, '10:00', 2, 2, 1, 1000, 'published'
  FROM public.auctioneers a WHERE a.user_id = auth.uid()
  RETURNING id
)
INSERT INTO fixture SELECT 'tournament', id FROM ins;
SELECT pg_temp.logout();

SELECT pg_temp.login('auctioneer2');
WITH ins AS (
  INSERT INTO public.tournaments (auctioneer_id, title, auction_date, auction_time, num_teams, num_players_per_team, min_players_per_team, budget_per_team, status)
  SELECT a.id, 'Other Cup', current_date, '10:00', 2, 2, 1, 1000, 'published'
  FROM public.auctioneers a WHERE a.user_id = auth.uid()
  RETURNING id
)
INSERT INTO fixture SELECT 'other_tournament', id FROM ins;
SELECT pg_temp.logout();

SELECT pg_temp.login('owner1');
SELECT throws_ok(
  format($$ INSERT INTO public.teams (tournament_id, owner_id, name, short_name, color, budget)
            VALUES (%L, auth.uid(), 'Cheaters', 'CHT', '#000', 999999) $$, pg_temp.fx('tournament')),
  '42501',
  NULL,
  'team registration cannot pick its own budget'
);
WITH ins AS (
  INSERT INTO public.teams (tournament_id, owner_id, name, short_name, color, budget)
  VALUES (pg_temp.fx('tournament'), auth.uid(), 'Team One', 'ONE', '#111', 1000)
  RETURNING id
)
INSERT INTO fixture SELECT 'team1', id FROM ins;
SELECT throws_ok(
  format($$ UPDATE public.teams SET spent = 0, budget = 5000 WHERE id = %L $$, pg_temp.fx('team1')),
  '42501',
  NULL,
  'team owners cannot edit budget directly'
);
SELECT lives_ok(
  format($$ UPDATE public.teams SET color = '#222' WHERE id = %L $$, pg_temp.fx('team1')),
  'team owners can still edit cosmetic fields'
);
SELECT pg_temp.logout();

SELECT pg_temp.login('owner2');
WITH ins AS (
  INSERT INTO public.teams (tournament_id, owner_id, name, short_name, color, budget)
  VALUES (pg_temp.fx('tournament'), auth.uid(), 'Team Two', 'TWO', '#333', 1000)
  RETURNING id
)
INSERT INTO fixture SELECT 'team2', id FROM ins;
WITH ins AS (
  INSERT INTO public.teams (tournament_id, owner_id, name, short_name, color, budget)
  VALUES (pg_temp.fx('other_tournament'), auth.uid(), 'Foreign', 'FRN', '#444', 1000)
  RETURNING id
)
INSERT INTO fixture SELECT 'foreign_team', id FROM ins;
SELECT pg_temp.logout();

CREATE FUNCTION pg_temp.register_player(p_key TEXT, p_name TEXT, p_base INTEGER) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.login(p_key);
  INSERT INTO public.players (user_id, name, role, batting_hand, bowling_hand, base_points)
  VALUES (auth.uid(), p_name, 'batsman', 'right', 'right', p_base);
  INSERT INTO public.player_interests (player_id, tournament_id, status)
  SELECT p.id, pg_temp.fx('tournament'), 'interested' FROM public.players p WHERE p.user_id = auth.uid();
  PERFORM pg_temp.logout();
END;
$$;

SELECT pg_temp.register_player('player1', 'Player One', 100);
SELECT pg_temp.register_player('player2', 'Player Two', 100);
SELECT pg_temp.register_player('player3', 'Player Three', 100);

SELECT pg_temp.login('player1');
SELECT throws_ok(
  $$ INSERT INTO public.bids (tournament_id, tournament_player_id, team_id, amount)
     SELECT pg_temp.fx('tournament'), gen_random_uuid(), pg_temp.fx('team1'), 100 $$,
  '42501',
  NULL,
  'bids cannot be written directly through the REST role'
);
SELECT throws_ok(
  $$ INSERT INTO public.player_sales (tournament_id, tournament_player_id, status)
     SELECT pg_temp.fx('tournament'), gen_random_uuid(), 'unsold' $$,
  '42501',
  NULL,
  'player_sales cannot be written directly through the REST role'
);
SELECT pg_temp.logout();

-- ---------------------------------------------------------------------------
-- start auction
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  format($$ SELECT public.start_auction(%L) $$, pg_temp.fx('tournament')),
  'SN401',
  NULL,
  'RPCs require an authenticated caller'
);

SELECT pg_temp.login('auctioneer2');
SELECT throws_ok(
  format($$ SELECT public.start_auction(%L) $$, pg_temp.fx('tournament')),
  'SN403',
  NULL,
  'only the owning auctioneer can start the auction'
);
SELECT pg_temp.logout();

SELECT pg_temp.login('auctioneer');
SELECT is(
  (SELECT status FROM public.start_auction(pg_temp.fx('tournament'))),
  'live',
  'start_auction moves the tournament to live'
);
SELECT is(
  (SELECT count(*) FROM public.tournament_players WHERE tournament_id = pg_temp.fx('tournament')),
  3::bigint,
  'start_auction seeds interested players into the pool'
);
SELECT is(
  (SELECT status FROM public.start_auction(pg_temp.fx('tournament'))),
  'live',
  'start_auction is idempotent on a live tournament'
);
SELECT throws_ok(
  format($$ UPDATE public.tournaments SET status = 'draft' WHERE id = %L $$, pg_temp.fx('tournament')),
  '42501',
  NULL,
  'live tournaments cannot be edited directly'
);
SELECT pg_temp.logout();

INSERT INTO fixture
SELECT 'tp' || row_number() OVER (ORDER BY tp.order_index), tp.id
FROM public.tournament_players tp WHERE tp.tournament_id = pg_temp.fx('tournament');

SELECT pg_temp.login('player1');
SELECT throws_ok(
  $$ UPDATE public.player_interests SET status = 'withdrawn'
     WHERE tournament_id = pg_temp.fx('tournament') $$,
  '42501',
  NULL,
  'player interests are frozen once the auction is live'
);
SELECT pg_temp.logout();

-- ---------------------------------------------------------------------------
-- activate / bid / sold
-- ---------------------------------------------------------------------------

SELECT pg_temp.login('auctioneer');

SELECT is(
  (SELECT status || ':' || auction_round FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp1'))),
  'active:2',
  'activate_player marks the player active and opens a new bid round'
);
SELECT is(
  (SELECT status FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp2'))),
  'active',
  'activating another player is allowed (previous one returns to pending)'
);
SELECT is(
  (SELECT count(*) FROM public.tournament_players
   WHERE tournament_id = pg_temp.fx('tournament') AND status = 'active'),
  1::bigint,
  'at most one player is active per tournament'
);
SELECT is(
  (SELECT status FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp1'))),
  'active',
  'the first player can be re-activated'
);

SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 90) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team1')),
  'SN400',
  NULL,
  'a bid below base price is rejected'
);
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('foreign_team')),
  'SN404',
  NULL,
  'a team from another tournament cannot bid'
);
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'bids on a player that is not active are rejected'
);
SELECT is(
  (SELECT amount FROM public.place_bid(pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team1'), 100)),
  100,
  'a bid at base price is accepted'
);
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 110) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team2')),
  'SN400',
  NULL,
  'a bid below the increment ladder (100 -> +20) is rejected'
);
SELECT is(
  (SELECT amount FROM public.place_bid(pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team2'), 120)),
  120,
  'a bid meeting the increment is accepted'
);
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 1500) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'a bid above the remaining budget is rejected'
);

SELECT throws_ok(
  format($$ SELECT public.mark_player_sold(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'selling to a stale winner/amount is rejected'
);
SELECT throws_ok(
  format($$ SELECT public.mark_player_sold(%L, %L, %L, 140) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team2')),
  'SN409',
  NULL,
  'selling for an amount that was never bid is rejected'
);
SELECT is(
  (SELECT status || ':' || final_price FROM public.mark_player_sold(pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team2'), 120)),
  'sold:120',
  'selling to the latest bid succeeds'
);
SELECT is(
  (SELECT spent FROM public.teams WHERE id = pg_temp.fx('team2')),
  120,
  'the winning team is charged exactly once'
);
SELECT is(
  (SELECT status || ':' || final_price FROM public.mark_player_sold(pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team2'), 120)),
  'sold:120',
  'repeating an identical sold request is idempotent'
);
SELECT is(
  (SELECT spent FROM public.teams WHERE id = pg_temp.fx('team2')),
  120,
  'a repeated sold request does not charge again'
);
SELECT throws_ok(
  format($$ SELECT public.mark_player_sold(%L, %L, %L, 120) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp1'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'a completed sale cannot be replaced by a different winner'
);
SELECT is(
  (SELECT count(*) FROM public.player_sales WHERE tournament_player_id = pg_temp.fx('tp1')),
  1::bigint,
  'exactly one sale row exists for the sold player'
);
SELECT throws_ok(
  format($$ SELECT public.activate_player(%L, %L) $$, pg_temp.fx('tournament'), pg_temp.fx('tp1')),
  'SN409',
  NULL,
  'a sold player cannot be re-activated'
);

-- ---------------------------------------------------------------------------
-- unsold / re-auction round isolation
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT auction_round FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp2'))),
  3,
  'second player activated again: every activation opens a new round'
);
SELECT is(
  (SELECT amount FROM public.place_bid(pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1'), 100)),
  100,
  'a bid is recorded for the second player'
);
SELECT is(
  (SELECT status FROM public.mark_player_unsold(pg_temp.fx('tournament'), pg_temp.fx('tp2'))),
  'unsold',
  'the auctioneer can close a player as unsold'
);
SELECT is(
  (SELECT status FROM public.mark_player_unsold(pg_temp.fx('tournament'), pg_temp.fx('tp2'))),
  'unsold',
  'repeating unsold is idempotent'
);
SELECT throws_ok(
  format($$ SELECT public.mark_player_sold(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'an unsold player cannot be sold afterwards'
);

SELECT is(
  (SELECT count(*) FROM public.re_auction_unsold(pg_temp.fx('tournament'))),
  1::bigint,
  're_auction_unsold returns the players moved back to the pool'
);
SELECT is(
  (SELECT count(*) FROM public.player_sales WHERE tournament_player_id = pg_temp.fx('tp2')),
  0::bigint,
  'the superseded unsold result row is removed'
);
SELECT is(
  (SELECT auction_round FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp2'))),
  4,
  're-activation after re-auction opens another round'
);
SELECT throws_ok(
  format($$ SELECT public.mark_player_sold(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'the previous round''s bid does not leak into the new round (no current bids)'
);
SELECT is(
  (SELECT amount FROM public.place_bid(pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1'), 100)),
  100,
  'bidding restarts from base price in the new round'
);
SELECT is(
  (SELECT count(*) FROM public.bids WHERE tournament_player_id = pg_temp.fx('tp2')),
  2::bigint,
  'historical bids are kept for audit'
);
SELECT is(
  (SELECT status FROM public.mark_player_sold(pg_temp.fx('tournament'), pg_temp.fx('tp2'), pg_temp.fx('team1'), 100)),
  'sold',
  'the player sells in the new round'
);

-- ---------------------------------------------------------------------------
-- roster capacity from tournaments.num_players_per_team
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT status FROM public.activate_player(pg_temp.fx('tournament'), pg_temp.fx('tp3'))),
  'active',
  'third player activated'
);
SELECT pg_temp.logout();
UPDATE public.tournaments SET num_players_per_team = 1 WHERE id = pg_temp.fx('tournament');
SELECT pg_temp.login('auctioneer');
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp3'), pg_temp.fx('team1')),
  'SN409',
  NULL,
  'a team with a full roster cannot bid'
);
SELECT throws_ok(
  format($$ SELECT public.place_bid(%L, %L, %L, 100) $$,
         pg_temp.fx('tournament'), pg_temp.fx('tp3'), pg_temp.fx('team2')),
  'SN409',
  NULL,
  'roster capacity is read from the tournament, not hardcoded'
);

-- ---------------------------------------------------------------------------
-- complete
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  format($$ SELECT public.complete_auction(%L) $$, pg_temp.fx('tournament')),
  'SN409',
  NULL,
  'the auction cannot complete while a player is active'
);
SELECT is(
  (SELECT status FROM public.mark_player_unsold(pg_temp.fx('tournament'), pg_temp.fx('tp3'))),
  'unsold',
  'third player closed as unsold'
);
SELECT is(
  (SELECT status FROM public.complete_auction(pg_temp.fx('tournament'))),
  'completed',
  'complete_auction marks the tournament completed'
);
SELECT is(
  (SELECT status FROM public.complete_auction(pg_temp.fx('tournament'))),
  'completed',
  'complete_auction is idempotent'
);
SELECT throws_ok(
  format($$ SELECT public.activate_player(%L, %L) $$, pg_temp.fx('tournament'), pg_temp.fx('tp3')),
  'SN409',
  NULL,
  'no auction operations after completion'
);
SELECT throws_ok(
  format($$ UPDATE public.tournament_players SET base_price = 1 WHERE id = %L $$, pg_temp.fx('tp3')),
  '42501',
  NULL,
  'completed tournament players are read-only through REST'
);
SELECT pg_temp.logout();

-- ---------------------------------------------------------------------------
-- storage ownership
-- ---------------------------------------------------------------------------

SELECT pg_temp.login('player1');
SELECT lives_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner)
     VALUES ('player-profiles', auth.uid()::text || '/avatar.png', auth.uid()) $$,
  'players can upload under their own folder'
);
SELECT throws_ok(
  format($$ INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('player-profiles', %L, auth.uid()) $$, pg_temp.fx('player2')::text || '/avatar.png'),
  '42501',
  NULL,
  'players cannot upload under another user''s folder'
);
SELECT throws_ok(
  format($$ INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('team-logos', %L, auth.uid()) $$, pg_temp.fx('team1')::text || '/logo.png'),
  '42501',
  NULL,
  'non-owners cannot upload a team logo'
);
SELECT pg_temp.logout();

SELECT pg_temp.login('owner1');
SELECT lives_ok(
  format($$ INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('team-logos', %L, auth.uid()) $$, pg_temp.fx('team1')::text || '/logo.png'),
  'team owners can upload their own team logo'
);
SELECT throws_ok(
  format($$ INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('team-logos', %L, auth.uid()) $$, pg_temp.fx('team2')::text || '/logo.png'),
  '42501',
  NULL,
  'team owners cannot upload another team''s logo'
);
SELECT pg_temp.logout();

SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'team-logos'),
  ARRAY['image/jpeg', 'image/png', 'image/webp'],
  'team-logos bucket restricts MIME types'
);
SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'player-profiles'),
  5242880::bigint,
  'player-profiles bucket enforces a 5MB limit'
);

SELECT * FROM finish();
ROLLBACK;
