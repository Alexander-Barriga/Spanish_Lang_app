/**
 * CulturalContext Component
 * 
 * A collapsible card that provides cultural context for users
 * who may be unfamiliar with Argentine locations and customs.
 * 
 * Features:
 * - Expandable/collapsible with smooth animation
 * - Persists "seen" state per scene using AsyncStorage
 * - Styled to match the Buenos Aires aesthetic
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, textStyles, spacing, borderRadius, shadows } from '../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CulturalContextProps {
  /** Unique identifier for this context (e.g., "ep1_scene1_tortoni") */
  contextId: string;
  
  /** The location or event name (e.g., "Café Tortoni") */
  title: string;
  
  /** The cultural context explanation (2-3 sentences) */
  content: string;
  
  /** Optional icon name from Ionicons */
  icon?: string;
  
  /** Whether to start expanded (default: based on seen state) */
  defaultExpanded?: boolean;
  
  /** Callback when the context is viewed */
  onView?: () => void;
}

const STORAGE_KEY_PREFIX = 'cultural_context_seen_';

export const CulturalContext: React.FC<CulturalContextProps> = ({
  contextId,
  title,
  content,
  icon = 'location',
  defaultExpanded,
  onView,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load seen state from AsyncStorage
  useEffect(() => {
    const loadSeenState = async () => {
      try {
        const key = `${STORAGE_KEY_PREFIX}${contextId}`;
        const seen = await AsyncStorage.getItem(key);
        setHasSeen(seen === 'true');
        
        // Default to expanded if not seen before, or use prop
        const shouldExpand = defaultExpanded !== undefined 
          ? defaultExpanded 
          : seen !== 'true';
        setIsExpanded(shouldExpand);
        
        if (shouldExpand) {
          fadeAnim.setValue(1);
          rotateAnim.setValue(1);
        }
      } catch (error) {
        console.error('Error loading cultural context state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSeenState();
  }, [contextId, defaultExpanded]);

  // Mark as seen when expanded
  useEffect(() => {
    if (isExpanded && !hasSeen) {
      const markAsSeen = async () => {
        try {
          const key = `${STORAGE_KEY_PREFIX}${contextId}`;
          await AsyncStorage.setItem(key, 'true');
          setHasSeen(true);
          onView?.();
        } catch (error) {
          console.error('Error saving cultural context state:', error);
        }
      };
      markAsSeen();
    }
  }, [isExpanded, hasSeen, contextId, onView]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Animate the chevron rotation
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (isLoading) {
    return null; // Don't flash UI while loading state
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.header,
          isExpanded && styles.headerExpanded,
          !hasSeen && styles.headerNew,
        ]}
        onPress={toggleExpanded}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, !hasSeen && styles.iconContainerNew]}>
            <Ionicons 
              name={icon as any} 
              size={18} 
              color={!hasSeen ? colors.primary.gold : colors.text.secondary} 
            />
          </View>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !hasSeen && styles.titleNew]}>
                {title}
              </Text>
              {!hasSeen && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            {!isExpanded && (
              <Text style={styles.tapHint}>
                Tap to learn about this place
              </Text>
            )}
          </View>
        </View>
        
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={colors.text.secondary} 
          />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <Animated.View 
          style={[
            styles.content,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.contentText}>{content}</Text>
          
          <View style={styles.footer}>
            <Ionicons 
              name="information-circle-outline" 
              size={14} 
              color={colors.text.muted} 
            />
            <Text style={styles.footerText}>
              Cultural context for this scene
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Compact version for inline display within dialogue
 */
export const CulturalContextInline: React.FC<{
  content: string;
  onPress?: () => void;
}> = ({ content, onPress }) => {
  return (
    <Pressable style={styles.inlineContainer} onPress={onPress}>
      <Ionicons 
        name="information-circle" 
        size={16} 
        color={colors.primary.gold} 
      />
      <Text style={styles.inlineText} numberOfLines={2}>
        {content}
      </Text>
    </Pressable>
  );
};

/**
 * Utility to clear all seen states (for testing/reset)
 */
export const clearAllCulturalContextSeenStates = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const contextKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    await AsyncStorage.multiRemove(contextKeys);
  } catch (error) {
    console.error('Error clearing cultural context states:', error);
  }
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    ...shadows.sm,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  
  headerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  
  headerNew: {
    borderColor: colors.primary.gold + '40',
    borderWidth: 1,
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  iconContainerNew: {
    backgroundColor: colors.primary.gold + '20',
  },
  
  headerTextContainer: {
    flex: 1,
  },
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  
  title: {
    ...textStyles.label,
    color: colors.text.primary,
  },
  
  titleNew: {
    color: colors.primary.gold,
  },
  
  newBadge: {
    backgroundColor: colors.primary.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  
  newBadgeText: {
    ...textStyles.caption,
    color: colors.primary.black,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  
  tapHint: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  
  content: {
    padding: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.neutral[900],
  },
  
  contentText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  
  footerText: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  
  // Inline variant styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.primary.gold + '10',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  
  inlineText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});

export default CulturalContext;

