import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, Fonts } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { token, isLoading: authLoading } = useAuthStore();
  const { hasSeenOnboarding, isLoading: onboardingLoading } = useOnboardingStore();

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  const segments = useSegments();
  const router = useRouter();

  const isLoading = authLoading || onboardingLoading || (!fontsLoaded && !fontError);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inAuthGroup = segments[0] === '(auth)';

    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
      return;
    }

    if (hasSeenOnboarding && !token && !inAuthGroup) {
      router.replace('/(auth)');
      return;
    }

    if (hasSeenOnboarding && token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, hasSeenOnboarding]);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.canvas },
          animation: 'slide_from_right',
        }}
      />
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          titleStyle: { fontFamily: Fonts.semibold },
          descriptionStyle: { fontFamily: Fonts.regular },
        }}
      />
    </GestureHandlerRootView>
  );
}
