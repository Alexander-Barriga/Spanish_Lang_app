-- =====================================================================
-- 2026-04-30 paywall migration
-- =====================================================================
-- Adds subscription / entitlement columns to public.users and creates the
-- redemption_codes + redemption_code_uses tables that back the comp-code
-- feature.
--
-- Idempotent: safe to run more than once. Lifted verbatim from the
-- relevant block of backend/supabase-schema.sql so you don't have to
-- paste the full schema (~111KB) into the Supabase SQL editor.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- Verify: rerun `npm run check-migration` (exits 0 when applied).
-- =====================================================================

DO $$
BEGIN
    -- ============================================
    -- Subscription / entitlement columns on users
    -- ============================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_premium') THEN
        ALTER TABLE public.users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='subscription_tier') THEN
        ALTER TABLE public.users ADD COLUMN subscription_tier TEXT
            CHECK (subscription_tier IS NULL OR subscription_tier IN ('free', 'monthly', 'annual', 'comp'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='subscription_expires_at') THEN
        ALTER TABLE public.users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='entitlement_source') THEN
        ALTER TABLE public.users ADD COLUMN entitlement_source TEXT
            CHECK (entitlement_source IS NULL OR entitlement_source IN ('revenuecat', 'comp_code', 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='revenuecat_app_user_id') THEN
        ALTER TABLE public.users ADD COLUMN revenuecat_app_user_id TEXT;
    END IF;
END $$;

-- ============================================
-- REDEMPTION CODES (server-issued comp codes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.redemption_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash TEXT UNIQUE NOT NULL,
    code_kind TEXT NOT NULL DEFAULT 'full_access'
        CHECK (code_kind IN ('full_access', 'percent_off')),
    percent_off INTEGER CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
    max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
    uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    note TEXT,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_redemption_codes_active
    ON public.redemption_codes(code_hash)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.redemption_code_uses (
    code_id UUID NOT NULL REFERENCES public.redemption_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_redemption_code_uses_user_id
    ON public.redemption_code_uses(user_id);

-- ============================================
-- Verify (should return 5 rows + 0 + 0)
-- ============================================
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='users'
  AND column_name IN ('is_premium','subscription_tier','subscription_expires_at','entitlement_source','revenuecat_app_user_id')
ORDER BY column_name;

SELECT count(*) AS redemption_codes_rows FROM public.redemption_codes;
SELECT count(*) AS redemption_code_uses_rows FROM public.redemption_code_uses;
