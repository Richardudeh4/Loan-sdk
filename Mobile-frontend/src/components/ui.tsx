/**
 * Fundly UI kit — small, composable primitives shared by every screen.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextInput,
  TextInputProps,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Shadows, Motion, Fonts } from '@/constants/theme';
import type { StatusMeta } from '@/constants/status';
import { AppText } from './AppText';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ── IconButton ────────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  onPress,
  variant = 'surface',
  size = 40,
  iconSize = 20,
  color,
  badge,
  accessibilityLabel,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  variant?: 'surface' | 'glass' | 'plain' | 'tint';
  size?: number;
  iconSize?: number;
  color?: string;
  badge?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'glass' ? Colors.ink.glassStrong :
    variant === 'tint' ? Colors.primaryLight :
    variant === 'plain' ? 'transparent' : Colors.background;
  const fg =
    color ?? (variant === 'glass' ? Colors.ink.text : variant === 'tint' ? Colors.primary : Colors.text.primary);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        variant === 'surface' && styles.iconBtnSurface,
        variant === 'glass' && { borderWidth: 1, borderColor: Colors.ink.line },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={fg} />
      {badge ? <View style={styles.iconBadge} /> : null}
    </Pressable>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  padded = true,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const content = [styles.card, padded && styles.cardPadded, style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [content, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

// ── InkSurface: the dark "money" surface with layered SVG light ──────────────
export function InkSurface({
  children,
  style,
  radius = Radius.lg,
  glow = 'top-right',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  glow?: 'top-right' | 'top-left' | 'bottom';
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const gx = glow === 'top-left' ? '0%' : glow === 'bottom' ? '50%' : '100%';
  const gy = glow === 'bottom' ? '110%' : '0%';
  const ringX = glow === 'top-left' ? size.w * 1.05 : -size.w * 0.08;

  return (
    <View
      onLayout={onLayout}
      style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: Colors.ink[800] }, style]}
    >
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="inkBase" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={Colors.ink[700]} />
              <Stop offset="1" stopColor={Colors.ink[900]} />
            </LinearGradient>
            <RadialGradient id="inkGlow" cx={gx} cy={gy} rx="75%" ry="85%" fx={gx} fy={gy}>
              <Stop offset="0" stopColor="#2F7BEA" stopOpacity="0.55" />
              <Stop offset="0.45" stopColor="#1764D8" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#1764D8" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill="url(#inkBase)" />
          <Rect width={size.w} height={size.h} fill="url(#inkGlow)" />
          <Circle cx={ringX} cy={size.h * 1.02} r={size.h * 0.62} stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" />
          <Circle cx={ringX} cy={size.h * 1.02} r={size.h * 0.86} stroke="rgba(255,255,255,0.045)" strokeWidth={1} fill="none" />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

// ── StatusPill ────────────────────────────────────────────────────────────────
export function StatusPill({
  meta,
  onInk = false,
  showDot = true,
}: {
  meta: StatusMeta;
  onInk?: boolean;
  showDot?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: onInk ? Colors.ink.glassStrong : meta.bg },
        onInk && { borderWidth: 1, borderColor: Colors.ink.line },
      ]}
      accessibilityLabel={`Status: ${meta.label}`}
    >
      {showDot ? (
        <View style={[styles.pillDot, { backgroundColor: onInk ? Colors.ink.accent : meta.color }]} />
      ) : null}
      <AppText
        variant="caption"
        style={{ fontFamily: Fonts.bold, color: onInk ? Colors.ink.text : meta.color, letterSpacing: 0.2 }}
      >
        {meta.label}
      </AppText>
    </View>
  );
}

// ── ProgressBar (animated) ────────────────────────────────────────────────────
export function ProgressBar({
  value,
  color = Colors.primary,
  track = Colors.surfaceAlt,
  height = 6,
  style,
}: {
  value: number; // 0..1
  color?: string;
  track?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const clamped = Math.max(0, Math.min(1, isFinite(value) ? value : 0));
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color }, fill]} />
    </View>
  );
}

// ── SegmentedControl (animated indicator) ─────────────────────────────────────
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segW = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(index * segW, { duration: Motion.base, easing: Easing.out(Easing.cubic) });
  }, [index, segW, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[styles.segment, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segW > 0 ? <Animated.View style={[styles.segmentIndicator, { width: segW }, indicator]} /> : null}
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={styles.segmentItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText
              variant="label"
              numberOfLines={1}
              color={active ? Colors.text.primary : Colors.text.muted}
              style={{ fontFamily: active ? Fonts.bold : Fonts.semibold, fontSize: 13 }}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── ScreenHeader ──────────────────────────────────────────────────────────────
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screenHeader, { paddingTop: insets.top + Spacing.md }]}>
      <View style={{ flex: 1 }}>
        {subtitle ? <AppText variant="overline">{subtitle}</AppText> : null}
        <AppText variant="title" style={{ marginTop: subtitle ? 4 : 0 }}>
          {title}
        </AppText>
      </View>
      {right}
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  style,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <AppText variant="subheading">{title}</AppText>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button" style={styles.sectionAction}>
          <AppText variant="label" color={Colors.primary}>
            {action.label}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = 'primary',
  style,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === 'success' ? Colors.success : tone === 'warning' ? Colors.warning : tone === 'error' ? Colors.error : Colors.primary;
  const bg =
    tone === 'success' ? Colors.successLight : tone === 'warning' ? Colors.warningLight : tone === 'error' ? Colors.errorLight : Colors.primaryLight;
  return (
    <Card style={[styles.empty, style]}>
      <View style={[styles.emptyRing, { borderColor: bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={26} color={color} />
        </View>
      </View>
      <AppText variant="subheading" align="center" style={{ marginTop: Spacing.md }}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySmall" align="center" style={{ marginTop: Spacing.xs, maxWidth: 280 }}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  );
}

// ── KeyValueRow ───────────────────────────────────────────────────────────────
export function KeyValueRow({
  label,
  value,
  valueColor,
  labelColor,
  last = false,
  emphasis = false,
  onInk = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  labelColor?: string;
  last?: boolean;
  emphasis?: boolean;
  onInk?: boolean;
}) {
  return (
    <View
      style={[
        styles.kvRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: onInk ? Colors.ink.line : Colors.borderStrong },
      ]}
    >
      <AppText variant="bodySmall" color={labelColor ?? (onInk ? Colors.ink.textMuted : Colors.text.secondary)}>
        {label}
      </AppText>
      <AppText
        variant={emphasis ? 'subheading' : 'label'}
        tabular
        color={valueColor ?? (onInk ? Colors.ink.text : Colors.text.primary)}
        style={{ flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md }}
      >
        {value}
      </AppText>
    </View>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────
export function Banner({
  tone,
  text,
  icon,
  style,
}: {
  tone: 'error' | 'success' | 'warning' | 'info';
  text: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    error: { c: Colors.error, bg: Colors.errorLight, i: 'alert-circle' as IconName },
    success: { c: Colors.success, bg: Colors.successLight, i: 'checkmark-circle' as IconName },
    warning: { c: Colors.warning, bg: Colors.warningLight, i: 'time' as IconName },
    info: { c: Colors.primary, bg: Colors.primaryTint, i: 'information-circle' as IconName },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: map.bg }, style]} accessibilityRole="alert">
      <Ionicons name={icon ?? map.i} size={18} color={map.c} />
      <AppText variant="bodySmall" color={map.c} style={{ flex: 1, fontFamily: Fonts.medium }}>
        {text}
      </AppText>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({
  width,
  height,
  radius = 8,
  onInk = false,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  onInk?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.55, { duration: 700 })), -1);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: onInk ? Colors.ink.glassStrong : Colors.surfaceAlt },
        anim,
        style,
      ]}
    />
  );
}

// ── AmountField: large ₦ input ────────────────────────────────────────────────
export function AmountField({
  label,
  value,
  onChangeText,
  error,
  hint,
  ...rest
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  hint?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? <AppText variant="label" style={{ marginBottom: Spacing.sm - 2 }}>{label}</AppText> : null}
      <View
        style={[
          styles.amountField,
          { borderColor: error ? Colors.error : focused ? Colors.primary : Colors.border },
        ]}
      >
        <AppText style={styles.amountPrefix}>₦</AppText>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={Colors.text.faint}
          keyboardType="decimal-pad"
          selectionColor={Colors.primary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? 'Amount in naira'}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={Colors.error} style={{ marginTop: 6 }}>{error}</AppText>
      ) : hint ? (
        <AppText variant="caption" style={{ marginTop: 6 }}>{hint}</AppText>
      ) : null}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ onInk = false, style }: { onInk?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: onInk ? Colors.ink.line : Colors.borderStrong },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  iconBtnSurface: { borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
  iconBadge: {
    position: 'absolute', top: 9, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: Colors.ink[800],
  },

  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardPadded: { padding: Spacing.gutter },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },

  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 4,
  },
  segmentIndicator: {
    position: 'absolute', top: 4, bottom: 4, left: 4,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    ...Shadows.card,
    shadowOpacity: 0.08,
  },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm + 4,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  emptyRing: { padding: 6, borderRadius: 40, borderWidth: 1 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  kvRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
  },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.sm, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.sm + 4,
  },

  amountField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, minHeight: 64,
    backgroundColor: Colors.background,
  },
  amountPrefix: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 38, color: Colors.text.muted, marginRight: 6 },
  amountInput: {
    flex: 1, fontFamily: Fonts.serif, fontSize: 32, color: Colors.text.primary,
    paddingVertical: Spacing.sm,
  },
});
