import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, Fonts } from '@/constants/theme';
import { AppText } from './AppText';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  /** Locks the code while it's being verified */
  disabled?: boolean;
}

/**
 * Single hidden TextInput driving N display cells. This keeps SMS autofill,
 * paste and backspace behaving natively instead of juggling focus between
 * six inputs.
 */
export function OTPInput({
  length = 6,
  value,
  onChange,
  error = false,
  autoFocus = true,
  disabled = false,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withRepeat(withTiming(6, { duration: 80 }), 3, true),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const activeIndex = Math.min(value.length, length - 1);
  const showFocus = focused && !disabled;

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
      accessibilityLabel="Verification code"
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.row, shakeStyle, disabled && styles.rowDisabled]}>
        {Array.from({ length }, (_, i) => {
          const digit = value[i] ?? '';
          const isActive = showFocus && i === activeIndex && value.length < length + 1;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                digit ? styles.cellFilled : null,
                isActive ? styles.cellActive : null,
                error ? styles.cellError : null,
              ]}
            >
              {digit ? (
                <AppText style={styles.digit}>{digit}</AppText>
              ) : isActive ? (
                <Caret />
              ) : null}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

function Caret() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.caret, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  rowDisabled: { opacity: 0.6 },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: Colors.borderStrong, backgroundColor: Colors.primaryTint },
  cellActive: { borderColor: Colors.primary, borderWidth: 1.5 },
  cellError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  digit: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 36, color: Colors.text.primary },
  caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: Colors.primary },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
