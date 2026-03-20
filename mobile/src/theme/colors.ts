// Spanish Lab Premium Color Palette
// Elegant, sophisticated colors for an elite learning experience

export const colors = {
  // Primary colors - Rich, luxurious palette
  primary: {
    black: '#0A0A0B',        // Deep black - main background
    gold: '#00D5FF',          // Cyan - primary accent
    cream: '#F5F2EB',         // Warm cream - text on dark
    charcoal: '#1C1C1E',      // Rich charcoal - elevated surfaces
  },

  // Accent colors - Inspired by Buenos Aires and tango
  accent: {
    tango: '#FF0000',         // Pure red - passion, tango
    wine: '#FF0000',          // Pure red - sophisticated accent
    sky: '#4A6B8A',           // Muted slate blue - calm, trustworthy
    sage: '#00FF00',          // Pure green - success, growth
    rose: '#B76E79',          // Dusty rose - warmth
  },

  // Neutral palette - Sophisticated grays
  neutral: {
    950: '#0A0A0B',           // Near black
    900: '#121214',           // Deep dark
    850: '#1C1C1E',           // Charcoal
    800: '#2C2C2E',           // Dark gray
    700: '#3A3A3C',           // Medium dark
    600: '#48484A',           // Medium gray
    500: '#636366',           // Mid gray
    400: '#8E8E93',           // Light gray
    300: '#AEAEB2',           // Lighter
    200: '#C7C7CC',           // Very light
    100: '#E5E5EA',           // Near white
    50: '#F2F2F7',            // Off white
  },

  // Semantic colors
  success: '#00FF00',         // Pure green
  warning: '#D4A84B',         // Warm amber
  error: '#FF0000',           // Pure red
  info: '#4A6B8A',            // Slate blue

  // Mode-specific colors (for grammar gym legacy support)
  modes: {
    open: '#4A6B8A',
    topic: '#B76E79',
    vocabulary: '#00FF00',
    grammar: '#FF0000',       // Pure red
    roleplay: '#9B7BB8',
  },

  // Text colors
  text: {
    primary: '#F5F2EB',        // Cream on dark
    secondary: '#AEAEB2',      // Muted gray
    tertiary: '#636366',       // Even more muted
    inverse: '#0A0A0B',        // Dark text on light
    accent: '#00D5FF',         // Cyan accent text
    muted: '#8E8E93',          // Subtle text
  },

  // Background colors
  background: {
    primary: '#0A0A0B',        // Main background
    secondary: '#121214',      // Slightly elevated
    elevated: '#1C1C1E',       // Cards, surfaces
    card: '#1C1C1E',           // Card background
    modal: '#2C2C2E',          // Modal overlay
    input: '#2C2C2E',          // Input fields
  },

  // Border colors
  border: {
    default: '#3A3A3C',        // Standard border
    light: '#48484A',          // Lighter border
    subtle: '#2C2C2E',         // Very subtle
    focus: '#00D5FF',          // Focus state (cyan)
    accent: '#FF0000',         // Accent border (red)
  },

  // Gradient presets
  gradients: {
    primary: ['#0A0A0B', '#1C1C1E'],
    hero: ['#121214', '#1C1C1E', '#2C2C2E'],
    gold: ['#00D5FF', '#00A8CC'],
    goldSubtle: ['rgba(0,213,255,0.15)', 'rgba(0,213,255,0.05)'],
    tango: ['#FF0000', '#CC0000'],
    tangoSubtle: ['rgba(255,0,0,0.2)', 'rgba(255,0,0,0.1)'],
    night: ['#0A0A0B', '#121214'],
    card: ['#1C1C1E', '#232325'],
  },

  // Episode/Story specific colors
  story: {
    progress: '#00D5FF',       // Progress bar (cyan)
    star: '#D4A84B',           // Star rating
    starEmpty: '#3A3A3C',      // Empty star
    locked: '#48484A',         // Locked content
  },

  // Character colors (for avatar accents)
  characters: {
    florencia: '#75AADB',      // Argentina blue
    ana_maria: '#006847',      // Mexico green
    marcela: '#FCD116',        // Colombia yellow
  },
} as const;

// Type exports
export type ColorScheme = typeof colors;
export type GradientKey = keyof typeof colors.gradients;
