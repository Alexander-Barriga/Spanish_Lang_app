import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={[colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.mascotContainer}>
            <Text style={styles.mascotEmoji}>🐺</Text>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>¡Hola!</Text>
            </View>
          </View>

          <View>
            <Text style={styles.title}>LoboLingo</Text>
            <Text style={styles.subtitle}>
              Master Spanish through{'\n'}
              <Text style={styles.subtitleAccent}>real conversations</Text>
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem 
            icon="🎙️" 
            title="Voice-First" 
            description="Practice speaking naturally" 
          />
          <FeatureItem 
            icon="🧠" 
            title="AI-Powered" 
            description="Smart corrections & feedback" 
          />
          <FeatureItem 
            icon="🎭" 
            title="Role Play" 
            description="Practice any scenario" 
          />
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <Link href="/(auth)/signup" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          </Link>
          
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                Already have an account? <Text style={styles.linkText}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FeatureItem({ icon, title, description }: { 
  icon: string; 
  title: string; 
  description: string; 
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
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
  mascotContainer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  mascotEmoji: {
    fontSize: 80,
  },
  speechBubble: {
    position: 'absolute',
    top: -10,
    right: -30,
    backgroundColor: colors.primary.gold,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.lg,
    transform: [{ rotate: '12deg' }],
  },
  speechText: {
    ...textStyles.label,
    color: colors.neutral[900],
    fontWeight: '700',
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
  featureIcon: {
    fontSize: 28,
    marginRight: spacing[4],
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

