-- Diagnose schema visibility issue (simplified)

-- 1. Check what schema these tables are actually in
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('story_arcs', 'episodes', 'pre_generated_audio', 'users', 'conversations')
ORDER BY table_schema, table_name;

-- 2. Check table ownership
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('story_arcs', 'episodes', 'pre_generated_audio', 'users')
ORDER BY tablename;

-- 3. Check role grants on the tables
SELECT 
    grantee, 
    table_name, 
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges 
WHERE table_name IN ('story_arcs', 'episodes', 'pre_generated_audio')
AND table_schema = 'public'
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

-- 4. Grant to postgres role (the owner role)
GRANT ALL ON public.story_arcs TO postgres;
GRANT ALL ON public.episodes TO postgres;
GRANT ALL ON public.pre_generated_audio TO postgres;
GRANT ALL ON public.user_story_progress TO postgres;
GRANT ALL ON public.episode_attempts TO postgres;
GRANT ALL ON public.journal_entries TO postgres;

-- 5. Also ensure service_role has access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 6. Notify reload
NOTIFY pgrst, 'reload schema';

SELECT 'Grants applied successfully' as status;
