import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function ArticlesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Articles</Text>
        <Text style={styles.subtitle}>Spanish reading practice</Text>

        {/* Coming Soon Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="book-outline" size={48} color={colors.primary.gold} />
          </View>
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            Curated Spanish articles and reading exercises will appear here.
            Practice your reading comprehension with authentic content.
          </Text>
        </View>

        {/* Feature Preview */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="newspaper-outline" size={20} color={colors.accent.sage} />
            <Text style={styles.featureText}>News articles in Spanish</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="school-outline" size={20} color={colors.accent.tango} />
            <Text style={styles.featureText}>Grammar-focused readings</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="headset-outline" size={20} color={colors.accent.sky} />
            <Text style={styles.featureText}>Audio narration included</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[8],
  },
  comingSoonCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  comingSoonTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  comingSoonText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featureList: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  featureText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginLeft: spacing[3],
  },
});

