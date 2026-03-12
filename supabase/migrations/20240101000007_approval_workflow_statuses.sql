-- Add pending/approved/rejected statuses for approval workflow

-- teams: drop old constraint, add new one with pending/approved/rejected
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE teams ADD CONSTRAINT teams_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'interested', 'confirmed', 'withdrawn'));

-- player_interests: drop old constraint, add new one with pending/approved/rejected
ALTER TABLE player_interests DROP CONSTRAINT IF EXISTS player_interests_status_check;
ALTER TABLE player_interests ADD CONSTRAINT player_interests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'interested', 'withdrawn', 'confirmed'));
