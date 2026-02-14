-- Create storage bucket for player profile images

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-profiles', 'player-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Anyone can view player profile images
CREATE POLICY "Anyone can view player profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-profiles');

-- Authenticated users can upload player profile images
CREATE POLICY "Authenticated users can upload player profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'player-profiles' 
    AND auth.role() = 'authenticated'
  );

-- Users can update their own player profile images
CREATE POLICY "Users can update their own player profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'player-profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own player profile images
CREATE POLICY "Users can delete their own player profile images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'player-profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
