import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { Colors, FontByWeight, Fonts, FontSize } from '@/constants/theme';

export type TextVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'overline'
  | 'money'
  | 'moneyLarge';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Use tabular figures so columns of numbers line up. */
  tabular?: boolean;
  children: React.ReactNode;
}

/**
 * Typography primitive.
 *
 * Custom fonts are registered one family per weight, so `fontWeight` in a
 * style is translated into the matching Manrope family here (Android ignores
 * fontWeight on custom fonts; iOS may fall back to the system font).
 */
export function AppText({
  variant = 'body',
  color,
  align,
  tabular,
  style,
  children,
  ...rest
}: AppTextProps) {
  const base = styles[variant];
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const { fontWeight, ...restStyle } = flat;

  const isSerif = base.fontFamily === Fonts.serif || restStyle.fontFamily === Fonts.serif;
  const family =
    restStyle.fontFamily ??
    (fontWeight && !isSerif ? FontByWeight[String(fontWeight)] ?? base.fontFamily : base.fontFamily);

  return (
    <Text
      style={[
        base,
        restStyle,
        { fontFamily: family },
        color ? { color } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  displayLarge: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.display,
    lineHeight: 48,
    letterSpacing: -0.6,
    color: Colors.text.primary,
  },
  displayMedium: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
    color: Colors.text.primary,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: Colors.text.primary,
  },
  heading: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.xl,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Colors.text.primary,
  },
  subheading: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.lg,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: Colors.text.primary,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
    color: Colors.text.secondary,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.xs,
    lineHeight: 16,
    color: Colors.text.muted,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.xxs,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.text.muted,
  },
  money: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xxl,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: Colors.text.primary,
  },
  moneyLarge: {
    fontFamily: Fonts.serif,
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1,
    color: Colors.text.primary,
  },
});
