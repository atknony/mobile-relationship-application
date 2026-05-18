import '../global.css';
import { useEffect } from 'react';
import { Redirect, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';

import { queryClient } from '@/lib/queryClient';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { ToastProvider } from '@/components/ui/Toast';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

function RootNavigator() {
  useSupabaseSession();

  const sessionLoaded = useAuthStore((s) => s.sessionLoaded);
  const session = useAuthStore((s) => s.session);
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const pairedWith = useProfileStore((s) => s.pairedWith);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (sessionLoaded && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [sessionLoaded, fontsLoaded]);

  if (!sessionLoaded || !fontsLoaded) return null;

  if (!session) return <Redirect href="/(auth)/phone" />;
  if (!ownProfile) return <Redirect href="/(onboarding)/profile-setup" />;
  if (!pairedWith) return <Redirect href="/(pair)/create-invite" />;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
