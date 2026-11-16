import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, FontSize, Spacing, Fonts } from '@/constants/theme';
import { AppText } from './AppText';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Ionicons name rendered at the start of the field. */
  icon?: IconName;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    error,
    hint,
    icon,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    showPasswordToggle = false,
    secureTextEntry,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = showPasswordToggle ? !isPasswordVisible : secureTextEntry;

  const borderColor = error ? Colors.error : isFocused ? Colors.primary : Colors.border;
  const iconColor = error ? Colors.error : isFocused ? Colors.primary : Colors.text.muted;

  const start = leftIcon ?? (icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          { borderColor },
          isFocused && !error && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        {start ? <View style={styles.leftIcon}>{start}</View> : null}
        <TextInput
          ref={ref}
          style={[styles.input, start ? styles.inputWithLeft : null, style]}
          placeholderTextColor={Colors.text.faint}
          selectionColor={Colors.primary}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {showPasswordToggle ? (
          <Pressable
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.text.muted}
            />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.error} />
          <AppText variant="caption" color={Colors.error} style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md + 2 },
  label: { marginBottom: Spacing.sm - 2, color: Colors.text.primary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 54,
    backgroundColor: Colors.background,
  },
  fieldFocused: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  fieldError: { backgroundColor: '#FFFBFB' },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  inputWithLeft: { paddingLeft: Spacing.sm + 2 },
  leftIcon: { paddingLeft: Spacing.md },
  // alignSelf: 'stretch' fills the row's height for a full-height tap target.
  // Don't use height: '100%' — the field has no fixed height, so a percentage
  // makes Yoga balloon the whole input.
  rightIcon: { paddingRight: Spacing.md, paddingLeft: Spacing.xs, alignSelf: 'stretch', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm - 2, gap: 4 },
  messageText: { flex: 1 },
  hint: { marginTop: Spacing.sm - 2 },
});
