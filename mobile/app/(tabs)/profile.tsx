import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function ProfileScreen() {
  const { user, isAnonymous, signOut, deleteAccount } = useAuth();
  const { isPremium, restorePurchases } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all of your data, including progress and saved writing. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert('Error', 'Could not delete your account. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.displayName}>
            {user?.email || (isAnonymous ? 'Guest' : 'Learner')}
          </Text>
        </View>

        {/* Guest upgrade prompt — registration is optional */}
        {isAnonymous && (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Save your progress</Text>
            <Text style={styles.guestSubtitle}>
              Create a free account to keep your progress and access it on any device. You can keep using the app as a guest.
            </Text>
            <Pressable style={styles.guestPrimary} onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.guestPrimaryText}>Create Account</Text>
            </Pressable>
            <Pressable style={styles.guestSecondary} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.guestSecondaryText}>Already have an account? Sign In</Text>
            </Pressable>
          </View>
        )}

        {/* Subscription status */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionRow}>
            <Ionicons 
              name={isPremium ? 'star' : 'star-outline'} 
              size={20} 
              color={isPremium ? colors.primary.gold : colors.text.secondary} 
            />
            <Text style={styles.subscriptionText}>
              {isPremium ? 'Premium Subscriber' : 'Free Plan'}
            </Text>
          </View>
          {!isPremium && (
            <Pressable style={styles.upgradeButton} onPress={() => router.push('/paywall')}>
              <Text style={styles.upgradeText}>Upgrade to Premium</Text>
            </Pressable>
          )}
        </View>

        {/* Restore Purchases */}
        <Pressable
          style={styles.restoreButton}
          disabled={isRestoring}
          onPress={async () => {
            setIsRestoring(true);
            try {
              const success = await restorePurchases();
              if (success) {
                Alert.alert('Restored!', 'Your subscription has been restored.');
              } else {
                Alert.alert('No Subscription Found', 'We could not find an active subscription for your account.');
              }
            } catch {
              Alert.alert('Error', 'Could not restore purchases. Please try again.');
            } finally {
              setIsRestoring(false);
            }
          }}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </>
          )}
        </Pressable>

        <View>
          {!isAnonymous && (
            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={styles.deleteText}>Delete Account</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.version}>Spanish Lab v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  displayName: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  subscriptionCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  subscriptionText: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: spacing[3],
    backgroundColor: colors.primary.gold + '20',
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  upgradeText: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
    fontSize: 14,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  restoreText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.error + '15',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
  },
  signOutText: {
    ...textStyles.body,
    color: colors.error,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    marginTop: spacing[3],
  },
  deleteText: {
    ...textStyles.body,
    color: colors.error,
    fontWeight: '600',
  },
  guestCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  guestTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing[1],
  },
  guestSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing[3],
  },
  guestPrimary: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  guestPrimaryText: {
    ...textStyles.body,
    color: colors.neutral[950],
    fontWeight: '700',
    fontSize: 14,
  },
  guestSecondary: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  guestSecondaryText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
  version: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[6],
  },
});
