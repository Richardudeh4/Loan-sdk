import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, Radius, Spacing, Shadows, Motion, Fonts } from '@/constants/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverse' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string; shadow?: ViewStyle }> = {
  primary: { bg: Colors.primary, fg: Colors.text.inverse, shadow: Shadows.primary },
  secondary: { bg: Colors.primaryLight, fg: Colors.primaryDark },
  outline: { bg: Colors.background, fg: Colors.text.primary, border: Colors.borderStrong },
  ghost: { bg: 'transparent', fg: Colors.primary },
  danger: { bg: Colors.errorLight, fg: Colors.error },
  inverse: { bg: Colors.background, fg: Colors.ink[800] },
  glass: { bg: Colors.ink.glassStrong, fg: Colors.ink.text, border: Colors.ink.line },
};

const SIZES: Record<Size, ViewStyle & { fontSize: number }> = {
  sm: { minHeight: 40, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, fontSize: 14 },
  md: { minHeight: 54, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, fontSize: 15 },
  lg: { minHeight: 58, paddingHorizontal: Spacing.xl, borderRadius: Radius.md, fontSize: 16 },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityHint,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];
  const { fontSize, ...sizeStyle } = SIZES[size];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => { scale.value = withTiming(Motion.pressScale, { duration: Motion.fast }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: Motion.base }); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        sizeStyle,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        !isDisabled && v.shadow,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <AppText
            style={[{ fontFamily: Fonts.bold, fontSize, color: v.fg, letterSpacing: -0.1 }, textStyle]}
            numberOfLines={1}
          >
            {label}
          </AppText>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
  disabled: { opacity: 0.45 },
});
