import { colors, lightColors } from './colors';
import { typography, textStyles } from './typography';
import { spacing, borderRadius, shadows, zIndex } from './spacing';

export const theme = {
  colors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  zIndex,
} as const;

export const lightTheme = {
  ...theme,
  colors: lightColors,
} as const;

export type Theme = typeof theme;

// Re-export everything
export { colors, lightColors } from './colors';
export { typography, textStyles } from './typography';
export { spacing, borderRadius, shadows, zIndex } from './spacing';

