import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthHeader } from '@/components/AuthHeader';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { api, ApiError } from '@/RequestHandler/Request';
import { toast } from 'sonner-native';
import { cleanPhone, validatePhone } from '@/utils/phone';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

/** "Ada  Okafor Nwosu" → { firstName: "Ada", lastName: "Okafor Nwosu" } */
function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(' ');
  return { firstName, lastName: lastName || undefined };
}

// Mirrors the backend signup rules so users see problems before submitting
function validatePassword(pw: string): string | undefined {
  if (!pw) return 'Password is required';
  if (pw.length < 8) return 'At least 8 characters required';
  if (pw.length > 72) return 'Password is too long (max 72 characters)';
  if (!/[A-Za-z]/.test(pw)) return 'Password needs at least one letter';
  if (!/\d/.test(pw)) return 'Password needs at least one number';
  return undefined;
}

export default function RegisterScreen() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const setField = (field: keyof FormData) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const name = form.fullName.trim();
    if (!name) newErrors.fullName = 'Full name is required';
    else if (name.split(/\s+/).some((part) => part.length > 100)) newErrors.fullName = 'Name is too long';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) newErrors.email = 'Enter a valid email';
    newErrors.phone = validatePhone(form.phone);
    newErrors.password = validatePassword(form.password);
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleRegister = async () => {
    if (loading || !agreedToTerms || !validate()) return;
    const phone = cleanPhone(form.phone);
    Keyboard.dismiss();
    setLoading(true);
    try {
      // Backend expects firstName/lastName (not fullName) and ignores unknown keys,
      // so sending the raw form silently dropped the user's name.
      const response = await api.auth.signup({
        ...splitName(form.fullName),
        email: form.email.trim().toLowerCase(),
        phone,
        password: form.password,
      });
      toast.success('Account created — check your phone for the code');
      router.replace({
        pathname: '/(auth)/otp',
        params: {
          response: JSON.stringify(response),
          phone,
          mode: 'verify-login',
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        // Show the server's field errors under the matching inputs
        const d = (err.details ?? {}) as Record<string, string[] | undefined>;
        setErrors({
          fullName: d.firstName?.[0] ?? d.lastName?.[0],
          email: d.email?.[0],
          phone: d.phone?.[0],
          password: d.password?.[0],
        });
      } else if (err instanceof ApiError && err.code === 'ACCOUNT_EXISTS') {
        toast.error('An account with this phone or email already exists. Try signing in.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      {/* No swipe-back mid-signup: the success handler would still navigate */}
      <Stack.Screen options={{ gestureEnabled: !loading }} />
      <AuthHeader
        backDisabled={loading}
        eyebrow="Get started"
        title="Create your account"
        subtitle="It takes about two minutes. You'll verify your phone next."
      />

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.form}>
        <AppInput
          label="Full name"
          icon="person-outline"
          placeholder="Ada Okafor"
          value={form.fullName}
          onChangeText={setField('fullName')}
          error={errors.fullName}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={emailRef}
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={setField('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={phoneRef}
          label="Phone number"
          icon="call-outline"
          placeholder="0801 234 5678"
          value={form.phone}
          onChangeText={setField('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={passwordRef}
          label="Password"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={form.password}
          onChangeText={setField('password')}
          error={errors.password}
          showPasswordToggle
          textContentType="newPassword"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={confirmRef}
          label="Confirm password"
          icon="lock-closed-outline"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChangeText={setField('confirmPassword')}
          error={errors.confirmPassword}
          showPasswordToggle
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          editable={!loading}
        />

        <Pressable
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          disabled={loading}
          style={[styles.termsRow, loading && styles.disabled]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms, disabled: loading }}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
            {agreedToTerms ? <Ionicons name="checkmark" size={14} color={Colors.text.inverse} /> : null}
          </View>
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            I agree to Fundly’s{' '}
            <AppText variant="bodySmall" color={Colors.text.primary} style={styles.link}>
              Terms of Service
            </AppText>{' '}
            and{' '}
            <AppText variant="bodySmall" color={Colors.text.primary} style={styles.link}>
              Privacy Policy
            </AppText>
            .
          </AppText>
        </Pressable>

        <AppButton
          label="Create account"
          onPress={handleRegister}
          loading={loading}
          disabled={!agreedToTerms}
        />
      </Animated.View>

      <View style={styles.footer}>
        <AppText variant="bodySmall">Already have an account? </AppText>
        <Pressable
          onPress={() => router.back()}
          disabled={loading}
          hitSlop={10}
          style={loading && styles.disabled}
          accessibilityRole="link"
          accessibilityState={{ disabled: loading }}
        >
          <AppText variant="bodySmall" color={Colors.primary} style={{ fontFamily: Fonts.bold }}>
            Sign in
          </AppText>
        </Pressable>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: Spacing.lg },
  disabled: { opacity: 0.4 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 4,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  link: { fontFamily: Fonts.semibold, textDecorationLine: 'underline' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
