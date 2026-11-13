import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthHeader } from '@/components/AuthHeader';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { OTPInput } from '@/components/OTPInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { api, ApiError, TokenStorage } from '@/RequestHandler/Request';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner-native';

const OTP_RESEND_TIMEOUT = 60;

export default function OTPScreen() {
  const router = useRouter();
  const { response, email: emailParam, phone, mode } = useLocalSearchParams<{
    response: string;
    email: string;
    phone: string;
    mode?: string;
  }>();

  const isVerifyLogin = mode === 'verify-login'; // signup OTP not completed
  const isLoginOtp = mode === 'verify-login-otp'; // normal login 2FA
  const isPhoneFlow = isVerifyLogin || isLoginOtp;

  // email may come directly as a param (forgot-password flow) or nested in the response JSON (register flow)
  const email: string =
    emailParam ??
    (() => {
      try {
        return JSON.parse(response ?? '{}')?.email ?? '';
      } catch {
        return '';
      }
    })();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(OTP_RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => clearTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startCountdown = () => {
    setCountdown(OTP_RESEND_TIMEOUT);
    setCanResend(false);
    clearTimer();
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      if (isLoginOtp) {
        const result = await api.auth.verifyLoginOtp({ phone: phone!, code: otp });
        await TokenStorage.saveTokens(result.accessToken, result.refreshToken);
        useAuthStore.getState().setAuth(result.user, result.accessToken);
        toast.success('Welcome back');
        router.replace('/(tabs)');
      } else if (isVerifyLogin) {
        const result = await api.auth.verifyOtp({ phone: phone!, code: otp });
        await TokenStorage.saveTokens(result.accessToken, result.refreshToken);
        const me = await api.me();
        useAuthStore.getState().setAuth(me, result.accessToken);
        toast.success('Phone verified — welcome to Fundly');
        router.replace('/(tabs)');
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        router.replace({ pathname: '/(auth)/reset-password', params: { email, otp, phone } });
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'OTP_INVALID' || err.code === 'OTP_TOO_MANY_ATTEMPTS')) {
        toast.error(err.code === 'OTP_TOO_MANY_ATTEMPTS' ? 'Too many attempts. Request a new code.' : 'That code is not valid. Please try again.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    if (isPhoneFlow && phone) {
      try {
        await api.auth.sendOtp({ phone });
        toast.success('A new code is on its way');
      } catch {
        toast.error('Could not resend the code. Please try again.');
      }
    }
    setOtp('');
    setError(false);
    startCountdown();
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(?=@)/, (_, a, b) => a + '•'.repeat(b.length))
    : 'your email';
  const maskedPhone = phone ? phone.replace(/^(.*)(.{4})$/, (_, a, b) => a.replace(/\d/g, '•') + b) : '';
  const destination = isPhoneFlow ? maskedPhone : maskedEmail;

  return (
    <KeyboardView>
      <AuthHeader
        eyebrow="Verification"
        title={isPhoneFlow ? 'Enter your code' : 'Check your email'}
        subtitle={`We sent a 6-digit code to ${destination}. It expires shortly.`}
      />

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.content}>
        <View style={styles.destination}>
          <View style={styles.destIcon}>
            <Ionicons name={isPhoneFlow ? 'chatbubble-ellipses-outline' : 'mail-outline'} size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption">Sent to</AppText>
            <AppText variant="label">{destination}</AppText>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
            <AppText variant="label" color={Colors.primary}>Change</AppText>
          </Pressable>
        </View>

        <OTPInput
          value={otp}
          onChange={(v) => { setOtp(v); if (error) setError(false); }}
          error={error}
        />

        {error ? (
          <AppText variant="caption" color={Colors.error} style={styles.errorText}>
            That code didn't work. Check it and try again.
          </AppText>
        ) : null}

        <View style={styles.resendRow}>
          <AppText variant="bodySmall">Didn't get it? </AppText>
          {canResend ? (
            <Pressable onPress={handleResend} hitSlop={10} accessibilityRole="button">
              <AppText variant="bodySmall" color={Colors.primary} style={{ fontFamily: Fonts.bold }}>
                Resend code
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="bodySmall" color={Colors.text.muted} tabular>
              Resend in 0:{String(countdown).padStart(2, '0')}
            </AppText>
          )}
        </View>

        <AppButton
          label="Verify and continue"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length < 6}
        />
      </Animated.View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, flex: 1 },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.lg,
  },
  destIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { marginTop: Spacing.sm + 2 },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
