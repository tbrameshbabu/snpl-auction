-- Enable Row Level Security on all tables

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctioneers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================

CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================
-- PLAYERS POLICIES
-- ============================================

CREATE POLICY "Anyone can view players" 
  ON players FOR SELECT 
  USING (true);

CREATE POLICY "Players can insert their own profile" 
  ON players FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own profile" 
  ON players FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- AUCTIONEERS POLICIES
-- ============================================

CREATE POLICY "Anyone can view auctioneers" 
  ON auctioneers FOR SELECT 
  USING (true);

CREATE POLICY "Auctioneers can insert their own profile" 
  ON auctioneers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auctioneers can update their own profile" 
  ON auctioneers FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- TOURNAMENTS POLICIES
-- ============================================

CREATE POLICY "Anyone can view published tournaments" 
  ON tournaments FOR SELECT 
  USING (status != 'draft');

CREATE POLICY "Auctioneers can view their own tournaments" 
  ON tournaments FOR SELECT 
  USING (
    auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
  );

CREATE POLICY "Auctioneers can create tournaments" 
  ON tournaments FOR INSERT 
  WITH CHECK (
    auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
  );

CREATE POLICY "Auctioneers can update their own tournaments" 
  ON tournaments FOR UPDATE 
  USING (
    auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
  );

CREATE POLICY "Auctioneers can delete their own draft tournaments" 
  ON tournaments FOR DELETE 
  USING (
    auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid()) 
    AND status = 'draft'
  );

-- ============================================
-- TEAMS POLICIES
-- ============================================

CREATE POLICY "Anyone can view teams" 
  ON teams FOR SELECT 
  USING (true);

CREATE POLICY "Team owners can create teams" 
  ON teams FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their own teams" 
  ON teams FOR UPDATE 
  USING (auth.uid() = owner_id);

-- ============================================
-- PLAYER INTERESTS POLICIES
-- ============================================

CREATE POLICY "Anyone can view player interests" 
  ON player_interests FOR SELECT 
  USING (true);

CREATE POLICY "Players can manage their own interests" 
  ON player_interests FOR ALL 
  USING (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- ============================================
-- TOURNAMENT PLAYERS POLICIES
-- ============================================

CREATE POLICY "Anyone can view tournament players" 
  ON tournament_players FOR SELECT 
  USING (true);

CREATE POLICY "Auctioneers can manage tournament players" 
  ON tournament_players FOR ALL 
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE auctioneer_id IN (
        SELECT id FROM auctioneers WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- BIDS POLICIES
-- ============================================

CREATE POLICY "Anyone can view bids" 
  ON bids FOR SELECT 
  USING (true);

CREATE POLICY "Auctioneers can create bids" 
  ON bids FOR INSERT 
  WITH CHECK (
    tournament_id IN (
      SELECT id FROM tournaments WHERE auctioneer_id IN (
        SELECT id FROM auctioneers WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- PLAYER SALES POLICIES
-- ============================================

CREATE POLICY "Anyone can view player sales" 
  ON player_sales FOR SELECT 
  USING (true);

CREATE POLICY "Auctioneers can manage player sales" 
  ON player_sales FOR ALL 
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE auctioneer_id IN (
        SELECT id FROM auctioneers WHERE user_id = auth.uid()
      )
    )
  );
