-- Fix missing INSERT policies for users and progress tables
-- Run this in Supabase SQL Editor

-- Allow users to insert their own profile on signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to insert their own progress record on signup
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.progress;
CREATE POLICY "Users can insert their own progress" ON public.progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify policies were created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'progress')
ORDER BY tablename, policyname;

