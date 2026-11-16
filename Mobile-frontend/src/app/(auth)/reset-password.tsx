import React, { useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AuthHeader } from '@/components/AuthHeader';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  // email + otp will be sent to the reset API once it exists
  useLocalSearchParams<{ email: string; otp: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One symbol', met: /[!@#$%^&*]/.test(password) },
  ];

  const score = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[!@#$%^&*]/.test(password)].filter(Boolean).length;
  const strength =
    password.length === 0 ? { label: '', color: Colors.border, segments: 0 } :
    score <= 2 ? { label: 'Weak', color: Colors.error, segments: 1 } :
    score <= 3 ? { label: 'Fair', color: Colors.warning, segments: 2 } :
    score === 4 ? { label: 'Good', color: Colors.primary, segments: 3 } :
    { label: 'Strong', color: Colors.success, segments: 4 };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'At least 8 characters required';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (loading || !validate()) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      // TODO: call reset password API with email, otp, password
      await new Promise((r) => setTimeout(r, 1200));
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <KeyboardView scrollEnabled={false}>
        <View style={styles.successContainer}>
          <Animated.View entering={ZoomIn.duration(400)} style={styles.successRing}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={36} color={Colors.text.inverse} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={{ alignItems: 'center', gap: Spacing.sm }}>
            <AppText variant="displayMedium" align="center">Password updated</AppText>
            <AppText variant="body" align="center" style={{ maxWidth: 300 }}>
              You can now sign in with your new password.
            </AppText>
          </Animated.View>
          <AppButton
            label="Back to sign in"
            onPress={() => router.replace('/(auth)')}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </KeyboardView>
    );
  }

  return (
    <KeyboardView>
      <Stack.Screen options={{ gestureEnabled: !loading }} />
      <AuthHeader
        backDisabled={loading}
        eyebrow="Account recovery"
        title="Choose a new password"
        subtitle="Make it something you haven't used before on Fundly."
      />

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.content}>
        <AppInput
          label="New password"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
          error={errors.password}
          showPasswordToggle
          textContentType="newPassword"
          autoFocus
          containerStyle={{ marginBottom: Spacing.sm + 2 }}
          editable={!loading}
        />

        <View style={styles.strengthRow}>
          <View style={styles.segments}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.segment, { backgroundColor: i < strength.segments ? strength.color : Colors.border }]}
              />
            ))}
          </View>
          <AppText variant="caption" color={strength.color} style={{ width: 48, textAlign: 'right' }}>
            {strength.label}
          </AppText>
        </View>

        <AppInput
          label="Confirm new password"
          icon="lock-closed-outline"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
          error={errors.confirmPassword}
          showPasswordToggle
          textContentType="newPassword"
          editable={!loading}
        />

        <View style={styles.requirements}>
          {checks.map((req) => (
            <View key={req.label} style={styles.reqRow}>
              <View style={[styles.reqIcon, req.met && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                {req.met ? <Ionicons name="checkmark" size={11} color={Colors.text.inverse} /> : null}
              </View>
              <AppText variant="bodySmall" color={req.met ? Colors.text.primary : Colors.text.muted}>
                {req.label}
              </AppText>
            </View>
          ))}
        </View>

        <AppButton label="Update password" onPress={handleReset} loading={loading} />
      </Animated.View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, flex: 1 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  requirements: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm + 2,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2 },
  reqIcon: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  successRing: {
    padding: 10, borderRadius: 60,
    backgroundColor: Colors.successLight,
  },
  successIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
});
