import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { SPANISH_LEVELS, CORRECTION_DEPTHS, ACCENT_OPTIONS, TUTOR_CHARACTERS, getTutorById } from '../../src/config/constants';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function ProfileScreen() {
  const { user, signOut, selectedTutorId, setSelectedTutorId } = useAuth();
  const profile = user?.profile;
  const [showTutorPicker, setShowTutorPicker] = useState(false);

  const selectedTutor = getTutorById(selectedTutorId);

  const handleSelectTutor = async (tutorId: string) => {
    await setSelectedTutorId(tutorId);
    setShowTutorPicker(false);
  };

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

  const getSpanishLevelLabel = () => {
    const level = SPANISH_LEVELS.find(l => l.value === profile?.spanish_level);
    return level?.label || 'Not set';
  };

  const getCorrectionDepthLabel = () => {
    const depth = CORRECTION_DEPTHS.find(d => d.value === profile?.correction_depth);
    return depth?.label || 'Standard';
  };

  const getAccentLabel = () => {
    const accent = ACCENT_OPTIONS.find(a => a.value === profile?.accent_preference);
    return accent ? `${accent.flag} ${accent.label}` : '🇲🇽 Mexican Spanish';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View 
         
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>🐺</Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name || user?.email || 'Learner'}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{profile?.spanish_level || 'A1'}</Text>
          </View>
        </View>

        {/* Tutor Character Selection - Featured Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Spanish Tutor</Text>
          
          <Pressable 
            style={styles.tutorCard}
            onPress={() => setShowTutorPicker(true)}
          >
            <View style={styles.tutorCardContent}>
              <View style={[styles.tutorAvatar, { backgroundColor: selectedTutor?.color + '30' }]}>
                <Text style={styles.tutorAvatarEmoji}>{selectedTutor?.avatar}</Text>
              </View>
              <View style={styles.tutorInfo}>
                <View style={styles.tutorNameRow}>
                  <Text style={styles.tutorName}>{selectedTutor?.name}</Text>
                  <Text style={styles.tutorFlag}>{selectedTutor?.flag}</Text>
                </View>
                <Text style={styles.tutorDescription}>{selectedTutor?.shortDescription}</Text>
                <Text style={styles.tutorCountry}>from {selectedTutor?.country}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
            </View>
          </Pressable>
        </View>

        {/* Settings Sections */}
        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Learning Preferences</Text>
          
          <SettingItem 
            icon="school"
            label="Spanish Level"
            value={getSpanishLevelLabel()}
            onPress={() => {/* TODO: Navigate to level picker */}}
          />
          <SettingItem 
            icon="build"
            label="Correction Depth"
            value={getCorrectionDepthLabel()}
            onPress={() => {/* TODO: Navigate to correction picker */}}
          />
          <SettingItem 
            icon="globe"
            label="Accent Preference"
            value={getAccentLabel()}
            onPress={() => {/* TODO: Navigate to accent picker */}}
          />
          <SettingItem 
            icon="speedometer"
            label="Voice Speed"
            value={`${(profile?.voice_speed || 1.0).toFixed(1)}x`}
            onPress={() => {/* TODO: Navigate to speed picker */}}
          />
        </View>

        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <SettingItem 
            icon="notifications"
            label="Notifications"
            value="Enabled"
            onPress={() => {}}
          />
          <SettingItem 
            icon="moon"
            label="Dark Mode"
            value="System"
            onPress={() => {}}
          />
          <SettingItem 
            icon="language"
            label="App Language"
            value="English"
            onPress={() => {}}
          />
        </View>

        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingItem 
            icon="help-circle"
            label="Help Center"
            onPress={() => {}}
          />
          <SettingItem 
            icon="chatbox"
            label="Send Feedback"
            onPress={() => {}}
          />
          <SettingItem 
            icon="document-text"
            label="Terms of Service"
            onPress={() => {}}
          />
          <SettingItem 
            icon="shield-checkmark"
            label="Privacy Policy"
            onPress={() => {}}
          />
        </View>

        {/* Sign Out */}
        <View>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={styles.version}>LoboLingo v1.0.0</Text>
      </ScrollView>

      {/* Tutor Character Picker Modal */}
      <Modal
        visible={showTutorPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTutorPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Tutor</Text>
            <Pressable onPress={() => setShowTutorPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </Pressable>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Each tutor speaks with a different Spanish accent
          </Text>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {TUTOR_CHARACTERS.map((tutor) => (
              <Pressable
                key={tutor.id}
                style={[
                  styles.tutorOption,
                  selectedTutorId === tutor.id && styles.tutorOptionSelected,
                  { borderColor: tutor.color },
                ]}
                onPress={() => handleSelectTutor(tutor.id)}
              >
                <View style={[styles.tutorOptionAvatar, { backgroundColor: tutor.color + '30' }]}>
                  <Text style={styles.tutorOptionEmoji}>{tutor.avatar}</Text>
                </View>
                <View style={styles.tutorOptionInfo}>
                  <View style={styles.tutorOptionNameRow}>
                    <Text style={styles.tutorOptionName}>{tutor.name}</Text>
                    <Text style={styles.tutorOptionFlag}>{tutor.flag}</Text>
                    {selectedTutorId === tutor.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    )}
                  </View>
                  <Text style={styles.tutorOptionDescription}>{tutor.description}</Text>
                  <Text style={styles.tutorOptionPersonality}>{tutor.personality}</Text>
                  <View style={styles.samplePhrasesContainer}>
                    {tutor.samplePhrases.map((phrase, idx) => (
                      <Text key={idx} style={styles.samplePhrase}>"{phrase}"</Text>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SettingItem({ 
  icon, 
  label, 
  value, 
  onPress 
}: { 
  icon: string; 
  label: string; 
  value?: string; 
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon as keyof typeof Ionicons.glyphMap} 
          size={20} 
          color={colors.text.secondary} 
        />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={colors.neutral[500]} />
      </View>
    </Pressable>
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
  // Tutor Card styles
  tutorCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },
  tutorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  tutorAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorAvatarEmoji: {
    fontSize: 28,
  },
  tutorInfo: {
    flex: 1,
  },
  tutorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tutorName: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  tutorFlag: {
    fontSize: 16,
  },
  tutorDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  tutorCountry: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  modalSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  tutorOption: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tutorOptionSelected: {
    borderWidth: 2,
  },
  tutorOptionAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  tutorOptionEmoji: {
    fontSize: 32,
  },
  tutorOptionInfo: {
    flex: 1,
  },
  tutorOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  tutorOptionName: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  tutorOptionFlag: {
    fontSize: 18,
  },
  tutorOptionDescription: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  tutorOptionPersonality: {
    ...textStyles.bodySmall,
    color: colors.neutral[500],
    fontStyle: 'italic',
    marginBottom: spacing[2],
  },
  samplePhrasesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  samplePhrase: {
    ...textStyles.caption,
    color: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    borderWidth: 3,
    borderColor: colors.primary.gold,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  displayName: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  levelBadge: {
    backgroundColor: colors.primary.gold + '20',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary.gold,
  },
  levelText: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  settingLabel: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  settingValue: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
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

