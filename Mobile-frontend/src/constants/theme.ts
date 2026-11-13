/**
 * Fundly design tokens.
 *
 * Direction: restrained private-banking. Cool, blue-tinted neutrals carry the
 * UI; Fundly blue is the single accent; deep "ink" surfaces are reserved for
 * money moments (balances, calculator results, loan headers).
 *
 * Every neutral is tinted toward the brand hue — no pure #000.
 */

const palette = {
  ink900: '#07111F',
  ink800: '#0B1A2E',
  ink700: '#12243D',
  ink600: '#1B3252',

  blue700: '#0F4FB3',
  blue600: '#1764D8',
  blue500: '#2F7BEA',
  blue300: '#8DB8F7',
  blue100: '#E3EEFD',
  blue50: '#F1F6FE',

  slate900: '#0B1526',
  slate700: '#3A475B',
  slate600: '#556275',
  slate400: '#8A94A6',
  slate300: '#B4BCCA',
  slate200: '#DCE2EB',
  slate150: '#E7EBF2',
  slate100: '#EEF1F6',
  slate50: '#F5F7FB',
  white: '#FFFFFF',

  green600: '#0B8A5F',
  green50: '#E6F6EF',
  amber600: '#C46A05',
  amber50: '#FEF3E2',
  red600: '#D13B3B',
  red50: '#FDECEC',
  violet600: '#6E4FD8',
  violet50: '#F0ECFD',
};

export const Colors = {
  primary: palette.blue600,
  primaryDark: palette.blue700,
  primaryLight: palette.blue100,
  primaryTint: palette.blue50,
  secondary: palette.ink800,
  accent: palette.green600,

  /** App canvas behind cards */
  canvas: palette.slate50,
  /** Card / sheet surface */
  background: palette.white,
  surface: palette.slate50,
  surfaceAlt: palette.slate100,

  border: palette.slate150,
  borderStrong: palette.slate200,
  hairline: palette.slate100,

  ink: {
    900: palette.ink900,
    800: palette.ink800,
    700: palette.ink700,
    600: palette.ink600,
    /** Text + lines on ink surfaces */
    text: '#F3F6FB',
    textMuted: 'rgba(225, 233, 245, 0.62)',
    textFaint: 'rgba(225, 233, 245, 0.38)',
    line: 'rgba(225, 233, 245, 0.12)',
    glass: 'rgba(255, 255, 255, 0.07)',
    glassStrong: 'rgba(255, 255, 255, 0.12)',
    accent: palette.blue300,
  },

  text: {
    primary: palette.slate900,
    secondary: palette.slate600,
    muted: palette.slate400,
    faint: palette.slate300,
    inverse: palette.white,
  },

  error: palette.red600,
  errorLight: palette.red50,
  success: palette.green600,
  successLight: palette.green50,
  warning: palette.amber600,
  warningLight: palette.amber50,
  violet: palette.violet600,
  violetLight: palette.violet50,

  overlay: 'rgba(7, 17, 31, 0.55)',
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  gutter: 20,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const FontSize = {
  xxs: 11,
  xs: 12,
  sm: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  display: 44,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/** Font family names registered in the root layout via expo-font. */
export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
};

export const FontByWeight: Record<string, string> = {
  '100': Fonts.regular,
  '200': Fonts.regular,
  '300': Fonts.regular,
  '400': Fonts.regular,
  normal: Fonts.regular,
  '500': Fonts.medium,
  '600': Fonts.semibold,
  '700': Fonts.bold,
  bold: Fonts.bold,
  '800': Fonts.extrabold,
  '900': Fonts.extrabold,
};

export const Shadows = {
  /** Resting card — barely there, reads as a hairline lift */
  card: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Floating elements: sheets, primary CTA, ink cards */
  float: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  primary: {
    shadowColor: palette.blue600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
};

/** Motion: restraint lens — fast, near-invisible, never blocks the task. */
export const Motion = {
  fast: 140,
  base: 220,
  slow: 360,
  pressScale: 0.97,
};
