import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';
import { CONVERSATION_MODES } from '../../src/config/constants';

// Mock data - replace with actual API calls
const mockConversations = [
  {
    id: '1',
    mode: 'open',
    topic: null,
    started_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    message_count: 12,
    preview: '¡Hola! ¿Cómo estás hoy?',
  },
  {
    id: '2',
    mode: 'topic',
    topic: 'travel',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    message_count: 8,
    preview: 'Me encantaría visitar España algún día...',
  },
  {
    id: '3',
    mode: 'grammar',
    topic: 'Subjunctive',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    message_count: 15,
    preview: 'Es importante que practiques el subjuntivo...',
  },
];

export default function ConversationsScreen() {
  const isLoading = false;
  const conversations = mockConversations;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getModeInfo = (modeId: string) => {
    return CONVERSATION_MODES.find(m => m.id === modeId) || CONVERSATION_MODES[0];
  };

  const renderConversation = ({ item, index }: { item: typeof mockConversations[0]; index: number }) => {
    const modeInfo = getModeInfo(item.mode);
    
    return (
      <View>
        <Link 
          href={{
            pathname: '/conversation/[id]',
            params: { id: item.id },
          }} 
          asChild
        >
          <Pressable style={styles.conversationCard}>
            <View style={[styles.modeIcon, { backgroundColor: modeInfo.color + '20' }]}>
              <Ionicons 
                name={modeInfo.icon as keyof typeof Ionicons.glyphMap} 
                size={20} 
                color={modeInfo.color} 
              />
            </View>
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationTitle}>
                  {item.topic || modeInfo.title}
                </Text>
                <Text style={styles.conversationTime}>
                  {formatDate(item.started_at)}
                </Text>
              </View>
              <Text style={styles.conversationPreview} numberOfLines={1}>
                {item.preview}
              </Text>
              <View style={styles.conversationMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="chatbubble-outline" size={12} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{item.message_count} messages</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
          </Pressable>
        </Link>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Conversation History</Text>
        <Text style={styles.subtitle}>{conversations.length} conversations</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Start your first Spanish conversation with Lobo!
          </Text>
          <Link href="/(tabs)/start" asChild>
            <Pressable style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Talking</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
  },
  title: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  conversationTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  conversationTime: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  conversationPreview: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  conversationMeta: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  separator: {
    height: spacing[3],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  startButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
  },
  startButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

