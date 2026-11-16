import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner, ScreenHeader } from '@/components/ui';
import { Colors, Spacing, Radius, FontSize, Fonts, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { api, ApiError, TokenStorage } from '@/RequestHandler/Request';
import { initials } from '@/utils/format';
import { toast } from 'sonner-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Rows ──────────────────────────────────────────────────────────────────────
interface SettingRowProps {
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  last?: boolean;
}

function SettingRow({ icon, iconColor, iconBg, label, sublabel, value, onPress, right, destructive, last }: SettingRowProps) {
  const fg = destructive ? Colors.error : iconColor ?? Colors.text.primary;
  const bg = destructive ? Colors.errorLight : iconBg ?? Colors.surfaceAlt;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress ? { backgroundColor: Colors.surface } : null]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={destructive ? Colors.error : Colors.text.primary}>
            {label}
          </AppText>
          {sublabel ? <AppText variant="caption" style={{ marginTop: 1 }}>{sublabel}</AppText> : null}
        </View>
        {value ? <AppText variant="bodySmall" color={Colors.text.muted} style={{ marginRight: 4 }}>{value}</AppText> : null}
        {right ?? (onPress && !destructive ? <Ionicons name="chevron-forward" size={16} color={Colors.text.faint} /> : null)}
      </View>
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: Spacing.lg }}>
      <AppText variant="overline" style={styles.groupTitle}>{title}</AppText>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

// ── Edit profile sheet content ────────────────────────────────────────────────
function EditProfileForm({
  onSaved,
  onBusyChange,
}: {
  /** Lets the parent stop the sheet being swiped away mid-save */
  onBusyChange?: (busy: boolean) => void;
  onSaved: (updated: { firstName: string | null; lastName: string | null; email: string | null; profileImage: string | null }) => void;
}) {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewUri = localImageUri ?? user?.profileImage ?? null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLocalImageUri(result.assets[0].uri);
      setError('');
    }
  };

  const handleSave = async () => {
    if (saving) return;
    Keyboard.dismiss();
    setSaving(true);
    onBusyChange?.(true);
    setError('');
    try {
      let newProfileImage = user?.profileImage ?? null;
      if (localImageUri) {
        setUploadingPhoto(true);
        const asset = localImageUri;
        const ext = asset.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const uploaded = await api.uploadAvatar(asset, mime);
        newProfileImage = uploaded.profileImage;
        setUploadingPhoto(false);
      }

      const patch: Record<string, string> = {};
      if (firstName.trim() !== (user?.firstName ?? '')) patch.firstName = firstName.trim();
      if (lastName.trim() !== (user?.lastName ?? '')) patch.lastName = lastName.trim();
      if (email.trim() !== (user?.email ?? '')) patch.email = email.trim();

      if (Object.keys(patch).length > 0) {
        const updated = await api.updateMe(patch);
        newProfileImage = updated.profileImage ?? newProfileImage;
        useAuthStore.getState().setAuth(
          { ...user!, ...patch, profileImage: newProfileImage },
          useAuthStore.getState().token!,
        );
      } else if (localImageUri) {
        useAuthStore.getState().setAuth(
          { ...user!, profileImage: newProfileImage },
          useAuthStore.getState().token!,
        );
      }

      toast.success('Profile updated');
      onSaved({
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        email: user?.email ?? null,
        profileImage: newProfileImage,
      });
    } catch (err) {
      setUploadingPhoto(false);
      const msg = err instanceof ApiError ? err.message : 'Save failed. Please try again.';
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  return (
    <View style={styles.sheetContent}>
      <AppText variant="title">Edit profile</AppText>
      <AppText variant="bodySmall" style={{ marginTop: 4 }}>
        This is how you appear across Fundly.
      </AppText>

      <Pressable
        style={[styles.photoPicker, saving && { opacity: 0.5 }]}
        onPress={pickImage}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        accessibilityState={{ disabled: saving }}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={34} color={Colors.text.faint} />
          </View>
        )}
        <View style={styles.photoBadge}>
          <Ionicons name="camera" size={14} color={Colors.text.inverse} />
        </View>
      </Pressable>

      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={styles.fieldLabel}>First name</AppText>
          <BottomSheetTextInput
            style={styles.sheetInput}
            placeholder="First name"
            placeholderTextColor={Colors.text.faint}
            value={firstName}
            onChangeText={setFirstName}
            editable={!saving}
            autoCapitalize="words"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={styles.fieldLabel}>Last name</AppText>
          <BottomSheetTextInput
            style={styles.sheetInput}
            placeholder="Last name"
            placeholderTextColor={Colors.text.faint}
            value={lastName}
            onChangeText={setLastName}
            editable={!saving}
            autoCapitalize="words"
          />
        </View>
      </View>

      <AppText variant="label" style={styles.fieldLabel}>Email address</AppText>
      <BottomSheetTextInput
        style={styles.sheetInput}
        placeholder="you@example.com"
        placeholderTextColor={Colors.text.faint}
        value={email}
        onChangeText={setEmail}
        editable={!saving}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {error ? <Banner tone="error" text={error} style={{ marginTop: Spacing.md }} /> : null}

      <AppButton
        label={uploadingPhoto ? 'Uploading photo…' : 'Save changes'}
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: Spacing.lg }}
      />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  useStatusBarStyle('dark');
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sheetRef = useRef<BottomSheet>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const snapPoints = ['75%', '92%'];

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : undefined;
  const displayPhone = user?.phone ?? '';
  const displayEmail = user?.email;
  const profileImage = user?.profileImage;
  const verified = user?.identityStatus === 'VERIFIED';

  const openSheet = useCallback(() => sheetRef.current?.snapToIndex(0), []);
  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior={profileSaving ? 'none' : 'close'}
      />
    ),
    [profileSaving],
  );

  const handleLogout = () => {
    Alert.alert('Sign out of Fundly?', 'You will need your password and a one-time code to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          if (loggingOut) return;
          setLoggingOut(true);
          try {
            const refreshToken = await TokenStorage.getRefreshToken();
            if (refreshToken) await api.auth.logout({ refreshToken }).catch(() => {});
          } finally {
            await TokenStorage.clearTokens();
            logout();
            toast.success('Signed out');
            router.replace('/(auth)');
          }
        },
      },
    ]);
  };

  const soon = (what: string) => () => toast.info(`${what} is coming soon`);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Profile" subtitle="Account & settings" />

        <View style={styles.body}>
          {/* Profile card */}
          <Pressable style={styles.profileCard} onPress={openSheet} accessibilityRole="button" accessibilityLabel="Edit profile">
            <View>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText style={styles.avatarText}>{initials(displayName, displayPhone)}</AppText>
                </View>
              )}
              {verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color={Colors.text.inverse} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <AppText variant="subheading" numberOfLines={1}>{displayName ?? 'Add your name'}</AppText>
              <AppText variant="caption" style={{ marginTop: 2 }}>{displayPhone}</AppText>
              {displayEmail ? <AppText variant="caption" numberOfLines={1}>{displayEmail}</AppText> : null}
            </View>
            <View style={styles.editChip}>
              <AppText variant="caption" color={Colors.primary} style={{ fontFamily: Fonts.bold }}>Edit</AppText>
            </View>
          </Pressable>

          {/* Verification */}
          {user && !verified ? (
            <Pressable style={styles.verifyBanner} onPress={soon('Identity verification')} accessibilityRole="button">
              <View style={styles.verifyIcon}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.ink.text} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={Colors.ink.text}>Verify your identity</AppText>
                <AppText variant="caption" color={Colors.ink.textMuted} style={{ marginTop: 2 }}>
                  Unlock higher limits in a few minutes
                </AppText>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.ink.text} />
            </Pressable>
          ) : null}

          <Group title="Account">
            <SettingRow
              icon="person-outline"
              iconColor={Colors.primary}
              iconBg={Colors.primaryLight}
              label="Personal information"
              sublabel="Name, email and photo"
              onPress={openSheet}
            />
            <SettingRow
              icon="key-outline"
              iconColor={Colors.violet}
              iconBg={Colors.violetLight}
              label="Change password"
              onPress={() => router.push('/(auth)/forgot-password')}
            />
            <SettingRow
              icon="id-card-outline"
              iconColor={Colors.success}
              iconBg={Colors.successLight}
              label="Identity verification"
              value={verified ? 'Verified' : 'Not verified'}
              onPress={soon('Identity verification')}
              last
            />
          </Group>

          <Group title="Preferences">
            <SettingRow
              icon="notifications-outline"
              iconColor={Colors.warning}
              iconBg={Colors.warningLight}
              label="Push notifications"
              sublabel="Due dates and loan updates"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
                  thumbColor={Colors.background}
                  ios_backgroundColor={Colors.borderStrong}
                />
              }
            />
            <SettingRow
              icon="finger-print-outline"
              iconColor={Colors.primary}
              iconBg={Colors.primaryLight}
              label="Biometric sign-in"
              sublabel="Face ID or fingerprint"
              last
              right={
                <Switch
                  value={biometrics}
                  onValueChange={setBiometrics}
                  trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
                  thumbColor={Colors.background}
                  ios_backgroundColor={Colors.borderStrong}
                />
              }
            />
          </Group>

          <Group title="Support">
            <SettingRow icon="help-buoy-outline" label="Help centre" onPress={soon('Help centre')} />
            <SettingRow icon="chatbubbles-outline" label="Contact support" onPress={soon('Contact support')} />
            <SettingRow icon="star-outline" label="Rate Fundly" onPress={soon('Rating')} last />
          </Group>

          <Group title="Legal">
            <SettingRow icon="document-text-outline" label="Terms of service" onPress={soon('Terms of service')} />
            <SettingRow icon="lock-closed-outline" label="Privacy policy" onPress={soon('Privacy policy')} last />
          </Group>

          <View style={[styles.group, { marginTop: Spacing.lg }]}>
            <SettingRow icon="log-out-outline" label={loggingOut ? 'Signing out…' : 'Sign out'} onPress={handleLogout} destructive last />
          </View>

          <AppText variant="caption" align="center" style={{ marginTop: Spacing.lg }}>
            Fundly · Version 1.0.0
          </AppText>
        </View>
      </ScrollView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={!profileSaving}
        keyboardBehavior="extend"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.background, borderRadius: Radius.xl }}
        handleIndicatorStyle={{ backgroundColor: Colors.borderStrong, width: 40 }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <EditProfileForm onSaved={closeSheet} onBusyChange={setProfileSaving} />
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  body: { paddingHorizontal: Spacing.gutter },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.card,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { backgroundColor: Colors.ink[800], alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 30, color: Colors.ink.text },
  verifiedBadge: {
    position: 'absolute', bottom: -1, right: -1,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  editChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, backgroundColor: Colors.primaryLight,
  },

  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.ink[800],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm + 4,
  },
  verifyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  groupTitle: { marginBottom: Spacing.sm, marginLeft: 4 },
  group: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm + 4,
    paddingVertical: 14,
    paddingRight: Spacing.md,
    minHeight: 58,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderStrong },

  sheetContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm },
  nameRow: { flexDirection: 'row', gap: Spacing.sm + 4 },
  fieldLabel: { marginBottom: Spacing.xs + 2, marginTop: Spacing.md },
  sheetInput: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    height: 52, fontSize: FontSize.md, fontFamily: Fonts.medium, color: Colors.text.primary,
    backgroundColor: Colors.background,
  },
  photoPicker: { alignSelf: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  photoPreview: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.background,
  },
});
