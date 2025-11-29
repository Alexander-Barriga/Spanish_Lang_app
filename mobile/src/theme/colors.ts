// LoboLingo Color Palette
// Deep, warm colors inspired by wolves and Spanish culture

export const colors = {
  // Primary colors
  primary: {
    navy: '#1a1f36',      // Deep navy - main background
    gold: '#f4b942',       // Warm gold - primary accent
    cream: '#faf8f5',      // Soft cream - text on dark
  },

  // Secondary colors
  secondary: {
    rust: '#c45d3a',       // Warm rust - secondary accent
    sage: '#7a9e7e',       // Sage green - success states
    lavender: '#8b7eb8',   // Soft lavender - grammar mode
    coral: '#e07a5f',      // Coral - vocabulary mode
    teal: '#4ecdc4',       // Teal - open chat mode
  },

  // Neutral palette
  neutral: {
    900: '#0f1219',        // Darkest
    800: '#1a1f36',        // Navy (same as primary)
    700: '#2a3152',        // Dark blue-gray
    600: '#3d4567',        // Medium blue-gray
    500: '#5a6380',        // Mid gray
    400: '#8891a8',        // Light blue-gray
    300: '#b4bcd0',        // Lighter
    200: '#d6dce8',        // Very light
    100: '#eef1f6',        // Near white
    50: '#f8f9fc',         // Lightest
  },

  // Semantic colors
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
  info: '#3b82f6',

  // Mode-specific colors
  modes: {
    open: '#4ECDC4',
    topic: '#FF6B6B',
    vocabulary: '#45B7D1',
    grammar: '#96CEB4',
    roleplay: '#DDA0DD',
  },

  // Text colors
  text: {
    primary: '#faf8f5',      // Light text on dark bg
    secondary: '#b4bcd0',    // Muted text
    inverse: '#1a1f36',      // Dark text on light bg
    accent: '#f4b942',       // Gold accent text
  },

  // Background colors
  background: {
    primary: '#1a1f36',
    secondary: '#0f1219',
    elevated: '#2a3152',
    card: '#232942',
  },

  // Border colors
  border: {
    default: '#3d4567',
    light: '#5a6380',
    focus: '#f4b942',
  },

  // Gradient presets
  gradients: {
    primary: ['#1a1f36', '#2a3152'],
    gold: ['#f4b942', '#e5a83a'],
    sunset: ['#c45d3a', '#e07a5f'],
    night: ['#0f1219', '#1a1f36'],
  },
} as const;

// Light theme overrides (for future use)
export const lightColors = {
  ...colors,
  background: {
    primary: '#faf8f5',
    secondary: '#f0ede8',
    elevated: '#ffffff',
    card: '#ffffff',
  },
  text: {
    primary: '#1a1f36',
    secondary: '#5a6380',
    inverse: '#faf8f5',
    accent: '#c45d3a',
  },
  border: {
    default: '#d6dce8',
    light: '#eef1f6',
    focus: '#f4b942',
  },
} as const;

export type ColorScheme = typeof colors;

