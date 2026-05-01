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
--    The existing UPDATE policy is column-blind: any authenticated client
--    can `update({ is_premium: true })` on their own row from supabase-js
--    using the public anon key. We revoke UPDATE on the entitlement
--    columns from the `authenticated` role so that path returns
--    "permission denied for column is_premium" (or silently no-ops, depending
--    on supabase-js error mode). The Express backend uses the service-role
--    key, which has all column privileges and is unaffected.
-- =====================================================================
REVOKE UPDATE (
    is_premium,
    subscription_tier,
    subscription_expires_at,
    entitlement_source,
    revenuecat_app_user_id,
    is_admin
) ON public.users FROM authenticated;

-- Anon clients (signed-out) should never have been able to update users
-- anyway, but belt-and-braces:
REVOKE UPDATE (
    is_premium,
    subscription_tier,
    subscription_expires_at,
    entitlement_source,
    revenuecat_app_user_id,
    is_admin
) ON public.users FROM anon;

-- =====================================================================
-- Verification
-- =====================================================================
-- Should return: rls=t, rls=t for both tables.
SELECT relname, relrowsecurity AS rls
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('redemption_codes', 'redemption_code_uses')
ORDER BY relname;

-- Should NOT include `is_premium`, `subscription_tier`, etc. in privilege_type=UPDATE
-- for grantee=authenticated. Other columns (name, email, etc.) still appear.
SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name   = 'users'
  AND grantee      = 'authenticated'
  AND privilege_type = 'UPDATE'
  AND column_name IN (
    'is_premium','subscription_tier','subscription_expires_at',
    'entitlement_source','revenuecat_app_user_id','is_admin'
  )
ORDER BY column_name;
-- ^ expect 0 rows.
