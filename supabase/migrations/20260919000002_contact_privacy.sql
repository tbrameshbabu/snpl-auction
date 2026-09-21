CREATE TABLE public.profile_contacts (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_kind TEXT NOT NULL CHECK (profile_kind IN ('player', 'auctioneer')),
  phone TEXT,
  PRIMARY KEY (user_id, profile_kind)
);

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;

CREATE POLICY "Profile owners can read their contacts"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Tournament auctioneers can read participating player contacts"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (
    profile_kind = 'player'
    AND (SELECT public.current_user_role()) = 'auctioneer'
    AND EXISTS (
      SELECT 1
      FROM public.players p
      JOIN public.player_interests pi ON pi.player_id = p.id
      JOIN public.tournaments t ON t.id = pi.tournament_id
      JOIN public.auctioneers a ON a.id = t.auctioneer_id
      WHERE p.user_id = profile_contacts.user_id
        AND pi.status IN ('interested', 'confirmed')
        AND t.status <> 'cancelled'
        AND a.user_id = (SELECT auth.uid())
    )
  );

INSERT INTO public.profile_contacts (user_id, profile_kind, phone)
SELECT user_id, 'player', phone FROM public.players WHERE phone IS NOT NULL
UNION ALL
SELECT user_id, 'auctioneer', phone FROM public.auctioneers WHERE phone IS NOT NULL;

UPDATE public.players SET phone = NULL WHERE phone IS NOT NULL;
UPDATE public.auctioneers SET phone = NULL WHERE phone IS NOT NULL;

ALTER TABLE public.players ADD CONSTRAINT players_phone_private CHECK (phone IS NULL);
ALTER TABLE public.auctioneers ADD CONSTRAINT auctioneers_phone_private CHECK (phone IS NULL);

-- Legacy profile writes accept phone; public rows and their WAL never retain it.
CREATE FUNCTION private.store_profile_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  kind TEXT := CASE TG_TABLE_NAME WHEN 'players' THEN 'player' ELSE 'auctioneer' END;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.profile_contacts
    WHERE user_id = OLD.user_id AND profile_kind = kind;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' OR NEW.phone IS NOT NULL THEN
    INSERT INTO public.profile_contacts (user_id, profile_kind, phone)
    VALUES (NEW.user_id, kind, NEW.phone)
    ON CONFLICT (user_id, profile_kind) DO UPDATE SET phone = EXCLUDED.phone;
  END IF;

  NEW.phone := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.store_profile_contact() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER store_player_contact
  BEFORE INSERT OR UPDATE OF phone ON public.players
  FOR EACH ROW EXECUTE FUNCTION private.store_profile_contact();

CREATE TRIGGER delete_player_contact
  AFTER DELETE ON public.players
  FOR EACH ROW EXECUTE FUNCTION private.store_profile_contact();

CREATE TRIGGER store_auctioneer_contact
  BEFORE INSERT OR UPDATE OF phone ON public.auctioneers
  FOR EACH ROW EXECUTE FUNCTION private.store_profile_contact();

CREATE TRIGGER delete_auctioneer_contact
  AFTER DELETE ON public.auctioneers
  FOR EACH ROW EXECUTE FUNCTION private.store_profile_contact();
