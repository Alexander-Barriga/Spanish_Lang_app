-- Final attempt to fix PostgREST schema cache
-- This uses the pg_notify function which is more reliable

-- 1. Use pg_notify directly (more reliable than NOTIFY)
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config');

-- 2. Check if PostgREST is listening
SELECT * FROM pg_listening_channels();

-- 3. Check the actual function definitions exist
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_%'
ORDER BY routine_name;

-- 4. Grant execute permissions explicitly
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Try creating a very simple test function
CREATE OR REPLACE FUNCTION test_cache_simple()
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $$ SELECT 'cache test works'::text; $$;

-- 6. Notify again
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Done - try testing again in 10 seconds' as status;


