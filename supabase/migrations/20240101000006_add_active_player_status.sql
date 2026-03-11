-- Migration to add 'active' status to tournament_players check constraint

-- Drop the existing constraint
ALTER TABLE tournament_players DROP CONSTRAINT tournament_players_status_check;

-- Add the new constraint with 'active' status included
ALTER TABLE tournament_players ADD CONSTRAINT tournament_players_status_check CHECK (status IN ('pending', 'active', 'sold', 'unsold', 're_auction'));
