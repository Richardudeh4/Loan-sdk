import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthHeader } from '@/components/AuthHeader';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardView } from '@/components/KeyboardView';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { api } from '@/RequestHandler/Request';
import { toast } from 'sonner-native';

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

export default function RegisterScreen() {
  const router = useRouter();
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
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (form.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Enter a valid phone number';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'At least 8 characters required';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    if (!agreedToTerms) return;
    setLoading(true);
    try {
      const response = await api.auth.signup(form);
      toast.success('Account created — check your phone for the code');
      router.replace({
        pathname: '/(auth)/otp',
        params: {
          response: JSON.stringify(response),
          phone: form.phone.trim(),
          mode: 'verify-login',
        },
      });
    } catch (error: any) {
      toast.error(error?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      <AuthHeader
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
        />

        <AppInput
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={setField('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <AppInput
          label="Phone number"
          icon="call-outline"
          placeholder="+234 801 234 5678"
          value={form.phone}
          onChangeText={setField('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />

        <AppInput
          label="Password"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={form.password}
          onChangeText={setField('password')}
          error={errors.password}
          showPasswordToggle
          textContentType="newPassword"
          hint="Mix letters, numbers and symbols for a stronger password"
        />

        <AppInput
          label="Confirm password"
          icon="lock-closed-outline"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChangeText={setField('confirmPassword')}
          error={errors.confirmPassword}
          showPasswordToggle
          textContentType="newPassword"
        />

        <Pressable
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          style={styles.termsRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms }}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
            {agreedToTerms ? <Ionicons name="checkmark" size={14} color={Colors.text.inverse} /> : null}
          </View>
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            I agree to Fundly's{' '}
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
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="link">
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
