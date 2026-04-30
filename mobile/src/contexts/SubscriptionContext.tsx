import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';

const REVENUECAT_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY';
const ENTITLEMENT_ID = 'premium';

// RevenueCat's native StoreKit module isn't part of the Expo Go binary, and the
// configured API key may still be a placeholder during development. Skip all
// Purchases.* calls unless we're running in a real build with a real key.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const hasValidApiKey = !REVENUECAT_API_KEY_IOS.startsWith('YOUR_');
const isRevenueCatAvailable = !isExpoGo && hasValidApiKey;

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  currentOffering: PurchasesPackage | null;
  purchaseSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    initRevenueCat();
  }, []);

  useEffect(() => {
    if (user?.id && isRevenueCatAvailable) {
      identifyUser(user.id);
    }
  }, [user?.id]);

  const initRevenueCat = async () => {
    if (!isRevenueCatAvailable) {
      if (isExpoGo) {
        console.log(
          '[Subscription] Skipping RevenueCat init: running inside Expo Go (no native StoreKit). Use a development build to test purchases.'
        );
      } else if (!hasValidApiKey) {
        console.log('[Subscription] Skipping RevenueCat init: API key not configured.');
      }
      setIsLoading(false);
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
      }

      Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
        checkEntitlements(info);
      });

      await loadOfferings();
      await checkSubscriptionStatus();
    } catch (error) {
      console.error('RevenueCat init error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const identifyUser = async (userId: string) => {
    if (!isRevenueCatAvailable) return;
    try {
      await Purchases.logIn(userId);
      await checkSubscriptionStatus();
    } catch (error) {
      console.error('RevenueCat identify error:', error);
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.monthly) {
        setCurrentOffering(offerings.current.monthly);
      } else if (offerings.current?.availablePackages?.length) {
        setCurrentOffering(offerings.current.availablePackages[0]);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      checkEntitlements(customerInfo);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const checkEntitlements = (info: CustomerInfo) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    setIsPremium(!!entitlement);
  };

  const purchaseSubscription = async (): Promise<boolean> => {
    if (!isRevenueCatAvailable) {
      console.warn(
        '[Subscription] purchaseSubscription called but RevenueCat is not available in this environment.'
      );
      return false;
    }
    if (!currentOffering) {
      console.error('No offering available');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(currentOffering);
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement);
      return !!entitlement;
    } catch (error: any) {
      if (error.userCancelled) {
        return false;
      }
      console.error('Purchase error:', error);
      throw error;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!isRevenueCatAvailable) {
      console.warn(
        '[Subscription] restorePurchases called but RevenueCat is not available in this environment.'
      );
      return false;
    }
    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement);
      return !!entitlement;
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        isLoading,
        currentOffering,
        purchaseSubscription,
        restorePurchases,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
