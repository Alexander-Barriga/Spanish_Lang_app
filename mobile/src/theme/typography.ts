import { Platform } from 'react-native';

// Premium Typography for Spanish Lab
// Refined, elegant type system for an elite learning experience

export const typography = {
  // Font families
  // Note: For production, consider using custom fonts like:
  // - Headings: Playfair Display, Cormorant Garamond, or DM Serif Display
  // - Body: Source Sans Pro, Inter, or SF Pro Text
  fonts: {
    // Headings - Elegant, distinctive
    heading: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    // Body text - Clean, highly readable
    body: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    // Accent text - For special elements
    accent: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    // Monospace for Spanish text highlights
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Font sizes - Refined scale
  sizes: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
    display: 56,
  },

  // Font weights
  weights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights - Generous for readability
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -1,
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

// Pre-defined text styles - Premium, refined
export const textStyles = {
  // Display - Hero titles
  display: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes.display * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tighter,
  },

  // Headings
  h1: {
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['5xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.snug,
  },
  h4: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.snug,
  },
  h5: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },

  // Body text
  bodyLarge: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
  },
  body: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  bodySmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },

  // Spanish dialogue - Slightly larger for readability
  dialogue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.lg * typography.lineHeights.loose,
    fontStyle: 'italic' as const,
  },

  // Labels
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    letterSpacing: typography.letterSpacing.wide,
  },
  labelSmall: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontSize: typography.sizes['2xs'],
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes['2xs'] * typography.lineHeights.normal,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },

  // Buttons
  button: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.md * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  buttonSmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.sm * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  buttonLarge: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.lg * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.wide,
  },

  // Special
  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },
  hint: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    fontStyle: 'italic' as const,
  },

  // Episode specific
  episodeTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  sceneText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.lg * typography.lineHeights.loose,
  },
  grammarHint: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    fontStyle: 'italic' as const,
  },
} as const;

export type TextStyle = keyof typeof textStyles;
