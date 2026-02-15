-- Add logo_url column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for team logos (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);

-- Storage policies (run in Supabase dashboard SQL editor)
-- Allow public read access
-- CREATE POLICY "Public read access for team logos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'team-logos');

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated users can upload team logos" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'team-logos' AND auth.role() = 'authenticated');

-- Allow users to update/delete their own uploads
-- CREATE POLICY "Users can update own team logos" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'team-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own team logos" ON storage.objects
--   FOR DELETE USING (bucket_id = 'team-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
