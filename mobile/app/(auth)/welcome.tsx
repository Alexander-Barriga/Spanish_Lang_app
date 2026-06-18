import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

const R2_BASE_URL = 'https://pub-eaa84f1d0f9b40b8b0fb15b73338527c.r2.dev';

export default function WelcomeScreen() {
  const { signInAnonymously } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const handleGetStarted = async () => {
    setIsStarting(true);
    try {
      await signInAnonymously();
      router.replace('/(auth)/onboarding');
    } catch (error) {
      console.error('Guest sign-in error:', error);
      Alert.alert('Something went wrong', 'Please try again in a moment.');
      setIsStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: `${R2_BASE_URL}/other_videos/Sign_in_video.mp4` }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>Spanish Lab</Text>
          <Text style={styles.subtitle}>
            Master Spanish Subjunctive with{'\n'}
            <Text style={styles.subtitleAccent}>Story based writing and conversations.</Text>
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            title="AI Conversations"
            description="Practice grammar through real-time dialogue"
          />
          <FeatureItem
            title="Smart Feedback"
            description="Personalized writing & grammar corrections"
          />
          <FeatureItem
            title="Story-Based Learning"
            description="Explore Buenos Aires"
          />
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <Pressable style={styles.primaryButton} onPress={handleGetStarted} disabled={isStarting}>
            {isStarting ? (
              <ActivityIndicator color={colors.neutral[900]} />
            ) : (
              <Text style={styles.primaryButtonText}>Get Started</Text>
            )}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.secondaryButton} disabled={isStarting}>
              <Text style={styles.secondaryButtonText}>
                Already have an account? <Text style={styles.linkText}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({ title, description }: { 
  title: string; 
  description: string; 
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing[10],
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitleAccent: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  featuresContainer: {
    paddingVertical: spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  featureDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  ctaContainer: {
    paddingBottom: spacing[8],
  },
  primaryButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  primaryButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  secondaryButtonText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  linkText: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
});
