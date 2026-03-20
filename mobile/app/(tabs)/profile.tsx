import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.displayName}>
            {user?.email || 'Learner'}
          </Text>
        </View>

        <View>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
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
  version: {
    ...textStyles.caption,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[6],
  },
});
