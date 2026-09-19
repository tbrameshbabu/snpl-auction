-- Atomic auction operations.
--
-- Every RPC runs as one transaction, locks the tournament row first (then the
-- player, then the team) so all operations on a tournament serialise, and
-- checks that the caller is the tournament's auctioneer.
--
-- Errors use application SQLSTATEs so API routes can map them to HTTP codes
-- without exposing database messages:
--   SN401 unauthenticated, SN403 forbidden, SN404 not found,
--   SN400 invalid input,   SN409 state conflict.

CREATE OR REPLACE FUNCTION private.require_tournament_auctioneer(p_tournament_id UUID)
RETURNS public.tournaments
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SN401', MESSAGE = 'Authentication required';
  END IF;

  SELECT * INTO t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'SN404', MESSAGE = 'Tournament not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.auctioneers a WHERE a.id = t.auctioneer_id AND a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN403', MESSAGE = 'Only the tournament auctioneer can do this';
  END IF;

  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION private.lock_tournament_player(p_tournament_id UUID, p_tournament_player_id UUID)
RETURNS public.tournament_players
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tp public.tournament_players;
BEGIN
  SELECT * INTO tp
  FROM public.tournament_players
  WHERE id = p_tournament_player_id AND tournament_id = p_tournament_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'SN404', MESSAGE = 'Player not found in this tournament';
  END IF;
  RETURN tp;
END;
$$;

CREATE OR REPLACE FUNCTION private.latest_bid(p_tournament_player_id UUID, p_round INTEGER)
RETURNS public.bids
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT * FROM public.bids
  WHERE tournament_player_id = p_tournament_player_id AND round = p_round
  ORDER BY amount DESC, created_at DESC, id DESC
  LIMIT 1;
$$;

-- Mirrors the auctioneer UI increment ladder.
CREATE OR REPLACE FUNCTION private.bid_increment(current_amount INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN current_amount < 100 THEN 10
    WHEN current_amount < 300 THEN 20
    WHEN current_amount < 500 THEN 25
    ELSE 50
  END;
$$;

CREATE OR REPLACE FUNCTION private.team_sold_count(p_team_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT count(*)::INTEGER FROM public.player_sales WHERE team_id = p_team_id AND status = 'sold';
$$;

-- ============================================
-- start
-- ============================================

CREATE OR REPLACE FUNCTION public.start_auction(p_tournament_id UUID)
RETURNS public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);

  IF t.status = 'live' THEN
    RETURN t;
  END IF;
  IF t.status NOT IN ('published', 'registering') THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = format('Cannot start auction: tournament is %s', t.status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teams WHERE tournament_id = t.id AND status <> 'withdrawn'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Cannot start auction: no teams registered';
  END IF;

  -- Seed interested players not already queued (rows created when the
  -- auctioneer saved a player order are kept, new ones go to the end).
  INSERT INTO public.tournament_players (tournament_id, player_id, base_price, order_index, status)
  SELECT
    t.id,
    pi.player_id,
    GREATEST(COALESCE(p.base_points, 100), 1),
    (SELECT COALESCE(MAX(order_index), 0) FROM public.tournament_players WHERE tournament_id = t.id)
      + row_number() OVER (ORDER BY pi.created_at, pi.id),
    'pending'
  FROM public.player_interests pi
  JOIN public.players p ON p.id = pi.player_id
  WHERE pi.tournament_id = t.id
    AND pi.status IN ('interested', 'confirmed')
    AND NOT EXISTS (
      SELECT 1 FROM public.tournament_players tp
      WHERE tp.tournament_id = t.id AND tp.player_id = pi.player_id
    );

  IF NOT EXISTS (SELECT 1 FROM public.tournament_players WHERE tournament_id = t.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'No interested players found for this tournament';
  END IF;

  UPDATE public.tournaments SET status = 'live' WHERE id = t.id RETURNING * INTO t;
  RETURN t;
END;
$$;

-- ============================================
-- activate
-- ============================================

CREATE OR REPLACE FUNCTION public.activate_player(p_tournament_id UUID, p_tournament_player_id UUID)
RETURNS public.tournament_players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
  tp public.tournament_players;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;

  tp := private.lock_tournament_player(p_tournament_id, p_tournament_player_id);
  IF tp.status = 'active' THEN
    RETURN tp;
  END IF;
  IF tp.status NOT IN ('pending', 're_auction') THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = format('Player is already %s', tp.status);
  END IF;

  UPDATE public.tournament_players
  SET status = 'pending'
  WHERE tournament_id = t.id AND status = 'active';

  -- A new round: bids from any earlier activation are no longer current.
  UPDATE public.tournament_players
  SET status = 'active', auction_round = auction_round + 1
  WHERE id = tp.id
  RETURNING * INTO tp;

  RETURN tp;
END;
$$;

-- ============================================
-- bid
-- ============================================

CREATE OR REPLACE FUNCTION public.place_bid(
  p_tournament_id UUID,
  p_tournament_player_id UUID,
  p_team_id UUID,
  p_amount INTEGER
)
RETURNS public.bids
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
  tp public.tournament_players;
  team public.teams;
  current_bid public.bids;
  minimum INTEGER;
  bid public.bids;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;

  tp := private.lock_tournament_player(p_tournament_id, p_tournament_player_id);
  IF tp.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Player is not up for auction';
  END IF;

  SELECT * INTO team FROM public.teams
  WHERE id = p_team_id AND tournament_id = t.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'SN404', MESSAGE = 'Team not found in this tournament';
  END IF;
  IF team.status = 'withdrawn' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Team has withdrawn from the tournament';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'SN400', MESSAGE = 'Bid amount must be a positive integer';
  END IF;

  current_bid := private.latest_bid(tp.id, tp.auction_round);
  IF current_bid.id IS NULL THEN
    minimum := tp.base_price;
  ELSE
    minimum := current_bid.amount + private.bid_increment(current_bid.amount);
  END IF;
  IF p_amount < minimum THEN
    RAISE EXCEPTION USING ERRCODE = 'SN400', MESSAGE = format('Bid must be at least %s', minimum);
  END IF;

  IF p_amount > team.budget - COALESCE(team.spent, 0) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Bid exceeds the team''s remaining budget';
  END IF;
  IF private.team_sold_count(team.id) >= t.num_players_per_team THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Team roster is full';
  END IF;

  INSERT INTO public.bids (tournament_id, tournament_player_id, team_id, amount, round)
  VALUES (t.id, tp.id, team.id, p_amount, tp.auction_round)
  RETURNING * INTO bid;

  RETURN bid;
END;
$$;

-- ============================================
-- sold
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_player_sold(
  p_tournament_id UUID,
  p_tournament_player_id UUID,
  p_team_id UUID,
  p_final_price INTEGER
)
RETURNS public.player_sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
  tp public.tournament_players;
  team public.teams;
  winning public.bids;
  sale public.player_sales;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;

  tp := private.lock_tournament_player(p_tournament_id, p_tournament_player_id);

  IF tp.status = 'sold' THEN
    SELECT * INTO sale FROM public.player_sales WHERE tournament_player_id = tp.id;
    IF sale.status = 'sold' AND sale.team_id = p_team_id AND sale.final_price = p_final_price THEN
      RETURN sale;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Player has already been sold';
  END IF;
  IF tp.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Player is not up for auction';
  END IF;

  winning := private.latest_bid(tp.id, tp.auction_round);
  IF winning.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'No bids have been placed for this player';
  END IF;
  IF winning.team_id IS DISTINCT FROM p_team_id OR winning.amount IS DISTINCT FROM p_final_price THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Winner or price does not match the latest bid';
  END IF;

  SELECT * INTO team FROM public.teams WHERE id = winning.team_id FOR UPDATE;
  IF team.budget - COALESCE(team.spent, 0) < winning.amount THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Team cannot afford the winning bid';
  END IF;
  IF private.team_sold_count(team.id) >= t.num_players_per_team THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Team roster is full';
  END IF;

  IF EXISTS (SELECT 1 FROM public.player_sales WHERE tournament_player_id = tp.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'A sale record already exists for this player';
  END IF;

  INSERT INTO public.player_sales (tournament_id, tournament_player_id, team_id, final_price, status)
  VALUES (t.id, tp.id, team.id, winning.amount, 'sold')
  RETURNING * INTO sale;

  UPDATE public.teams SET spent = COALESCE(spent, 0) + winning.amount WHERE id = team.id;
  UPDATE public.tournament_players SET status = 'sold' WHERE id = tp.id;

  RETURN sale;
END;
$$;

-- ============================================
-- unsold
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_player_unsold(p_tournament_id UUID, p_tournament_player_id UUID)
RETURNS public.player_sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
  tp public.tournament_players;
  sale public.player_sales;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;

  tp := private.lock_tournament_player(p_tournament_id, p_tournament_player_id);

  IF tp.status = 'unsold' THEN
    SELECT * INTO sale FROM public.player_sales WHERE tournament_player_id = tp.id;
    IF sale.status = 'unsold' THEN
      RETURN sale;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Player sale record is inconsistent';
  END IF;
  IF tp.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Player is not up for auction';
  END IF;

  IF EXISTS (SELECT 1 FROM public.player_sales WHERE tournament_player_id = tp.id) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'A sale record already exists for this player';
  END IF;

  INSERT INTO public.player_sales (tournament_id, tournament_player_id, team_id, final_price, status)
  VALUES (t.id, tp.id, NULL, NULL, 'unsold')
  RETURNING * INTO sale;

  UPDATE public.tournament_players SET status = 'unsold' WHERE id = tp.id;

  RETURN sale;
END;
$$;

-- ============================================
-- re-auction
-- ============================================

-- Puts every unsold player back in the pool. Their unsold result rows are
-- removed (the outcome is superseded) and activation starts a fresh bid round,
-- so earlier bids are never treated as current.
CREATE OR REPLACE FUNCTION public.re_auction_unsold(p_tournament_id UUID)
RETURNS SETOF public.tournament_players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;

  PERFORM 1 FROM public.tournament_players
  WHERE tournament_id = t.id AND status = 'unsold'
  FOR UPDATE;

  DELETE FROM public.player_sales ps
  USING public.tournament_players tp
  WHERE ps.tournament_player_id = tp.id
    AND tp.tournament_id = t.id
    AND tp.status = 'unsold'
    AND ps.status = 'unsold';

  RETURN QUERY
  UPDATE public.tournament_players
  SET status = 're_auction'
  WHERE tournament_id = t.id AND status = 'unsold'
  RETURNING *;
END;
$$;

-- ============================================
-- complete
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_auction(p_tournament_id UUID)
RETURNS public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.tournaments;
BEGIN
  t := private.require_tournament_auctioneer(p_tournament_id);
  IF t.status = 'completed' THEN
    RETURN t;
  END IF;
  IF t.status <> 'live' THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Auction is not live';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tournament_players WHERE tournament_id = t.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'SN409', MESSAGE = 'Finish the current player before completing the auction';
  END IF;

  UPDATE public.tournaments SET status = 'completed' WHERE id = t.id RETURNING * INTO t;
  RETURN t;
END;
$$;

-- ============================================
-- GRANTS
-- ============================================

REVOKE ALL ON FUNCTION public.start_auction(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.activate_player(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_bid(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_player_sold(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_player_unsold(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.re_auction_unsold(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_auction(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_auction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_player(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_player_sold(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_player_unsold(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.re_auction_unsold(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_auction(UUID) TO authenticated;
