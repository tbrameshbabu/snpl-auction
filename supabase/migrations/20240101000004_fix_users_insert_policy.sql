-- Fix RLS policy for users table to allow signup
-- This migration adds an INSERT policy for the users table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Allow users to insert their own record during signup
CREATE POLICY "Users can insert their own data" 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);
