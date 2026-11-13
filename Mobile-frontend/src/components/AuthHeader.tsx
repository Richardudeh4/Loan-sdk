import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { IconButton } from './ui';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  showBack?: boolean;
  style?: ViewStyle;
}

export function AuthHeader({ title, subtitle, eyebrow, showBack = true, style }: AuthHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }, style]}>
      {showBack ? (
        <IconButton
          icon="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.back}
        />
      ) : null}
      <Animated.View entering={FadeInDown.duration(360)} style={styles.titleBlock}>
        {eyebrow ? (
          <AppText variant="overline" color={Colors.primary}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="displayMedium">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  back: { marginBottom: Spacing.lg, marginLeft: -4 },
  titleBlock: { gap: Spacing.sm },
  subtitle: { maxWidth: 340 },
});
