import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Image, TextInput, useWindowDimensions } from 'react-native';
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
  // Short screens (iPhone SE / mini, Android with large font) get tighter spacing
  // so the whole form + CTA fits without scrolling.
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const logoSize = compact ? 44 : 56;
  const passwordRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  // The backend rejects spaces/dashes, but users naturally type "+234 801 234 5678"
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!cleanPhone) newErrors.phone = 'Phone number is required';
    else if (cleanPhone.replace(/\D/g, '').length < 10) newErrors.phone = 'Enter a valid phone number';
    // No length rule here: sign-in should accept whatever password the account has
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    try {
      await api.auth.login({ phone: cleanPhone, password });
      toast.success('We sent a code to your phone');
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: cleanPhone, mode: 'verify-login-otp' },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PHONE_NOT_VERIFIED') {
        try {
          await api.auth.sendOtp({ phone: cleanPhone });
        } catch {
          // OTP screen has a resend button — navigate anyway
        }
        toast.warning('Please verify your phone number first');
        router.push({
          pathname: '/(auth)/otp',
          params: { phone: cleanPhone, mode: 'verify-login' },
        });
      } else if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        // Can't tell which field is wrong — show it once, under the password
        setErrors({ password: err.message });
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        const phoneErr = (err.details?.phone as string[] | undefined)?.[0];
        setErrors({ phone: phoneErr ?? err.message });
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[
            styles.header,
            {
              paddingTop: insets.top + (compact ? Spacing.md : Spacing.xl),
              paddingBottom: compact ? Spacing.lg : Spacing.xl,
            },
          ]}
        >
          <View style={[styles.logoMark, { width: logoSize, height: logoSize }]}>
            <Image
              style={{ width: logoSize, height: logoSize }}
              source={require('../../../assets/images/appstore.png')}
              accessibilityIgnoresInvertColors
            />
          </View>
          <AppText
            variant="overline"
            color={Colors.primary}
            style={{ marginTop: compact ? Spacing.md : Spacing.lg }}
          >
            Fundly
          </AppText>
          <AppText variant={compact ? 'title' : 'displayMedium'} style={styles.title}>
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
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  // Fills the scroll area (so the footer can sit at the bottom) and caps the
  // width so the form doesn't stretch edge-to-edge on tablets / landscape.
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  logoMark: {
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  title: { marginTop: 2 },
  form: { paddingHorizontal: Spacing.lg },
  forgotLink: { alignSelf: 'flex-end', marginTop: -Spacing.xs, marginBottom: Spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderStrong },
  footer: { marginTop: 'auto', paddingTop: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
