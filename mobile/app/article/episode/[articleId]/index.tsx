import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { api, EpisodeArticle } from '../../../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../../../src/theme';

// Interface for article images
interface ArticleImage {
  id: string;
  image_type: 'header' | 'inline';
  position: number;
  image_url: string;
  alt_text?: string;
}

const { width } = Dimensions.get('window');

// Substack-inspired dark theme markdown styles
const markdownStyles = StyleSheet.create({
  // Main body text - clean, readable, Substack-like
  body: {
    color: colors.text.primary,
    fontSize: 18,
    lineHeight: 30,
  },
  
  // Headings - elegant with subtle gold accents
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 32,
    marginBottom: 16,
    lineHeight: 36,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 28,
    marginBottom: 14,
    lineHeight: 30,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 26,
  },
  heading4: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 20,
    marginBottom: 10,
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Paragraphs with Substack-like spacing
  paragraph: {
    marginBottom: 20,
    lineHeight: 30,
  },

  // Blockquotes - distinctive left border with gold accent
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
    paddingLeft: 20,
    paddingVertical: 8,
    marginVertical: 24,
    marginLeft: 0,
    backgroundColor: 'transparent',
  },

  // Strong/Bold text
  strong: {
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Emphasis/Italic - often used for Spanish text
  em: {
    fontStyle: 'italic',
    color: colors.text.primary,
  },

  // Links with gold accent
  link: {
    color: colors.primary.gold,
    textDecorationLine: 'none',
  },

  // Lists - clean and readable
  bullet_list: {
    marginVertical: 16,
  },
  ordered_list: {
    marginVertical: 16,
  },
  list_item: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet_list_icon: {
    color: colors.primary.gold,
    marginRight: 10,
    fontSize: 18,
    lineHeight: 30,
  },
  ordered_list_icon: {
    color: colors.primary.gold,
    marginRight: 10,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 30,
  },

  // Code blocks for grammar examples
  code_inline: {
    backgroundColor: colors.background.elevated,
    color: colors.accent.sky,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontFamily: 'Menlo',
    fontSize: 15,
  },
  code_block: {
    backgroundColor: colors.background.elevated,
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  fence: {
    backgroundColor: colors.background.elevated,
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },

  // Tables for conjugation grids
  table: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 12,
    marginVertical: 20,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: colors.background.secondary,
  },
  tbody: {
    backgroundColor: 'transparent',
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    flexDirection: 'row',
  },
  th: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: colors.background.secondary,
  },
  td: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 15,
  },

  // Horizontal rule - subtle divider
  hr: {
    backgroundColor: colors.border.subtle,
    height: 1,
    marginVertical: 32,
  },

  // Images - enhanced for narrative images
  image: {
    borderRadius: 12,
    marginVertical: 20,
    width: width - 40,
    height: (width - 40) * 0.56, // 16:9 aspect ratio
  },

  // Text selection
  textgroup: {
    paddingVertical: 0,
  },
});

// Custom render rules for enhanced image support
const createMarkdownRules = (articleImages: ArticleImage[]) => ({
  // Custom image rendering with better sizing and loading states
  image: (node: any, children: any, parent: any, styles: any, allowedImageHandlers?: any, defaultImageHandler?: any) => {
    const { src, alt } = node.attributes;
    
    // Find matching image from article_images if using placeholder
    let imageUrl = src;
    let imageAlt = alt || '';
    
    // Check if this is an [IMAGE: ...] placeholder that was converted
    if (src && src.startsWith('placeholder_')) {
      const position = parseInt(src.replace('placeholder_', ''), 10);
      const matchingImage = articleImages.find(img => img.position === position);
      if (matchingImage) {
        imageUrl = matchingImage.image_url;
        imageAlt = matchingImage.alt_text || imageAlt;
      }
    }
    
    if (!imageUrl) return null;
    
    return (
      <View key={node.key} style={imageStyles.imageWrapper}>
        <Image
          source={{ uri: imageUrl }}
          style={imageStyles.image}
          resizeMode="cover"
        />
        {imageAlt && (
          <Text style={imageStyles.imageCaption}>{imageAlt}</Text>
        )}
      </View>
    );
  },
});

// Image-specific styles
const imageStyles = StyleSheet.create({
  imageWrapper: {
    marginVertical: 24,
    alignItems: 'center',
  },
  image: {
    width: width - 40,
    height: (width - 40) * 0.56, // 16:9 aspect ratio
    borderRadius: 12,
    backgroundColor: colors.neutral[800],
  },
  imageCaption: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
});

/**
 * Process markdown content to replace [IMAGE: ...] markers with actual images
 * This will convert markers to standard markdown image syntax
 */
const processContentWithImages = (
  content: string, 
  images: ArticleImage[]
): string => {
  if (!content) return '';
  if (!images || images.length === 0) return content;
  
  let processedContent = content;
  
  // Sort images by position
  const sortedImages = [...images].sort((a, b) => a.position - b.position);
  
  // Replace [IMAGE: ...] markers with actual markdown image syntax
  // Format: [IMAGE: description]
  const imageMarkerRegex = /\[IMAGE:\s*([^\]]+)\]/gi;
  let markerIndex = 0;
  
  processedContent = processedContent.replace(imageMarkerRegex, (match, description) => {
    const image = sortedImages[markerIndex];
    markerIndex++;
    
    if (image && image.image_url) {
      // Use standard markdown image syntax
      const altText = image.alt_text || description.trim();
      return `![${altText}](${image.image_url})`;
    }
    
    // If no image available, remove the marker
    return '';
  });
  
  return processedContent;
};

export default function EpisodeArticleReaderScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const [article, setArticle] = useState<EpisodeArticle | null>(null);
  const [articleImages, setArticleImages] = useState<ArticleImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readStartTime] = useState(Date.now());
  const [maxScrollPercent, setMaxScrollPercent] = useState(0);
  const [isSpanish, setIsSpanish] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Create markdown rules with current images
  const markdownRules = useMemo(
    () => createMarkdownRules(articleImages), 
    [articleImages]
  );

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
        
        // Extract images if they exist in the response
        if (result.data.images && Array.isArray(result.data.images)) {
          setArticleImages(result.data.images);
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
    // This ensures the article step is completed when proceeding to writing
    const readSeconds = Math.round((Date.now() - readStartTime) / 1000);
    try {
      await api.trackEpisodeArticleRead(articleId!, readSeconds, 100); // 100% completion
    } catch (error) {
      console.error('Error marking article as read:', error);
      // Continue to writing even if tracking fails
    }
    
    router.push(`/article/episode/${articleId}/writing`);
  };

  const formatGrammarTag = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleToggleLanguage = () => {
    if (!article?.content_markdown_es) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpanish(!isSpanish);
  };

  // Get the current content based on language selection and process images
  const rawContentMarkdown = isSpanish && article?.content_markdown_es 
    ? article.content_markdown_es 
    : article?.content_markdown || '';
  
  // Process content to replace [IMAGE: ...] markers with actual images
  const currentContentMarkdown = useMemo(
    () => processContentWithImages(rawContentMarkdown, articleImages),
    [rawContentMarkdown, articleImages]
  );

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

  if (!article) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Article Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Episode Context Badge */}
        {article.episodes && (
          <View style={styles.episodeBadge}>
            <Text style={styles.episodeBadgeText}>
              Episode {article.episodes.episode_number} · {article.episodes.title_es}
            </Text>
          </View>
        )}

        {/* Article Title - Centered, elegant */}
        <Text style={styles.articleTitle}>{article.title}</Text>

        {/* Subtitle */}
        {article.subtitle && (
          <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
        )}

        {/* Meta Row: Author + Read Time + Translation Toggle */}
        <View style={styles.metaRow}>
          <View style={styles.authorSection}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>F</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{article.author || 'Florencia'}</Text>
              <Text style={styles.articleMeta}>
                {article.estimated_read_minutes} min read
                {article.grammar_focus && ` · ${formatGrammarTag(article.grammar_focus)}`}
              </Text>
            </View>
          </View>
          
          {article.content_markdown_es && (
            <Pressable onPress={handleToggleLanguage} style={styles.translateButton}>
              <Ionicons 
                name="language" 
                size={20} 
                color={colors.primary.gold} 
              />
            </Pressable>
          )}
        </View>

        {/* Decorative Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        {/* Markdown Content with Image Support */}
        {currentContentMarkdown && (
          <View style={styles.markdownContainer}>
            <Markdown 
              style={markdownStyles}
              rules={markdownRules}
            >
              {currentContentMarkdown}
            </Markdown>
          </View>
        )}

        {/* Writing Exercise CTA Card */}
        {article.writing_exercise_prompt && (
          <View style={styles.writingExerciseCard}>
            <View style={styles.writingExerciseHeader}>
              <Ionicons name="create-outline" size={28} color={colors.primary.gold} />
              <Text style={styles.writingExerciseTitle}>Your Writing Exercise</Text>
            </View>
            <Text style={styles.writingExercisePrompt}>
              {article.writing_exercise_prompt}
            </Text>
            <Pressable onPress={handleStartWriting}>
              <LinearGradient
                colors={['#B3F5FF', '#00B8DB']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.startWritingButton}
              >
                <Text style={styles.startWritingButtonText}>Begin Writing Exercise</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral[950]} />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Footer with decorative element */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            TheSpanishLanguageLab
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary, // Dark theme
  },
  
  // Header - Minimal like Substack
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerButton: {
    padding: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  headerSpacer: {
    flex: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[12],
    maxWidth: 680, // Substack-like content width
    alignSelf: 'center',
    width: '100%',
  },

  // Episode Badge - Subtle context
  episodeBadge: {
    marginBottom: spacing[4],
  },
  episodeBadgeText: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Title - Large, centered, elegant
  articleTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  // Subtitle - Supporting context
  articleSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 26,
    fontStyle: 'italic',
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  authorInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[950],
  },
  authorInfo: {
    justifyContent: 'center',
  },
  authorName: {
    ...textStyles.label,
    color: colors.text.primary,
    marginBottom: 2,
  },
  articleMeta: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  translateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },

  // Decorative Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.gold,
    marginHorizontal: spacing[4],
  },

  // Markdown Container
  markdownContainer: {
    marginBottom: spacing[4],
  },

  // Writing Exercise Card - Prominent CTA
  writingExerciseCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    marginTop: spacing[8],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  writingExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  writingExerciseTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  writingExercisePrompt: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing[5],
    lineHeight: 26,
  },
  startWritingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  startWritingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[950],
  },

  // Footer
  footer: {
    marginTop: spacing[10],
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

