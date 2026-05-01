-- =====================================================================
-- 2026-04-30 paywall RLS hardening
-- =====================================================================
-- Run after `2026-04-30-paywall.sql`.
--
-- 1) Lock down the two redemption tables. Only the Express backend
--    (service-role key) ever touches them; the mobile client uses the
--    /api/v1/redemption/redeem endpoint, never the table directly. RLS
--    enabled with no policies = deny-all for anon/authenticated. Service
--    role bypasses RLS unconditionally so the backend keeps working.
--
--    NOTE: if you already clicked "Yes" on Supabase's RLS prompt when the
--    tables were created, the next two ALTER TABLE statements are no-ops.
-- =====================================================================
ALTER TABLE public.redemption_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_code_uses  ENABLE ROW LEVEL SECURITY;

-- 2) Plug the paywall self-promotion bypass on public.users.
--    The existing UPDATE RLS policy ("Users can update their own profile")
--    is column-blind: any authenticated client can
--    `update({ is_premium: true })` on their own row from supabase-js
--    using the public anon key. We close that path by revoking UPDATE on
--    public.users at the TABLE level.
--
--    Postgres gotcha (the reason we revoke at table-level rather than
--    column-level here): a role's UPDATE access is the union of its
--    table-level and column-level grants. If the role already has
--    table-level UPDATE, a column-level REVOKE (...) is a no-op — the
--    table-level grant still covers every column. Supabase's bootstrap
--    runs the equivalent of:
--        GRANT SELECT, INSERT, UPDATE, DELETE
--          ON ALL TABLES IN SCHEMA public TO authenticated;
--    so we have to revoke at the table level for the change to bite.
--
--    Safe in our codebase because the mobile client never writes to
--    public.users directly — it only SELECTs (see mobile/src/contexts/
--    AuthContext.tsx:109). Every write path goes through the Express
--    backend using the service-role key, which bypasses both grants and
--    RLS. If you ever add a client-driven profile-edit flow, route it
--    through the backend or grant UPDATE back on a specific column list.
-- =====================================================================
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;

-- The "Users can update their own profile" RLS policy is now unreachable
-- (no role outside service_role can issue an UPDATE that would invoke
-- it), but it does no harm. Uncomment to drop it for hygiene:
-- DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- =====================================================================
-- Verification
-- =====================================================================

-- 1) Both redemption tables should have RLS enabled.
--    Expect: 2 rows, rls=t, rls=t.
SELECT relname, relrowsecurity AS rls
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('redemption_codes', 'redemption_code_uses')
ORDER BY relname;

-- 2) authenticated/anon should no longer have TABLE-level UPDATE on users.
--    This is the check that would have caught the original column-only
--    REVOKE bug: column_privileges is a union of table-level and
--    column-level grants, so it can read "no UPDATE on entitlement cols"
--    even while the table-level grant still effectively allows it.
--    Expect: 0 rows.
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name   = 'users'
  AND grantee      IN ('authenticated', 'anon')
  AND privilege_type = 'UPDATE';

-- 3) Defensive: column-level UPDATE for the entitlement columns should
--    also be absent. With table-level UPDATE revoked this is implied,
--    but checking keeps us honest if someone re-grants table-level
--    UPDATE later without thinking about which columns to omit.
--    Expect: 0 rows.
SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name   = 'users'
  AND grantee      IN ('authenticated', 'anon')
  AND privilege_type = 'UPDATE'
  AND column_name IN (
    'is_premium','subscription_tier','subscription_expires_at',
    'entitlement_source','revenuecat_app_user_id','is_admin'
  )
ORDER BY column_name;
