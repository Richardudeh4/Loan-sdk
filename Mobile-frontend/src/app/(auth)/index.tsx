import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { api, ApiError } from '@/RequestHandler/Request';
import { toast } from 'sonner-native';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'At least 6 characters required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    const body = { phone: phone.trim(), password };
    setLoading(true);
    try {
      await api.auth.login(body);
      toast.success('We sent a code to your phone');
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: phone.trim(), mode: 'verify-login-otp' },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PHONE_NOT_VERIFIED') {
        try {
          await api.auth.sendOtp({ phone: phone.trim() });
        } catch {
          // OTP screen has a resend button — navigate anyway
        }
        toast.warning('Please verify your phone number first');
        router.push({
          pathname: '/(auth)/otp',
          params: { phone: phone.trim(), mode: 'verify-login' },
        });
      } else {
        const msg = err instanceof ApiError ? err.message : 'Sign in failed. Please try again.';
        toast.error(msg);
        setErrors({ phone: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}
      >
        <View style={styles.logoMark}>
          <Image style={styles.logoImage} source={require('../../../assets/images/appstore.png')} />
        </View>
        <AppText variant="overline" color={Colors.primary} style={{ marginTop: Spacing.lg }}>
          Fundly
        </AppText>
        <AppText variant="displayMedium" style={styles.title}>
          Welcome back.
        </AppText>
        <AppText variant="body">Sign in to manage your loans and repayments.</AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.form}>
        <AppInput
          label="Phone number"
          icon="call-outline"
          placeholder="+234 801 234 5678"
          value={phone}
          onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: undefined })); }}
          error={errors.phone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <AppInput
          ref={passwordRef}
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter your password"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
          error={errors.password}
          showPasswordToggle
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          hitSlop={10}
          style={styles.forgotLink}
          accessibilityRole="link"
        >
          <AppText variant="label" color={Colors.primary}>
            Forgot password?
          </AppText>
        </Pressable>

        <AppButton label="Sign in" onPress={handleSignIn} loading={loading} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <AppText variant="caption">or</AppText>
          <View style={styles.dividerLine} />
        </View>

        <AppButton
          label="Continue with Google"
          onPress={() => toast.info('Google sign-in is coming soon')}
          variant="outline"
          leftIcon={<Ionicons name="logo-google" size={18} color={Colors.text.primary} />}
        />
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.secureNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.text.muted} />
          <AppText variant="caption">Protected with one-time passcode verification</AppText>
        </View>
        <View style={styles.footerRow}>
          <AppText variant="bodySmall">New to Fundly? </AppText>
          <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={10} accessibilityRole="link">
            <AppText variant="bodySmall" color={Colors.primary} style={{ fontFamily: Fonts.bold }}>
              Create an account
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  logoMark: {
    width: 56, height: 56, borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 56, height: 56 },
  title: { marginTop: 2 },
  form: { paddingHorizontal: Spacing.lg },
  forgotLink: { alignSelf: 'flex-end', marginTop: -Spacing.xs, marginBottom: Spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderStrong },
  footer: { marginTop: 'auto', paddingTop: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
