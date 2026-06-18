import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, PurchaseKind } from '../src/contexts/SubscriptionContext';
import { colors, textStyles, spacing, borderRadius } from '../src/theme';
import { API_URL } from '../src/config/constants';

const PRIVACY_URL = API_URL.replace('/api/v1', '/privacy');
const TERMS_URL = API_URL.replace('/api/v1', '/terms');

const FALLBACK_MONTHLY_PRICE = '$14.99';
const FALLBACK_ANNUAL_PRICE = '$99.99';

const FEATURES = [
  { icon: 'play-circle' as const, title: 'All 8 Episodes', desc: "Complete Florencia's story in Buenos Aires" },
  { icon: 'create' as const, title: 'Writing Exercises', desc: 'Story-connected prompts with AI feedback' },
  { icon: 'chatbubbles' as const, title: 'AI Conversations', desc: 'Practice grammar through real-time dialogue' },
  { icon: 'newspaper' as const, title: 'Episode Articles', desc: 'Deepen comprehension with reading material' },
];

type SelectedPlan = 'free' | PurchaseKind;

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ source?: string }>();
  const isOnboarding = params.source === 'onboarding';

  const {
    monthlyPackage,
    annualPackage,
    offeringsError,
    isLoading: isLoadingSubscription,
    reloadOfferings,
    purchasePackage,
    restorePurchases,
    isStoreAvailable,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>('annual');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const monthlyPrice = monthlyPackage?.product?.priceString ?? FALLBACK_MONTHLY_PRICE;
  const annualPrice = annualPackage?.product?.priceString ?? FALLBACK_ANNUAL_PRICE;

  /**
   * Best-effort "monthly equivalent" for the annual plan ("$8.33/mo" badge).
   * RevenueCat exposes the price in `product.price` as a number; we divide by
   * 12 and format with the user's locale currency code when available.
   */
  const annualMonthlyEquivalent = useMemo(() => {
    const price = annualPackage?.product?.price;
    const currencyCode = (annualPackage?.product as any)?.currencyCode ?? 'USD';
    if (typeof price === 'number' && price > 0) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(price / 12);
      } catch {
        return `$${(price / 12).toFixed(2)}`;
      }
    }
    return '$8.33';
  }, [annualPackage]);

  const handleClose = () => {
    if (isOnboarding) {
      // Onboarding entry: dismissing means "continue with free tier"
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const handleSelectFree = () => {
    setSelectedPlan('free');
  };

  const handleRetryOfferings = async () => {
    setIsReloading(true);
    try {
      await reloadOfferings();
    } finally {
      setIsReloading(false);
    }
  };

  const handlePurchase = async (kind: PurchaseKind) => {
    if (!isStoreAvailable) {
      Alert.alert(
        'Purchases Unavailable',
        'In-app purchases are only available in the App Store or TestFlight build of the app. Please try again there.'
      );
      return;
    }

    const target = kind === 'annual' ? annualPackage : monthlyPackage;
    if (!target) {
      Alert.alert(
        'Plans Unavailable',
        "We couldn't load subscription options. Please check your connection and try again.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleRetryOfferings },
        ]
      );
      return;
    }

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(kind);
      if (success) {
        Alert.alert(
          'Welcome to Spanish Lab Premium!',
          'All episodes are now unlocked. Continue Florencia\'s story.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Purchase Failed', error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePrimaryCta = async () => {
    if (selectedPlan === 'free') {
      router.replace('/(tabs)');
      return;
    }
    await handlePurchase(selectedPlan);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription for your account.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const primaryCtaLabel = selectedPlan === 'free'
    ? 'Continue with Free'
    : isPurchasing
      ? 'Processing…'
      : selectedPlan === 'monthly'
        ? `Subscribe — ${monthlyPrice}/mo`
        : `Subscribe — ${annualPrice}/yr`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.closeButton} onPress={handleClose} accessibilityLabel="Close paywall">
          <Ionicons name="close" size={28} color={colors.text.secondary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Episode 1 is always free. Unlock the full story and AI-powered learning to keep going.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={20} color={colors.primary.gold} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {isStoreAvailable && isLoadingSubscription ? (
          <View style={styles.plansBanner}>
            <ActivityIndicator size="small" color={colors.primary.gold} />
            <Text style={styles.plansBannerText}>Loading plans…</Text>
          </View>
        ) : isStoreAvailable && offeringsError ? (
          <Pressable style={styles.plansBanner} onPress={handleRetryOfferings} disabled={isReloading}>
            {isReloading ? (
              <ActivityIndicator size="small" color={colors.primary.gold} />
            ) : (
              <Ionicons name="refresh" size={16} color={colors.primary.gold} />
            )}
            <Text style={styles.plansBannerText}>
              {isReloading ? 'Loading plans…' : "Couldn't load latest prices — tap to retry"}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.plansContainer}>
          <PlanCard
            label="Annual"
            price={annualPrice}
            period="/year"
            badge="Best Value"
            sublabel={`Just ${annualMonthlyEquivalent}/month, billed yearly`}
            selected={selectedPlan === 'annual'}
            onPress={() => setSelectedPlan('annual')}
            highlight
          />
          <PlanCard
            label="Monthly"
            price={monthlyPrice}
            period="/month"
            sublabel="Cancel anytime"
            selected={selectedPlan === 'monthly'}
            onPress={() => setSelectedPlan('monthly')}
          />
          <PlanCard
            label="Continue Free"
            price="Free"
            period=""
            sublabel="Episode 1 only — paywall unlocks at Episode 2"
            selected={selectedPlan === 'free'}
            onPress={handleSelectFree}
          />
        </View>

        <Pressable onPress={handlePrimaryCta} disabled={isPurchasing} style={styles.subscribeButtonWrapper}>
          <LinearGradient
            colors={selectedPlan === 'free' ? ['#3a4566', '#2a3450'] : ['#00D5FF', '#00B8DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.subscribeButton, isPurchasing && styles.buttonDisabled]}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.neutral[950]} />
            ) : (
              <Text
                style={[
                  styles.subscribeButtonText,
                  selectedPlan === 'free' && styles.subscribeButtonTextOnDark,
                ]}
              >
                {primaryCtaLabel}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.secondaryButton}>
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <Text style={styles.secondaryText}>Restore Purchases</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscription in your device&apos;s Settings &gt; Apple ID &gt; Subscriptions.
          </Text>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDivider}>|</Text>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PlanCardProps {
  label: string;
  price: string;
  period: string;
  sublabel: string;
  badge?: string;
  selected: boolean;
  highlight?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function PlanCard({ label, price, period, sublabel, badge, selected, highlight, disabled, onPress }: PlanCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.planCard,
        highlight && styles.planCardHighlight,
        selected && styles.planCardSelected,
        disabled && styles.planCardDisabled,
      ]}
    >
      <View style={styles.planRow}>
        <View style={styles.planLeft}>
          <View style={styles.planLabelRow}>
            <Text style={styles.planLabel}>{label}</Text>
            {badge ? (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planSubLabel}>{sublabel}</Text>
        </View>
        <View style={styles.planRight}>
          <Text style={styles.planPrice}>
            {price}
            {period ? <Text style={styles.planPeriod}>{period}</Text> : null}
          </Text>
          <View style={[styles.planRadio, selected && styles.planRadioSelected]}>
            {selected ? <View style={styles.planRadioDot} /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing[2],
    marginTop: spacing[2],
  },
  header: {
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureIconContainer: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  featureDesc: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  plansContainer: {
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  plansBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  plansBannerText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontSize: 13,
  },
  planCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planCardHighlight: {
    borderColor: colors.primary.gold + '60',
  },
  planCardSelected: {
    borderColor: colors.primary.gold,
  },
  planCardDisabled: {
    opacity: 0.4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  planLeft: {
    flex: 1,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 2,
  },
  planLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  planBadge: {
    backgroundColor: colors.primary.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  planBadgeText: {
    ...textStyles.caption,
    color: colors.neutral[950],
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  planSubLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  planPrice: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 17,
  },
  planPeriod: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
    fontSize: 13,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    borderColor: colors.primary.gold,
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.gold,
  },
  subscribeButtonWrapper: {
    marginBottom: spacing[3],
  },
  subscribeButton: {
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    ...textStyles.button,
    color: colors.neutral[950],
    fontSize: 17,
    fontWeight: '700',
  },
  subscribeButtonTextOnDark: {
    color: colors.text.primary,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  secondaryButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  secondaryText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legalContainer: {
    alignItems: 'center',
  },
  legalText: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing[3],
    fontSize: 11,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  legalLink: {
    ...textStyles.caption,
    color: colors.primary.gold,
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  legalDivider: {
    color: colors.neutral[600],
    fontSize: 12,
  },
});
