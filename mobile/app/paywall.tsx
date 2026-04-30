import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { colors, textStyles, spacing, borderRadius } from '../src/theme';
import { API_URL } from '../src/config/constants';

const PRIVACY_URL = API_URL.replace('/api/v1', '/privacy');
const TERMS_URL = API_URL.replace('/api/v1', '/terms');

const FEATURES = [
  { icon: 'play-circle' as const, title: 'All 8 Episodes', desc: 'Complete Florencia\'s story in Buenos Aires' },
  { icon: 'create' as const, title: 'Writing Exercises', desc: 'Story-connected prompts with AI feedback' },
  { icon: 'chatbubbles' as const, title: 'AI Conversations', desc: 'Practice grammar through real-time dialogue' },
  { icon: 'newspaper' as const, title: 'Episode Articles', desc: 'Deepen comprehension with reading material' },
];

export default function PaywallScreen() {
  const { currentOffering, purchaseSubscription, restorePurchases } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const priceString = currentOffering?.product?.priceString || '$14.99';

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const success = await purchaseSubscription();
      if (success) {
        Alert.alert('Welcome to Spanish Lab Premium!', 'All episodes are now unlocked.', [
          { text: 'Continue', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription for your account.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text.secondary} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>
            Continue Florencia's story and master Spanish subjunctive
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={22} color={colors.primary.gold} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Monthly</Text>
          <Text style={styles.price}>{priceString}<Text style={styles.pricePeriod}>/month</Text></Text>
          <Text style={styles.freeNote}>Episode 1 is always free</Text>
        </View>

        {/* Subscribe button */}
        <Pressable onPress={handlePurchase} disabled={isPurchasing} style={styles.subscribeButtonWrapper}>
          <LinearGradient
            colors={['#00D5FF', '#00B8DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.subscribeButton, isPurchasing && styles.buttonDisabled]}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.neutral[950]} />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Restore purchases */}
        <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.restoreButton}>
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </Pressable>

        {/* Legal disclosures (required by Apple) */}
        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            Payment is charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscription in your device's Settings {'>'} Apple ID {'>'} Subscriptions.
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
    marginTop: spacing[4],
    marginBottom: spacing[8],
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
    marginBottom: spacing[8],
    gap: spacing[4],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
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
  priceCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[6],
    borderWidth: 2,
    borderColor: colors.primary.gold,
  },
  priceLabel: {
    ...textStyles.overline,
    color: colors.primary.gold,
    marginBottom: spacing[2],
  },
  price: {
    ...textStyles.h1,
    color: colors.text.primary,
    fontSize: 40,
  },
  pricePeriod: {
    ...textStyles.body,
    color: colors.text.tertiary,
    fontSize: 16,
  },
  freeNote: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing[2],
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
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
  },
  restoreText: {
    ...textStyles.body,
    color: colors.text.secondary,
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
