-- Cricket Auction Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('player', 'team_owner', 'auctioneer')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYER MANAGEMENT
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('batsman', 'bowler', 'all_rounder', 'wicket_keeper')) NOT NULL,
  batting_hand TEXT CHECK (batting_hand IN ('right', 'left')) NOT NULL,
  bowling_hand TEXT CHECK (bowling_hand IN ('right', 'left')) NOT NULL,
  base_points INTEGER DEFAULT 100,
  matches_played INTEGER DEFAULT 0,
  runs_scored INTEGER DEFAULT 0,
  batting_average DECIMAL(5,2),
  wickets_taken INTEGER DEFAULT 0,
  bowling_average DECIMAL(5,2),
  rating DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUCTIONEER MANAGEMENT
-- ============================================

CREATE TABLE auctioneers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURNAMENT MANAGEMENT
-- ============================================

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auctioneer_id UUID REFERENCES auctioneers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  auction_date DATE,
  auction_time TIME,
  duration_minutes INTEGER,
  num_teams INTEGER NOT NULL CHECK (num_teams > 0),
  num_players_per_team INTEGER NOT NULL CHECK (num_players_per_team > 0),
  min_players_per_team INTEGER NOT NULL CHECK (min_players_per_team > 0 AND min_players_per_team <= num_players_per_team),
  budget_per_team INTEGER NOT NULL CHECK (budget_per_team > 0),
  status TEXT CHECK (status IN ('draft', 'published', 'registering', 'live', 'completed', 'cancelled')) DEFAULT 'draft',
  player_list_type TEXT CHECK (player_list_type IN ('system_generated', 'custom')) DEFAULT 'system_generated',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM MANAGEMENT
-- ============================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT CHECK (LENGTH(short_name) <= 3) NOT NULL,
  color TEXT NOT NULL,
  budget INTEGER NOT NULL CHECK (budget > 0),
  spent INTEGER DEFAULT 0 CHECK (spent >= 0),
  status TEXT CHECK (status IN ('interested', 'confirmed', 'withdrawn')) DEFAULT 'interested',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, owner_id),
  UNIQUE(tournament_id, name),
  UNIQUE(tournament_id, short_name)
);

-- ============================================
-- PLAYER PARTICIPATION
-- ============================================

-- Player interest in tournaments
CREATE TABLE player_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('interested', 'withdrawn', 'confirmed')) DEFAULT 'interested',
  bid_preference INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, tournament_id)
);

-- Players in tournament pool
CREATE TABLE tournament_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  base_price INTEGER NOT NULL CHECK (base_price > 0),
  order_index INTEGER,
  status TEXT CHECK (status IN ('pending', 'sold', 'unsold', 're_auction')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- ============================================
-- BIDDING & RESULTS
-- ============================================

-- Bid history
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  tournament_player_id UUID REFERENCES tournament_players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Final auction results
CREATE TABLE player_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  tournament_player_id UUID REFERENCES tournament_players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  final_price INTEGER CHECK (final_price > 0),
  status TEXT CHECK (status IN ('sold', 'unsold')) NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_player_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_auctioneers_user_id ON auctioneers(user_id);
CREATE INDEX idx_tournaments_auctioneer_id ON tournaments(auctioneer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_player_interests_player_id ON player_interests(player_id);
CREATE INDEX idx_player_interests_tournament_id ON player_interests(tournament_id);
CREATE INDEX idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_players_player_id ON tournament_players(player_id);
CREATE INDEX idx_bids_tournament_id ON bids(tournament_id);
CREATE INDEX idx_bids_tournament_player_id ON bids(tournament_player_id);
CREATE INDEX idx_player_sales_tournament_id ON player_sales(tournament_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctioneers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sales ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Players policies
CREATE POLICY "Anyone can view players" ON players FOR SELECT USING (true);
CREATE POLICY "Players can insert their own profile" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update their own profile" ON players FOR UPDATE USING (auth.uid() = user_id);

-- Auctioneers policies
CREATE POLICY "Anyone can view auctioneers" ON auctioneers FOR SELECT USING (true);
CREATE POLICY "Auctioneers can insert their own profile" ON auctioneers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auctioneers can update their own profile" ON auctioneers FOR UPDATE USING (auth.uid() = user_id);

-- Tournaments policies
CREATE POLICY "Anyone can view published tournaments" ON tournaments FOR SELECT USING (status != 'draft');
CREATE POLICY "Auctioneers can view their own tournaments" ON tournaments FOR SELECT USING (
  auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
);
CREATE POLICY "Auctioneers can create tournaments" ON tournaments FOR INSERT WITH CHECK (
  auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
);
CREATE POLICY "Auctioneers can update their own tournaments" ON tournaments FOR UPDATE USING (
  auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid())
);
CREATE POLICY "Auctioneers can delete their own draft tournaments" ON tournaments FOR DELETE USING (
  auctioneer_id IN (SELECT id FROM auctioneers WHERE user_id = auth.uid()) AND status = 'draft'
);

-- Teams policies
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Team owners can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Team owners can update their own teams" ON teams FOR UPDATE USING (auth.uid() = owner_id);

-- Player interests policies
CREATE POLICY "Anyone can view player interests" ON player_interests FOR SELECT USING (true);
CREATE POLICY "Players can manage their own interests" ON player_interests FOR ALL USING (
  player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
);

-- Tournament players policies
CREATE POLICY "Anyone can view tournament players" ON tournament_players FOR SELECT USING (true);
CREATE POLICY "Auctioneers can manage tournament players" ON tournament_players FOR ALL USING (
  tournament_id IN (
    SELECT id FROM tournaments WHERE auctioneer_id IN (
      SELECT id FROM auctioneers WHERE user_id = auth.uid()
    )
  )
);

-- Bids policies
CREATE POLICY "Anyone can view bids" ON bids FOR SELECT USING (true);
CREATE POLICY "Auctioneers can create bids" ON bids FOR INSERT WITH CHECK (
  tournament_id IN (
    SELECT id FROM tournaments WHERE auctioneer_id IN (
      SELECT id FROM auctioneers WHERE user_id = auth.uid()
    )
  )
);

-- Player sales policies
CREATE POLICY "Anyone can view player sales" ON player_sales FOR SELECT USING (true);
CREATE POLICY "Auctioneers can manage player sales" ON player_sales FOR ALL USING (
  tournament_id IN (
    SELECT id FROM tournaments WHERE auctioneer_id IN (
      SELECT id FROM auctioneers WHERE user_id = auth.uid()
    )
  )
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_interests_updated_at BEFORE UPDATE ON player_interests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for player profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-profiles', 'player-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for player profiles
CREATE POLICY "Anyone can view player profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-profiles');

CREATE POLICY "Authenticated users can upload player profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-profiles' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own player profile images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'player-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own player profile images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'player-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);
