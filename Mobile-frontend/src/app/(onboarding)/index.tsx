import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useOnboardingStore } from '@/store/onboarding';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { InkSurface, ProgressBar } from '@/components/ui';
import { Money } from '@/components/loan';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  art: 'approve' | 'track' | 'control';
}

const slides: Slide[] = [
  {
    id: '1',
    eyebrow: 'Borrow',
    title: 'Credit that moves\nat your pace.',
    subtitle: 'Apply in minutes with clear terms up front — no paperwork, no queues, no surprises.',
    art: 'approve',
  },
  {
    id: '2',
    eyebrow: 'Repay',
    title: 'Every instalment,\nin plain sight.',
    subtitle: 'See your full schedule, what is due next, and how far you have come — always up to date.',
    art: 'track',
  },
  {
    id: '3',
    eyebrow: 'Control',
    title: 'Your money,\nyour terms.',
    subtitle: 'Pay in full or in part, whenever it suits you. Secure sign-in protects every action.',
    art: 'control',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { completeOnboarding } = useOnboardingStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  useStatusBarStyle('light');

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(auth)');
  };

  const goNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const isLast = activeIndex === slides.length - 1;
  const artHeight = Math.max(320, height * 0.52);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <InkSurface
              radius={0}
              glow={index === 1 ? 'top-left' : 'top-right'}
              style={[styles.art, { height: artHeight, paddingTop: insets.top }]}
            >
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <AppText style={styles.brandMarkText}>f</AppText>
                </View>
                <AppText style={styles.brandName}>Fundly</AppText>
              </View>
              <View style={styles.artStage}>
                {item.art === 'approve' && <ApproveArt />}
                {item.art === 'track' && <TrackArt />}
                {item.art === 'control' && <ControlArt />}
              </View>
            </InkSurface>

            <View style={styles.copy}>
              <AppText variant="overline" color={Colors.primary}>
                {String(index + 1).padStart(2, '0')} — {item.eyebrow}
              </AppText>
              <AppText variant="displayMedium" style={styles.title}>
                {item.title}
              </AppText>
              <AppText variant="body" style={styles.subtitle}>
                {item.subtitle}
              </AppText>
            </View>
          </View>
        )}
      />

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Dot key={i} active={i === activeIndex} />
          ))}
        </View>
        <View style={styles.buttonRow}>
          {!isLast ? (
            <Pressable onPress={handleGetStarted} hitSlop={12} style={styles.skip} accessibilityRole="button">
              <AppText variant="label" color={Colors.text.muted}>
                Skip
              </AppText>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <AppButton
              label={isLast ? 'Get started' : 'Continue'}
              onPress={goNext}
              rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 6, { duration: 240 }),
    backgroundColor: withTiming(active ? Colors.primary : Colors.borderStrong, { duration: 240 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

// ── Illustrations — composed from live UI, not stock art ─────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

function ApproveArt() {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ width: '100%', alignItems: 'center' }}>
      <GlassCard style={{ width: '82%' }}>
        <View style={styles.artRow}>
          <View style={[styles.artBadge, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
            <Ionicons name="checkmark" size={14} color="#6EE7B7" />
          </View>
          <AppText variant="caption" color={Colors.ink.textMuted} style={{ fontFamily: Fonts.semibold }}>
            Loan approved
          </AppText>
        </View>
        <View style={{ marginTop: Spacing.md }}>
          <Money kobo={25_000_000} size="lg" color={Colors.ink.text} />
        </View>
        <View style={[styles.artRow, { marginTop: Spacing.md, justifyContent: 'space-between' }]}>
          <AppText variant="caption" color={Colors.ink.textFaint}>12 months · 15% p.a.</AppText>
          <AppText variant="caption" color={Colors.ink.accent} style={{ fontFamily: Fonts.semibold }}>
            Ready to disburse
          </AppText>
        </View>
      </GlassCard>
      <GlassCard style={styles.artChip}>
        <Ionicons name="flash" size={14} color={Colors.ink.accent} />
        <AppText variant="caption" color={Colors.ink.text} style={{ fontFamily: Fonts.semibold }}>
          Decision in minutes
        </AppText>
      </GlassCard>
    </Animated.View>
  );
}

function TrackArt() {
  const statuses = ['p', 'p', 'p', 'p', 'p', 'p', 'n', 'u', 'u', 'u', 'u', 'u'];
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ width: '82%' }}>
      <GlassCard>
        <View style={[styles.artRow, { justifyContent: 'space-between' }]}>
          <AppText variant="caption" color={Colors.ink.textMuted} style={{ fontFamily: Fonts.semibold }}>
            Repayment progress
          </AppText>
          <AppText variant="caption" color={Colors.ink.text} style={{ fontFamily: Fonts.bold }}>
            6 of 12
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.md, flexWrap: 'wrap' }}>
          {statuses.map((s, i) => (
            <View
              key={i}
              style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: s === 'p' ? Colors.ink.accent : 'transparent',
                borderWidth: s === 'p' ? 0 : 1.5,
                borderColor: s === 'n' ? Colors.ink.accent : Colors.ink.textFaint,
              }}
            />
          ))}
        </View>
        <ProgressBar value={0.5} color={Colors.ink.accent} track={Colors.ink.glass} height={4} style={{ marginTop: Spacing.md }} />
      </GlassCard>
      <GlassCard style={{ marginTop: Spacing.sm + 4, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 }}>
        <View style={[styles.artBadge, { backgroundColor: Colors.ink.glassStrong, width: 36, height: 36, borderRadius: 18 }]}>
          <Ionicons name="calendar-outline" size={16} color={Colors.ink.text} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={Colors.ink.textFaint}>Next instalment</AppText>
          <AppText variant="label" color={Colors.ink.text}>Due in 9 days</AppText>
        </View>
        <AppText style={{ fontFamily: Fonts.serif, fontSize: 22, color: Colors.ink.text }}>₦22,565</AppText>
      </GlassCard>
    </Animated.View>
  );
}

function ControlArt() {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
      <View style={styles.ring3}>
        <View style={styles.ring2}>
          <View style={styles.ring1}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.ink.text} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
        {[
          { i: 'key-outline' as const, t: 'OTP sign-in' },
          { i: 'eye-outline' as const, t: 'Clear pricing' },
          { i: 'swap-horizontal' as const, t: 'Part payments' },
        ].map((c) => (
          <GlassCard key={c.t} style={styles.controlChip}>
            <Ionicons name={c.i} size={13} color={Colors.ink.accent} />
            <AppText variant="caption" color={Colors.ink.text} style={{ fontFamily: Fonts.semibold, fontSize: 11 }}>
              {c.t}
            </AppText>
          </GlassCard>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  art: { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  brandMark: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  brandMarkText: { fontFamily: Fonts.serifItalic, fontSize: 22, lineHeight: 26, color: Colors.text.inverse, marginTop: -2 },
  brandName: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink.text, letterSpacing: -0.2 },
  artStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },

  glass: {
    backgroundColor: Colors.ink.glass,
    borderWidth: 1, borderColor: Colors.ink.line,
    borderRadius: Radius.lg, padding: Spacing.gutter,
  },
  artRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  artBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  artChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.full,
    alignSelf: 'flex-end', marginRight: '6%', marginTop: -14,
    backgroundColor: Colors.ink[600],
  },

  ring3: { width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: Colors.ink.line, alignItems: 'center', justifyContent: 'center' },
  ring2: { width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(141,184,247,0.25)', alignItems: 'center', justifyContent: 'center' },
  ring1: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  controlChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderRadius: Radius.full },

  copy: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.sm + 2 },
  title: { marginTop: 2 },
  subtitle: { maxWidth: 360 },

  controls: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.lg, backgroundColor: Colors.canvas },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  skip: { paddingHorizontal: Spacing.sm, minHeight: 54, justifyContent: 'center' },
});
