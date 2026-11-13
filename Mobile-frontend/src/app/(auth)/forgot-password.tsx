import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthHeader } from '@/components/AuthHeader';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) { setError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return false; }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // TODO: call forgot password API
      await new Promise((r) => setTimeout(r, 1200));
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      <AuthHeader
        eyebrow="Account recovery"
        title="Reset your password"
        subtitle="Enter the email on your account and we'll send you a 6-digit reset code."
      />

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.content}>
        <AppInput
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(undefined); }}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={handleSendOTP}
        />

        <AppButton label="Send reset code" onPress={handleSendOTP} loading={loading} />

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.text.muted} />
          <AppText variant="caption" style={{ flex: 1 }}>
            For your security, we never ask for your password or code by phone, SMS or email.
          </AppText>
        </View>

        <AppButton
          label="Back to sign in"
          onPress={() => router.back()}
          variant="ghost"
          style={{ marginTop: Spacing.md }}
        />
      </Animated.View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, flex: 1 },
  note: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    padding: Spacing.sm + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
});
