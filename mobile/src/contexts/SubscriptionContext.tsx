import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { api, RedeemCodeResponse } from '../services/api';

/**
 * RevenueCat configuration (from app.json -> extra.revenuecat). All keys default
 * to the placeholder strings in app.json so the app boots cleanly in Expo Go
 * (where the native StoreKit module isn't bundled).
 */
const RC_CONFIG = (Constants.expoConfig?.extra as any)?.revenuecat ?? {};
const REVENUECAT_API_KEY_IOS: string = RC_CONFIG.iosApiKey ?? 'YOUR_REVENUECAT_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID: string = RC_CONFIG.androidApiKey ?? 'YOUR_REVENUECAT_ANDROID_API_KEY';
const ENTITLEMENT_ID: string = RC_CONFIG.entitlementId ?? 'premium';
const MONTHLY_PRODUCT_ID: string = RC_CONFIG.monthlyProductId ?? 'spanishlab_monthly_1499';
const ANNUAL_PRODUCT_ID: string = RC_CONFIG.annualProductId ?? 'spanishlab_annual_9999';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const platformKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
const hasValidApiKey = !!platformKey && !platformKey.startsWith('YOUR_');
const isRevenueCatAvailable = !isExpoGo && hasValidApiKey;

export type PurchaseKind = 'monthly' | 'annual';

export interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  monthlyPackage: PurchasesPackage | null;
  annualPackage: PurchasesPackage | null;
  /** Tier label sourced from server-cached entitlement, falls back to RC. */
  tier: 'free' | 'monthly' | 'annual' | 'comp' | null;
  source: 'revenuecat' | 'comp_code' | 'admin' | null;
  expiresAt: string | null;
  /** True when running in an environment where RC purchases are usable. */
  isStoreAvailable: boolean;
  purchasePackage: (kind: PurchaseKind) => Promise<boolean>;
  /** Legacy helper retained for compatibility — buys the monthly package. */
  purchaseSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  redeemCompCode: (code: string) => Promise<RedeemCodeResponse | null>;
  presentAppleOfferCodeSheet: () => Promise<void>;
  /** Force-refresh both server entitlement and RC customer info. */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/**
 * Picks the canonical monthly / annual packages out of the current offering.
 * Prefers RC's standard buckets (`monthly`, `annual`) and falls back to a
 * product-id match against our App Store Connect identifiers.
 */
const splitOffering = (offering: PurchasesOffering | null): {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
} => {
  if (!offering) return { monthly: null, annual: null };
  const monthly =
    offering.monthly ??
    offering.availablePackages.find((p) => p.product.identifier === MONTHLY_PRODUCT_ID) ??
    null;
  const annual =
    offering.annual ??
    offering.availablePackages.find((p) => p.product.identifier === ANNUAL_PRODUCT_ID) ??
    null;
  return { monthly, annual };
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [rcIsPremium, setRcIsPremium] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    isPremium: boolean;
    tier: 'free' | 'monthly' | 'annual' | 'comp' | null;
    source: 'revenuecat' | 'comp_code' | 'admin' | null;
    expiresAt: string | null;
  } | null>(null);

  const initialized = useRef(false);

  const checkEntitlements = useCallback((info: CustomerInfo) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    setRcIsPremium(!!entitlement);
  }, []);

  const refreshServerStatus = useCallback(async () => {
    // Avoid firing an authenticated request before the user has signed in.
    // Cold-start ordering is: AuthProvider mounts -> SubscriptionProvider
    // mounts -> both run their effects in parallel. Without this guard the
    // very first /subscription/status call hits the backend without a Bearer
    // header and 401s with "No authorization token provided".
    if (!user?.id) return;
    const result = await api.getSubscriptionStatus();
    if (result.data) {
      setServerStatus({
        isPremium: result.data.isPremium,
        tier: result.data.tier,
        source: result.data.source,
        expiresAt: result.data.expiresAt,
      });
    }
  }, [user?.id]);

  const loadOfferings = useCallback(async () => {
    if (!isRevenueCatAvailable) return;
    try {
      const offerings = await Purchases.getOfferings();
      const { monthly, annual } = splitOffering(offerings.current);
      setMonthlyPackage(monthly);
      setAnnualPackage(annual);
    } catch (error) {
      console.error('[Subscription] Error loading offerings:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshServerStatus();
    if (isRevenueCatAvailable) {
      try {
        const info = await Purchases.getCustomerInfo();
        checkEntitlements(info);
      } catch (error) {
        console.error('[Subscription] refresh getCustomerInfo error:', error);
      }
    }
  }, [refreshServerStatus, checkEntitlements]);

  // Init the RevenueCat SDK once on mount. Auth-independent: we configure RC
  // and read its locally-cached customer info regardless of whether the
  // backend session is ready. The server-status fetch is handled by the
  // separate auth-driven effect below.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      if (!isRevenueCatAvailable) {
        if (isExpoGo) {
          console.log('[Subscription] Expo Go detected; RC SDK disabled.');
        } else if (!hasValidApiKey) {
          console.log('[Subscription] RC API key not configured; SDK disabled.');
        }
        setIsLoading(false);
        return;
      }

      try {
        Purchases.configure({ apiKey: platformKey });
        Purchases.addCustomerInfoUpdateListener(checkEntitlements);
        await loadOfferings();
        const info = await Purchases.getCustomerInfo();
        checkEntitlements(info);
      } catch (error) {
        console.error('[Subscription] RevenueCat init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [checkEntitlements, loadOfferings]);

  // Refresh the server-cached entitlement whenever the authenticated user
  // changes (sign-in, sign-out, account switch). On sign-out we clear the
  // cached status so the previous user's entitlement can't leak.
  useEffect(() => {
    if (!user?.id) {
      setServerStatus(null);
      return;
    }
    refreshServerStatus().catch((error) => {
      console.error('[Subscription] refresh on user change error:', error);
    });
  }, [user?.id, refreshServerStatus]);

  // Whenever the authenticated user changes, identify them in RC so purchases
  // can be tied back to our user id. Server-side webhooks key off this.
  useEffect(() => {
    if (!user?.id || !isRevenueCatAvailable) return;
    let cancelled = false;
    (async () => {
      try {
        const { customerInfo } = await Purchases.logIn(user.id);
        if (!cancelled) checkEntitlements(customerInfo);
      } catch (error) {
        console.error('[Subscription] RC logIn error:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, checkEntitlements]);

  const purchasePackage = useCallback(
    async (kind: PurchaseKind): Promise<boolean> => {
      if (!isRevenueCatAvailable) {
        console.warn('[Subscription] purchasePackage: RC SDK unavailable in this build.');
        return false;
      }
      const target = kind === 'annual' ? annualPackage : monthlyPackage;
      if (!target) {
        console.error(`[Subscription] No ${kind} package available.`);
        return false;
      }

      try {
        const { customerInfo } = await Purchases.purchasePackage(target);
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const ok = !!entitlement;
        setRcIsPremium(ok);

        if (ok) {
          // Webhook is the source of truth, but it can lag a few seconds. Pull
          // the server status now so the UI flips immediately. Also refresh
          // the auth user so layout-level gates re-render.
          await Promise.allSettled([refreshServerStatus(), refreshUser()]);
        }
        return ok;
      } catch (error: any) {
        if (error?.userCancelled) return false;
        console.error('[Subscription] Purchase error:', error);
        throw error;
      }
    },
    [annualPackage, monthlyPackage, refreshServerStatus, refreshUser]
  );

  const purchaseSubscription = useCallback(() => purchasePackage('monthly'), [purchasePackage]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isRevenueCatAvailable) return false;
    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const ok = !!entitlement;
      setRcIsPremium(ok);
      if (ok) {
        await Promise.allSettled([refreshServerStatus(), refreshUser()]);
      }
      return ok;
    } catch (error) {
      console.error('[Subscription] Restore error:', error);
      throw error;
    }
  }, [refreshServerStatus, refreshUser]);

  const redeemCompCode = useCallback(
    async (code: string): Promise<RedeemCodeResponse | null> => {
      const trimmed = code.trim();
      if (!trimmed) return null;
      const result = await api.redeemCode(trimmed);
      if (result.data?.ok) {
        await Promise.allSettled([refreshServerStatus(), refreshUser()]);
        return result.data;
      }
      return null;
    },
    [refreshServerStatus, refreshUser]
  );

  const presentAppleOfferCodeSheet = useCallback(async (): Promise<void> => {
    if (!isRevenueCatAvailable || Platform.OS !== 'ios') {
      console.warn('[Subscription] Offer code sheet is iOS + dev-build only.');
      return;
    }
    try {
      // `presentCodeRedemptionSheet` is iOS-specific. Some SDK versions expose
      // it directly on Purchases; others under a static helper. We probe both.
      const PurchasesAny = Purchases as unknown as Record<string, any>;
      if (typeof PurchasesAny.presentCodeRedemptionSheet === 'function') {
        await PurchasesAny.presentCodeRedemptionSheet();
      } else if (typeof PurchasesAny.default?.presentCodeRedemptionSheet === 'function') {
        await PurchasesAny.default.presentCodeRedemptionSheet();
      } else {
        console.warn('[Subscription] presentCodeRedemptionSheet not available in this RC SDK version.');
        return;
      }
      // Sheet returns synchronously; entitlement update flows through the
      // customer-info listener / webhook within a few seconds.
      setTimeout(() => {
        refresh().catch(() => {});
      }, 1500);
    } catch (error) {
      console.error('[Subscription] presentAppleOfferCodeSheet error:', error);
    }
  }, [refresh]);

  // Effective premium = server cache OR RC client view OR admin flag from profile.
  // The server cache is authoritative; RC is the fast-path for instant UI after
  // a fresh purchase, before the webhook fires.
  const isPremium = useMemo(() => {
    if (user?.profile?.is_admin) return true;
    if (serverStatus?.isPremium) return true;
    if (user?.profile?.is_premium) return true;
    return rcIsPremium;
  }, [serverStatus?.isPremium, rcIsPremium, user?.profile?.is_admin, user?.profile?.is_premium]);

  const tier = serverStatus?.tier ?? user?.profile?.subscription_tier ?? null;
  const source = serverStatus?.source ?? user?.profile?.entitlement_source ?? null;
  const expiresAt = serverStatus?.expiresAt ?? user?.profile?.subscription_expires_at ?? null;

  const value = useMemo<SubscriptionContextType>(
    () => ({
      isPremium,
      isLoading,
      monthlyPackage,
      annualPackage,
      tier,
      source,
      expiresAt,
      isStoreAvailable: isRevenueCatAvailable,
      purchasePackage,
      purchaseSubscription,
      restorePurchases,
      redeemCompCode,
      presentAppleOfferCodeSheet,
      refresh,
    }),
    [
      isPremium,
      isLoading,
      monthlyPackage,
      annualPackage,
      tier,
      source,
      expiresAt,
      purchasePackage,
      purchaseSubscription,
      restorePurchases,
      redeemCompCode,
      presentAppleOfferCodeSheet,
      refresh,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
