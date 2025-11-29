import { Platform } from 'react-native';

// Typography configuration for LoboLingo
// Using system fonts initially, can be replaced with custom fonts

export const typography = {
  // Font families
  fonts: {
    // Headers - Bold, distinctive
    heading: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    // Body text - Clean, readable
    body: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    // Monospace for code/corrections
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// Pre-defined text styles
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  h4: {
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
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  bodySmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
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

  // Special
  button: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.md * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },
} as const;

export type TextStyle = keyof typeof textStyles;

