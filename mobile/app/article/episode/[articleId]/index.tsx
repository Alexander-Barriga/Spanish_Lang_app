import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { api, EpisodeArticle } from '../../../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../../../src/theme';
import { getCompleteArticleData, CompleteArticleData } from '../../../../src/data/episodeArticles';
import { DialogueExample } from '../../../../src/data/episodeDialogueExamples';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// List of common subjunctive verb patterns to underline
const SUBJUNCTIVE_PATTERNS = [
  // Present subjunctive - common verbs
  /\b(sepas?|entiendas?|sea|estés?|pruebes?|puedas?|bailes?|descubras?|pienses?|conozcas?|traiga|vengas?|vayas?|tengas?|hables?|comas?|vivas?|escribas?|digas?|hagas?|pongas?|salgas?|oigas?|veas?)\b/gi,
  // Present subjunctive - contar, estudiar, llegar, and other -ar verbs
  /\b(cuentes?|cuente|contemos|cuenten|estudies?|estudie|estudiemos|estudien|llegues?|llegue|lleguemos|lleguen|trabajes?|trabaje|trabajemos|trabajen)\b/gi,
  // Perfect subjunctive (haya/hayas + participle)
  /\b(hayas?)\s+(visto|sido|hecho|dicho|tenido|venido|estado|conocido|probado|adivinado|entendido|disfrutado|sentido|podido|aceptado|tomado|prestado)\b/gi,
  // Pluperfect subjunctive (hubiera/hubieras + participle)
  /\b(hubieras?|hubiera)\s+(dicho|sido|aceptado|estado|tenido|conocido|dejado|comprado|venido)\b/gi,
  // Imperfect subjunctive
  /\b(fuera|fueras|fuéramos|tuviera|tuvieras|pudiera|pudieras|estuviera|dijera|contara|transformara|durara|preguntara|conocieras|conociera|pasara)\b/gi,
  // Common subjunctive forms
  /\b(siga|comuniquen|tenga|muevas?|compartamos|haya|animes?|existiera)\b/gi,
];

/**
 * Renders Spanish text with subjunctive verbs underlined in blue
 */
function renderSpanishWithUnderlinedVerbs(text: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let lastIndex = 0;
  let key = 0;
  
  // Find all matches
  const matches: { start: number; end: number; text: string }[] = [];
  
  for (const pattern of SUBJUNCTIVE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }
  }
  
  // Sort by start position and remove overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    if (filteredMatches.length === 0 || match.start >= filteredMatches[filteredMatches.length - 1].end) {
      filteredMatches.push(match);
    }
  }
  
  // Build elements
  for (const match of filteredMatches) {
    if (match.start > lastIndex) {
      elements.push(
        <Text key={key++} style={styles.storyExampleSpanishText}>
          {text.slice(lastIndex, match.start)}
        </Text>
      );
    }
    elements.push(
      <Text key={key++} style={styles.underlinedVerb}>
        {match.text}
      </Text>
    );
    lastIndex = match.end;
  }
  
  if (lastIndex < text.length) {
    elements.push(
      <Text key={key++} style={styles.storyExampleSpanishText}>
        {text.slice(lastIndex)}
      </Text>
    );
  }
  
  return elements.length > 0 ? elements : [<Text key={0} style={styles.storyExampleSpanishText}>{text}</Text>];
}

export default function EpisodeArticleReaderScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const [article, setArticle] = useState<EpisodeArticle | null>(null);
  const [articleData, setArticleData] = useState<CompleteArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readStartTime] = useState(Date.now());
  const [maxScrollPercent, setMaxScrollPercent] = useState(0);
  const [showMoreExamples, setShowMoreExamples] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadArticle();
    return () => {
      trackRead();
    };
  }, [articleId]);

  const loadArticle = async () => {
    if (!articleId) return;
    
    try {
      setIsLoading(true);
      const result = await api.getEpisodeArticle(articleId);
      if (result.data?.article) {
        setArticle(result.data.article);
        
        // Load structured article data based on episode number
        if (result.data.article.episodes?.episode_number) {
          const completeData = getCompleteArticleData(result.data.article.episodes.episode_number);
          setArticleData(completeData);
        }
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackRead = async () => {
    if (!articleId || !article) return;
    
    const readSeconds = Math.round((Date.now() - readStartTime) / 1000);
    try {
      await api.trackEpisodeArticleRead(articleId, readSeconds, Math.round(maxScrollPercent));
    } catch (error) {
      console.error('Error tracking read:', error);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollPercent = ((contentOffset.y + layoutMeasurement.height) / contentSize.height) * 100;
    if (scrollPercent > maxScrollPercent) {
      setMaxScrollPercent(Math.min(100, scrollPercent));
    }
  };

  const handleBack = () => {
    trackRead();
    router.back();
  };

  const handleStartWriting = async () => {
    if (!article) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark article as 100% read when starting writing exercise
    const readSeconds = Math.round((Date.now() - readStartTime) / 1000);
    try {
      await api.trackEpisodeArticleRead(articleId!, readSeconds, 100);
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
    
    router.push(`/article/episode/${articleId}/writing`);
  };

  const toggleMoreExamples = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate rotation
    Animated.timing(rotateAnim, {
      toValue: showMoreExamples ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Animate layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMoreExamples(!showMoreExamples);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article || !articleData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.text.secondary} />
          <Text style={styles.errorText}>Article not found</Text>
          <Pressable onPress={handleBack}>
            <LinearGradient
              colors={['#B3F5FF', '#00B8DB']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { article: articleContent, grammarLesson, dialogueExamples } = articleData;
  
  // Split examples: first 2 always shown, rest in expandable section
  const visibleExamples = dialogueExamples?.examples.slice(0, 2) || [];
  const hiddenExamples = dialogueExamples?.examples.slice(2, 5) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{grammarLesson?.title.toUpperCase() || articleContent.title.toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>{grammarLesson?.subtitle || articleContent.subtitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Florencia's Letter Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>FROM FLORENCIA</Text>
          </View>
          {articleContent.narrative_sections.filter(s => s.type === 'intro').map((section, index) => (
            <View key={index} style={styles.narrativeBlock}>
              {section.content.split('\n\n').map((paragraph, pIndex) => (
                <Text key={pIndex} style={styles.narrativeText}>{paragraph}</Text>
              ))}
            </View>
          ))}
          <View style={styles.signatureRow}>
            <Text style={styles.signature}>— Florencia</Text>
          </View>
        </View>

        {/* What Is It Section - Using grammar_summary instead of detailed explanation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>WHAT IS IT?</Text>
          </View>
          <Text style={styles.explanationText}>{articleContent.grammar_summary}</Text>
        </View>

        {/* When To Use It Section */}
        {grammarLesson && grammarLesson.useCases.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>WHEN TO USE IT</Text>
            </View>
            {grammarLesson.useCases.map((useCase, index) => (
              <View key={index} style={styles.useCaseCard}>
                <Text style={styles.useCaseNumber}>{index + 1}</Text>
                <View style={styles.useCaseContent}>
                  <Text style={styles.useCaseTitle}>{useCase.title}</Text>
                  <Text style={styles.useCaseDescription}>{useCase.description}</Text>
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleSpanish}>"{useCase.example.spanish}"</Text>
                    <Text style={styles.exampleEnglish}>{useCase.example.english}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Conjugation Table Section */}
        {grammarLesson?.conjugationTable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>CONJUGATION: {grammarLesson.conjugationTable.verb.toUpperCase()}</Text>
            </View>
            <Text style={styles.conjugationSubtitle}>
              {grammarLesson.conjugationTable.indicativeForms ? (
                <>
                  <Text style={styles.subjunctiveLabel}>Subjunctive</Text>
                  <Text> verb conjugations have a different ending vowel swap than the </Text>
                  <Text style={styles.indicativeLabel}>indicative</Text>
                  <Text> form</Text>
                </>
              ) : (
                `${grammarLesson.conjugationTable.verbEnglish} • ${grammarLesson.conjugationTable.tense}`
              )}
            </Text>
            {/* Table Header */}
            {grammarLesson.conjugationTable.indicativeForms && (
              <View style={styles.conjugationHeader}>
                <Text style={styles.conjugationHeaderPronoun}>Pronoun</Text>
                <Text style={styles.conjugationHeaderIndicative}>Indicative</Text>
                <Text style={styles.conjugationHeaderSubjunctive}>Subjunctive</Text>
              </View>
            )}
            <View style={styles.conjugationTable}>
              {Object.entries(grammarLesson.conjugationTable.forms).map(([pronoun, form]) => (
                <View key={pronoun} style={styles.conjugationRow}>
                  <Text style={styles.conjugationPronoun}>
                    {pronoun === 'tú' ? 'tú / vos' : pronoun === 'él' ? 'él / ella' : pronoun}
                  </Text>
                  {grammarLesson.conjugationTable?.indicativeForms && (
                    <Text style={styles.conjugationIndicativeForm}>
                      {grammarLesson.conjugationTable.indicativeForms[pronoun as keyof typeof grammarLesson.conjugationTable.indicativeForms]}
                    </Text>
                  )}
                  <Text style={styles.conjugationForm}>{form}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* From This Episode Section - Dialogue Examples with Expandable */}
        {dialogueExamples && dialogueExamples.examples.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>FROM THIS EPISODE</Text>
            </View>
            <Text style={styles.storyExamplesIntro}>
              Common usage within context. Subjunctive verbs are{' '}
              <Text style={styles.underlinedVerbDemo}>underlined</Text>.
            </Text>
            
            {/* Always visible examples (first 2) */}
            {visibleExamples.map((example, index) => (
              <View key={index} style={styles.storyExampleCard}>
                <Text style={styles.storyExampleSpanish}>
                  "{renderSpanishWithUnderlinedVerbs(example.spanish)}"
                </Text>
                <Text style={styles.storyExampleEnglish}>{example.english}</Text>
                <View style={styles.storyExampleContext}>
                  <Ionicons name="person-outline" size={14} color={colors.text.muted} />
                  <Text style={styles.storyExampleContextText}>{example.scene_context}</Text>
                </View>
              </View>
            ))}
            
            {/* Expandable section for additional examples */}
            {hiddenExamples.length > 0 && (
              <>
                {showMoreExamples && (
                  <View>
                    {hiddenExamples.map((example, index) => (
                      <View key={index + 2} style={styles.storyExampleCard}>
                        <Text style={styles.storyExampleSpanish}>
                          "{renderSpanishWithUnderlinedVerbs(example.spanish)}"
                        </Text>
                        <Text style={styles.storyExampleEnglish}>{example.english}</Text>
                        <View style={styles.storyExampleContext}>
                          <Ionicons name="person-outline" size={14} color={colors.text.muted} />
                          <Text style={styles.storyExampleContextText}>{example.scene_context}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                <Pressable onPress={toggleMoreExamples} style={styles.showMoreButton}>
                  <Text style={styles.showMoreText}>
                    {showMoreExamples ? 'Show Less' : `Show ${hiddenExamples.length} More Examples`}
                  </Text>
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <Ionicons name="chevron-down" size={20} color={colors.accent.sky} />
                  </Animated.View>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Key Phrases Section */}
        {grammarLesson && grammarLesson.triggers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>KEY PHRASES</Text>
            </View>
            <View style={styles.triggersContainer}>
              {grammarLesson.triggers.map((trigger, index) => (
                <View key={index} style={styles.triggerChip}>
                  <Text style={styles.triggerText}>{trigger}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pro Tips Section */}
        {grammarLesson && grammarLesson.tips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>PRO TIPS</Text>
            </View>
            {grammarLesson.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipBullet}>
                  <Ionicons name="checkmark" size={14} color={colors.primary.gold} />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}



        {/* Closing Reflection */}
        {articleContent.narrative_sections.filter(s => s.type === 'closing').map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>REMEMBER THIS</Text>
            </View>
            <View style={styles.closingBlock}>
              {section.content.split('\n\n').map((paragraph, pIndex) => (
                <Text key={pIndex} style={styles.closingText}>{paragraph}</Text>
              ))}
            </View>
          </View>
        ))}

        {/* Writing Exercise CTA - Simplified to button only */}
        {article.writing_exercise_prompt && (
          <View style={styles.writingExerciseContainer}>
            <Pressable onPress={handleStartWriting}>
              <LinearGradient
                colors={['#B3F5FF', '#00B8DB']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.writingButton}
              >
                <Ionicons name="create-outline" size={22} color={colors.neutral[950]} />
                <Text style={styles.writingButtonText}>Begin Writing Exercise</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral[950]} />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>THESPANISHLANGUAGELAB</Text>
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
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  headerButton: {
    padding: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing[2],
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.primary.gold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },

  // Sections
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Florencia's Narrative
  narrativeBlock: {
    marginBottom: spacing[3],
  },
  narrativeText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 26,
    marginBottom: spacing[3],
    fontStyle: 'italic',
  },
  signatureRow: {
    alignItems: 'flex-start',
    marginTop: spacing[2],
  },
  signature: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
    fontWeight: '600',
  },

  // Grammar Explanation
  explanationText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 26,
  },

  // Use Cases
  useCaseCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  useCaseNumber: {
    ...textStyles.h2,
    color: colors.primary.gold,
    marginRight: spacing[3],
    opacity: 0.5,
  },
  useCaseContent: {
    flex: 1,
  },
  useCaseTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  useCaseDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  exampleBox: {
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  exampleSpanish: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontStyle: 'italic',
    marginBottom: spacing[1],
  },
  exampleEnglish: {
    ...textStyles.caption,
    color: colors.text.muted,
  },

  // Conjugation Table
  conjugationSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    fontSize: 15,
  },
  subjunctiveLabel: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  indicativeLabel: {
    color: colors.accent.sage,
    fontWeight: '600',
  },
  conjugationHeader: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[850],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  conjugationHeaderPronoun: {
    ...textStyles.caption,
    color: colors.text.muted,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conjugationHeaderIndicative: {
    ...textStyles.caption,
    color: colors.accent.sage,
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  conjugationHeaderSubjunctive: {
    ...textStyles.caption,
    color: colors.primary.gold,
    flex: 1,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  conjugationTable: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  conjugationRow: {
    flexDirection: 'row',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  conjugationPronoun: {
    ...textStyles.body,
    color: colors.text.secondary,
    flex: 1,
  },
  conjugationIndicativeForm: {
    ...textStyles.body,
    color: colors.accent.sage,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  conjugationForm: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Story Examples
  storyExamplesIntro: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    fontSize: 15,
  },
  underlinedVerbDemo: {
    color: colors.primary.gold,
    textDecorationLine: 'underline',
  },
  storyExampleCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.accent.tango,
  },
  storyExampleSpanish: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: spacing[1],
  },
  storyExampleSpanishText: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  underlinedVerb: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  storyExampleEnglish: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  storyExampleContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  storyExampleContextText: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  
  // Show More Button
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
    marginTop: spacing[1],
  },
  showMoreText: {
    ...textStyles.body,
    color: colors.accent.sky,
    fontWeight: '600',
  },

  // Triggers / Key Phrases
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  triggerChip: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '60',
  },
  triggerText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },

  // Pro Tips
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  tipText: {
    ...textStyles.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Closing Section
  closingBlock: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  closingText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing[2],
  },

  // Writing Exercise CTA - Simplified
  writingExerciseContainer: {
    marginTop: spacing[6],
    marginBottom: spacing[4],
  },
  writingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  writingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[950],
  },

  // Footer
  footer: {
    marginTop: spacing[8],
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  footerDivider: {
    width: 60,
    height: 4,
    backgroundColor: colors.neutral[700],
    borderRadius: 2,
    marginBottom: spacing[4],
  },
  footerText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
  },
  errorText: {
    ...textStyles.h4,
    color: colors.text.secondary,
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  backButtonText: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontWeight: '600',
  },
});
