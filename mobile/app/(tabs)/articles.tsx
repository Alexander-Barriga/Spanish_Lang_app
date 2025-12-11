import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing[5] * 2;

type TabType = 'popular' | 'favorites' | 'search';

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  grammar_tags: string[];
  estimated_read_minutes: number;
  published_at: string;
  is_favorite: boolean;
  popularity_score?: number;
}

interface GrammarTag {
  grammar_focus: string;
  title_en: string;
}

export default function ArticlesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [grammarTags, setGrammarTags] = useState<GrammarTag[]>([]);
  const [selectedGrammar, setSelectedGrammar] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
      loadGrammarTags();
    }, [activeTab])
  );

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      
      let result;
      if (activeTab === 'search' && (searchQuery || selectedGrammar)) {
        result = await api.searchArticles(searchQuery, selectedGrammar || undefined);
      } else {
        result = await api.getArticles(activeTab);
      }
      
      if (result.data?.articles) {
        setArticles(result.data.articles);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadGrammarTags = async () => {
    try {
      const result = await api.getGrammarTags();
      if (result.data?.tags) {
        setGrammarTags(result.data.tags);
      }
    } catch (error) {
      console.error('Error loading grammar tags:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadArticles();
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedGrammar(null);
    setSuggestions([]);
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    
    if (text.length >= 2) {
      const result = await api.getArticleAutocomplete(text);
      if (result.data?.suggestions) {
        setSuggestions(result.data.suggestions);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = () => {
    setSuggestions([]);
    loadArticles();
  };

  const handleSuggestionTap = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    loadArticles();
  };

  const handleGrammarTagTap = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedGrammar === tag) {
      setSelectedGrammar(null);
    } else {
      setSelectedGrammar(tag);
    }
    // Trigger search with new filter
    setTimeout(loadArticles, 100);
  };

  const handleArticleTap = (article: Article) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/article/${article.id}`);
  };

  const formatGrammarTag = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderArticleCard = (article: Article) => (
    <Pressable 
      key={article.id}
      style={({ pressed }) => [
        styles.articleCard,
        pressed && styles.articleCardPressed
      ]}
      onPress={() => handleArticleTap(article)}
    >
      {article.image_url ? (
        <Image 
          source={{ uri: article.image_url }} 
          style={styles.articleImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.articleImagePlaceholder}>
          <Ionicons name="document-text" size={40} color={colors.neutral[600]} />
        </View>
      )}
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <View style={styles.articleMeta}>
          <Text style={styles.articleReadTime}>
            {article.estimated_read_minutes} min read
          </Text>
          {article.grammar_tags.length > 0 && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.articleGrammar} numberOfLines={1}>
                {formatGrammarTag(article.grammar_tags[0])}
              </Text>
            </>
          )}
        </View>
      </View>
      {article.is_favorite && (
        <View style={styles.favoriteIndicator}>
          <Ionicons name="heart" size={16} color={colors.accent.tango} />
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Articles</Text>
        <Text style={styles.subtitle}>Spanish reading practice</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['popular', 'favorites', 'search'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive
            ]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Bar - only on search tab */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.neutral[500]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search articles..."
              placeholderTextColor={colors.neutral[500]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.neutral[500]} />
              </Pressable>
            )}
          </View>
          
          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionTap(suggestion)}
                >
                  <Ionicons name="search-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Grammar Category Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.grammarPillsScroll}
            contentContainerStyle={styles.grammarPillsContent}
          >
            {grammarTags.map((tag) => (
              <Pressable
                key={tag.grammar_focus}
                style={[
                  styles.grammarPill,
                  selectedGrammar === tag.grammar_focus && styles.grammarPillActive
                ]}
                onPress={() => handleGrammarTagTap(tag.grammar_focus)}
              >
                <Text style={[
                  styles.grammarPillText,
                  selectedGrammar === tag.grammar_focus && styles.grammarPillTextActive
                ]}>
                  {tag.title_en}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Articles List */}
      <ScrollView
        style={styles.articlesScroll}
        contentContainerStyle={styles.articlesContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.gold}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.gold} />
            <Text style={styles.loadingText}>Loading articles...</Text>
          </View>
        ) : articles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'favorites' ? 'heart-outline' : 'document-text-outline'} 
              size={48} 
              color={colors.neutral[500]} 
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'favorites' 
                ? 'No favorites yet' 
                : activeTab === 'search'
                  ? 'No articles found'
                  : 'No articles available'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'favorites' 
                ? 'Articles you love will appear here' 
                : activeTab === 'search'
                  ? 'Try a different search or filter'
                  : 'Check back soon for new content'}
            </Text>
          </View>
        ) : (
          articles.map(renderArticleCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  tab: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  tabActive: {
    backgroundColor: colors.primary.gold,
  },
  tabText: {
    ...textStyles.label,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.neutral[950],
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: colors.text.primary,
    paddingVertical: spacing[1],
  },
  suggestionsContainer: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: spacing[2],
  },
  suggestionText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  grammarPillsScroll: {
    marginTop: spacing[3],
  },
  grammarPillsContent: {
    gap: spacing[2],
    paddingRight: spacing[5],
  },
  grammarPill: {
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  grammarPillActive: {
    backgroundColor: colors.accent.tango + '20',
    borderColor: colors.accent.tango,
  },
  grammarPillText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  grammarPillTextActive: {
    color: colors.accent.tango,
    fontWeight: '600',
  },

  // Articles List
  articlesScroll: {
    flex: 1,
  },
  articlesContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },

  // Article Card
  articleCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  articleCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  articleImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background.card,
  },
  articleImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    padding: spacing[4],
  },
  articleTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleReadTime: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[500],
    marginHorizontal: spacing[2],
  },
  articleGrammar: {
    ...textStyles.caption,
    color: colors.accent.tango,
    flex: 1,
  },
  favoriteIndicator: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: colors.background.primary + 'CC',
    padding: spacing[1.5],
    borderRadius: borderRadius.full,
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: spacing[10],
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing[10],
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing[5],
  },
});
