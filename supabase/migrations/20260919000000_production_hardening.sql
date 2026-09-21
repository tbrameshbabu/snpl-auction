-- Production hardening: schema invariants, profile provisioning, RLS/grant
-- hardening, write guards and storage policies.
--
-- Forward-only. Existing rows are never deleted; constraints that legacy data
-- might violate are added NOT VALID and validated opportunistically, so the
-- migration always applies and inconsistent rows surface as WARNINGs.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============================================
-- SCHEMA: auction rounds and invariants
-- ============================================

ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS auction_round INTEGER NOT NULL DEFAULT 1 CHECK (auction_round > 0);

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1 CHECK (round > 0);

CREATE INDEX IF NOT EXISTS idx_bids_player_round_amount
  ON public.bids (tournament_player_id, round, amount DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_sales_team_id ON public.player_sales (team_id);

ALTER TABLE public.tournament_players
  ADD CONSTRAINT tournament_players_tournament_id_id_key UNIQUE (tournament_id, id);

ALTER TABLE public.teams
  ADD CONSTRAINT teams_tournament_id_id_key UNIQUE (tournament_id, id);

ALTER TABLE public.bids
  ADD CONSTRAINT bids_player_same_tournament_fkey
    FOREIGN KEY (tournament_id, tournament_player_id)
    REFERENCES public.tournament_players (tournament_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT bids_team_same_tournament_fkey
    FOREIGN KEY (tournament_id, team_id)
    REFERENCES public.teams (tournament_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.player_sales
  ADD CONSTRAINT player_sales_player_same_tournament_fkey
    FOREIGN KEY (tournament_id, tournament_player_id)
    REFERENCES public.tournament_players (tournament_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT player_sales_team_same_tournament_fkey
    FOREIGN KEY (tournament_id, team_id)
    REFERENCES public.teams (tournament_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT player_sales_status_consistency
    CHECK (
      (status = 'sold' AND team_id IS NOT NULL AND final_price IS NOT NULL)
      OR (status = 'unsold' AND team_id IS NULL AND final_price IS NULL)
    ) NOT VALID;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_spent_within_budget CHECK (spent <= budget) NOT VALID;

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('public.bids', 'bids_player_same_tournament_fkey'),
      ('public.bids', 'bids_team_same_tournament_fkey'),
      ('public.player_sales', 'player_sales_player_same_tournament_fkey'),
      ('public.player_sales', 'player_sales_team_same_tournament_fkey'),
      ('public.player_sales', 'player_sales_status_consistency'),
      ('public.teams', 'teams_spent_within_budget')
    ) AS v(tbl, con)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tbl, c.con);
    EXCEPTION WHEN check_violation OR foreign_key_violation THEN
      RAISE WARNING 'Constraint % on % left NOT VALID: legacy rows violate it (%). New writes are enforced.',
        c.con, c.tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- At most one active player per tournament. Extra legacy actives are demoted
-- to pending (active is transient UI state, nothing is lost).
DO $$
DECLARE
  demoted INTEGER;
BEGIN
  WITH ranked AS (
    SELECT id, row_number() OVER (PARTITION BY tournament_id ORDER BY created_at DESC, id) AS rn
    FROM public.tournament_players
    WHERE status = 'active'
  ), fixed AS (
    UPDATE public.tournament_players tp
    SET status = 'pending'
    FROM ranked
    WHERE tp.id = ranked.id AND ranked.rn > 1
    RETURNING tp.id
  )
  SELECT count(*) INTO demoted FROM fixed;
  IF demoted > 0 THEN
    RAISE WARNING '% legacy tournament_players rows were active concurrently and were demoted to pending', demoted;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_players_one_active_per_tournament
  ON public.tournament_players (tournament_id) WHERE status = 'active';

-- ============================================
-- PROFILE PROVISIONING
-- ============================================

-- public.users is created from auth.users so signup works whether or not
-- email confirmation is enabled. Only self-service roles are honoured here;
-- auctioneers are provisioned by a privileged operator:
--   UPDATE public.users SET role = 'auctioneer' WHERE email = '<email>';
-- (run as postgres / service role), after which the user completes
-- POST /api/auctioneers/register.
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role TEXT := NEW.raw_user_meta_data ->> 'role';
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN requested_role IN ('player', 'team_owner') THEN requested_role ELSE 'player' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- ============================================
-- WRITE GUARDS (direct REST writes as anon/authenticated)
-- ============================================

-- Inside SECURITY DEFINER RPCs current_user is the function owner, so these
-- guards only constrain direct PostgREST table writes.
CREATE OR REPLACE FUNCTION private.guard_tournaments_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.auctioneer_id IS DISTINCT FROM OLD.auctioneer_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tournament ownership cannot be transferred';
  END IF;
  IF OLD.status IN ('live', 'completed') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Live or completed tournaments can only be changed through auction operations';
  END IF;
  IF NEW.status IN ('live', 'completed') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Use the auction start/complete operations to change this status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tournaments_update ON public.tournaments;
CREATE TRIGGER guard_tournaments_update
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION private.guard_tournaments_update();

CREATE OR REPLACE FUNCTION private.guard_teams_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  t public.tournaments%ROWTYPE;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM public.tournaments WHERE id = NEW.tournament_id;
  IF TG_OP = 'INSERT' THEN
    IF t.status NOT IN ('published', 'registering') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tournament is not open for team registration';
    END IF;
    IF NEW.budget <> t.budget_per_team OR COALESCE(NEW.spent, 0) <> 0 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Team budget is fixed by the tournament';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.budget IS DISTINCT FROM OLD.budget
     OR NEW.spent IS DISTINCT FROM OLD.spent THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Team budget, spend and ownership cannot be edited directly';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND t.status NOT IN ('published', 'registering') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Team status is frozen once the auction has started';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_teams_write ON public.teams;
CREATE TRIGGER guard_teams_write
  BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION private.guard_teams_write();

CREATE OR REPLACE FUNCTION private.guard_player_interests_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tournament_id UUID := COALESCE(NEW.tournament_id, OLD.tournament_id);
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND (
       NEW.player_id IS DISTINCT FROM OLD.player_id
       OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Interest ownership cannot be changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.status IN ('published', 'registering')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tournament is not open for player registration';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS guard_player_interests_write ON public.player_interests;
CREATE TRIGGER guard_player_interests_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.player_interests
  FOR EACH ROW EXECUTE FUNCTION private.guard_player_interests_write();

CREATE OR REPLACE FUNCTION private.guard_tournament_players_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tournament_status TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT status INTO tournament_status
  FROM public.tournaments WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
  IF tournament_status = 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Completed tournaments are read-only';
  END IF;
  IF TG_OP = 'UPDATE' AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.auction_round IS DISTINCT FROM OLD.auction_round
       OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
       OR NEW.player_id IS DISTINCT FROM OLD.player_id
       OR (tournament_status = 'live' AND NEW.base_price IS DISTINCT FROM OLD.base_price)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Auction state can only be changed through auction operations';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'New tournament players must be pending';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only pending players can be removed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS guard_tournament_players_write ON public.tournament_players;
CREATE TRIGGER guard_tournament_players_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_players
  FOR EACH ROW EXECUTE FUNCTION private.guard_tournament_players_write();

-- ============================================
-- TABLE PRIVILEGES: RPC-only tables
-- ============================================

REVOKE UPDATE, DELETE ON public.users FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bids FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_sales FROM anon, authenticated;

-- ============================================
-- RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role IN ('player', 'team_owner')
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Players can insert their own profile" ON public.players;
CREATE POLICY "Players can insert their own profile"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.current_user_role() = 'player');

DROP POLICY IF EXISTS "Players can update their own profile" ON public.players;
CREATE POLICY "Players can update their own profile"
  ON public.players FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auctioneers can insert their own profile" ON public.auctioneers;
CREATE POLICY "Auctioneers can insert their own profile"
  ON public.auctioneers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.current_user_role() = 'auctioneer');

DROP POLICY IF EXISTS "Auctioneers can update their own profile" ON public.auctioneers;
CREATE POLICY "Auctioneers can update their own profile"
  ON public.auctioneers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auctioneers can update their own tournaments" ON public.tournaments;
CREATE POLICY "Auctioneers can update their own tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (auctioneer_id IN (SELECT id FROM public.auctioneers WHERE user_id = auth.uid()))
  WITH CHECK (auctioneer_id IN (SELECT id FROM public.auctioneers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Team owners can create teams" ON public.teams;
CREATE POLICY "Team owners can create teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.current_user_role() = 'team_owner');

DROP POLICY IF EXISTS "Team owners can update their own teams" ON public.teams;
CREATE POLICY "Team owners can update their own teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Players can manage their own interests" ON public.player_interests;
CREATE POLICY "Players can manage their own interests"
  ON public.player_interests FOR ALL TO authenticated
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()))
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Auctioneers can manage tournament players" ON public.tournament_players;
CREATE POLICY "Auctioneers can manage tournament players"
  ON public.tournament_players FOR ALL TO authenticated
  USING (
    tournament_id IN (
      SELECT t.id FROM public.tournaments t
      JOIN public.auctioneers a ON a.id = t.auctioneer_id
      WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT t.id FROM public.tournaments t
      JOIN public.auctioneers a ON a.id = t.auctioneer_id
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auctioneers can create bids" ON public.bids;
DROP POLICY IF EXISTS "Auctioneers can manage player sales" ON public.player_sales;

-- ============================================
-- STORAGE
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('player-profiles', 'player-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('team-logos', 'team-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload player profile images" ON storage.objects;
CREATE POLICY "Users can upload their own player profile images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'player-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own player profile images" ON storage.objects;
CREATE POLICY "Users can update their own player profile images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'player-profiles' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'player-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own player profile images" ON storage.objects;
CREATE POLICY "Users can delete their own player profile images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'player-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION private.owns_team_logo_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id::text = (storage.foldername(object_name))[1]
      AND t.owner_id = auth.uid()
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_team_logo_path(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
CREATE POLICY "Anyone can view team logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-logos');

DROP POLICY IF EXISTS "Team owners can upload their team logo" ON storage.objects;
CREATE POLICY "Team owners can upload their team logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-logos' AND private.owns_team_logo_path(name));

DROP POLICY IF EXISTS "Team owners can update their team logo" ON storage.objects;
CREATE POLICY "Team owners can update their team logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos' AND private.owns_team_logo_path(name))
  WITH CHECK (bucket_id = 'team-logos' AND private.owns_team_logo_path(name));

DROP POLICY IF EXISTS "Team owners can delete their team logo" ON storage.objects;
CREATE POLICY "Team owners can delete their team logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos' AND private.owns_team_logo_path(name));
