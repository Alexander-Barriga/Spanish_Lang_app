import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import RenderHtml from 'react-native-render-html';
import { api, Article } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function ArticleReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [readStartTime] = useState(Date.now());
  const [maxScrollPercent, setMaxScrollPercent] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadArticle();
    return () => {
      // Track read when leaving
      trackRead();
    };
  }, [id]);

  const loadArticle = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const result = await api.getArticle(id);
      if (result.data?.article) {
        setArticle(result.data.article);
        setIsFavorite(result.data.article.is_favorite);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackRead = async () => {
    if (!id) return;
    
    const readSeconds = Math.round((Date.now() - readStartTime) / 1000);
    try {
      await api.trackArticleRead(id, readSeconds, Math.round(maxScrollPercent));
    } catch {
      // Silently ignore read tracking errors - non-critical feature
      // Table may not exist yet or user may not be authenticated
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

  const handleToggleFavorite = async () => {
    if (!id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (isFavorite) {
        await api.removeArticleFromFavorites(id);
        setIsFavorite(false);
      } else {
        await api.addArticleToFavorites(id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatGrammarTag = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Custom HTML styling
  const tagsStyles = {
    body: {
      color: colors.text.primary,
      fontSize: 17,
      lineHeight: 28,
      fontFamily: 'System',
    },
    p: {
      marginBottom: 16,
    },
    h1: {
      ...textStyles.h2,
      color: colors.text.primary,
      marginTop: 24,
      marginBottom: 12,
    },
    h2: {
      ...textStyles.h3,
      color: colors.text.primary,
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      ...textStyles.h4,
      color: colors.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary.gold,
      paddingLeft: 16,
      marginLeft: 0,
      fontStyle: 'italic',
      color: colors.text.secondary,
    },
    a: {
      color: colors.primary.gold,
      textDecorationLine: 'none',
    },
    strong: {
      fontWeight: '600',
      color: colors.text.primary,
    },
    em: {
      fontStyle: 'italic',
    },
    ul: {
      marginBottom: 16,
    },
    ol: {
      marginBottom: 16,
    },
    li: {
      marginBottom: 8,
    },
    code: {
      backgroundColor: colors.background.elevated,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'Menlo',
      fontSize: 15,
    },
    pre: {
      backgroundColor: colors.background.elevated,
      padding: 16,
      borderRadius: 8,
      overflow: 'hidden',
    },
    img: {
      borderRadius: 8,
      marginVertical: 16,
    },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <Pressable onPress={handleToggleFavorite} style={styles.headerButton}>
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isFavorite ? colors.accent.tango : colors.text.primary} 
          />
        </Pressable>
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
        {/* Article Meta */}
        <View style={styles.articleMeta}>
          <Text style={styles.articleDate}>{formatDate(article.published_at)}</Text>
          <Text style={styles.articleReadTime}>· {article.estimated_read_minutes} min read</Text>
        </View>

        {/* Title */}
        <Text style={styles.articleTitle}>{article.title}</Text>

        {/* Subtitle */}
        {article.subtitle && (
          <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
        )}

        {/* Grammar Tags */}
        {article.grammar_tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {article.grammar_tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Ionicons name="school-outline" size={12} color={colors.accent.tango} />
                <Text style={styles.tagText}>{formatGrammarTag(tag)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Author */}
        <View style={styles.authorContainer}>
          <View style={styles.authorAvatar}>
            <Ionicons name="person" size={16} color={colors.neutral[500]} />
          </View>
          <Text style={styles.authorName}>{article.author}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* HTML Content */}
        {article.content_html && (
          <RenderHtml
            contentWidth={width - spacing[5] * 2}
            source={{ html: article.content_html }}
            tagsStyles={tagsStyles as any}
            enableExperimentalMarginCollapsing={true}
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Pressable onPress={handleToggleFavorite} style={styles.favoriteButton}>
            <Ionicons 
              name={isFavorite ? 'heart' : 'heart-outline'} 
              size={20} 
              color={isFavorite ? colors.accent.tango : colors.text.secondary} 
            />
            <Text style={[
              styles.favoriteButtonText,
              isFavorite && styles.favoriteButtonTextActive
            ]}>
              {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
            </Text>
          </Pressable>
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerButton: {
    padding: spacing[2],
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
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
  },

  // Article Meta
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  articleDate: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  articleReadTime: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginLeft: spacing[1],
  },

  // Title & Subtitle
  articleTitle: {
    ...textStyles.h1,
    color: colors.text.primary,
    marginBottom: spacing[3],
    lineHeight: 36,
  },
  articleSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    lineHeight: 24,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.tango + '15',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  tagText: {
    ...textStyles.caption,
    color: colors.accent.tango,
    fontWeight: '500',
  },

  // Author
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  authorName: {
    ...textStyles.label,
    color: colors.text.primary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginBottom: spacing[5],
  },

  // Footer
  footer: {
    marginTop: spacing[8],
    alignItems: 'center',
  },
  footerDivider: {
    width: 60,
    height: 4,
    backgroundColor: colors.neutral[700],
    borderRadius: 2,
    marginBottom: spacing[5],
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  favoriteButtonText: {
    ...textStyles.label,
    color: colors.text.secondary,
  },
  favoriteButtonTextActive: {
    color: colors.accent.tango,
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
    backgroundColor: colors.primary.gold,
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

