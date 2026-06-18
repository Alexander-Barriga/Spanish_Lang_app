import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth, supabase } from '../src/contexts/AuthContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';
import { setPaywallListener } from '../src/services/api';
import { colors } from '../src/theme';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { isLoading, isAuthenticated, isAnonymous } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastPaywallNavAt = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Handle auth-based navigation.
  // - No session at all -> welcome (registration is optional; "Get Started"
  //   creates a guest session).
  // - Guest (anonymous) sessions are allowed to stay inside the (auth) group so
  //   they can move through welcome -> onboarding and later reach signup/login
  //   to upgrade or switch accounts.
  // - Only a fully-registered user is bounced out of the (auth) group to tabs.
  // - The reset-password screen is exempt from the unauthenticated redirect.
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inResetPassword = segments[0] === 'reset-password';

    if (!isAuthenticated && !inAuthGroup && !inResetPassword) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && !isAnonymous && inAuthGroup) {
      router.replace('/(tabs)');
    }
    // isAuthenticated && inResetPassword → stay on reset screen, don't push to tabs
  }, [isAuthenticated, isAnonymous, segments, isLoading]);

  // Handle password-reset deep links (spanishlab://reset-password).
  //
  // Supabase v2 uses PKCE by default → URL is spanishlab://reset-password?code=XXX
  // Older / implicit flow → URL is spanishlab://reset-password#access_token=XXX&...
  //
  // We exchange/set the session here so Supabase fires PASSWORD_RECOVERY.
  // The onAuthStateChange listener below handles the actual navigation.
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('reset-password')) return;

      // PKCE flow: ?code=xxx
      const queryString = url.split('?')[1]?.split('#')[0] ?? '';
      const code = new URLSearchParams(queryString).get('code');
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (e) {
          console.error('[DeepLink] exchangeCodeForSession failed:', e);
        }
        return;
      }

      // Implicit flow: #access_token=xxx&refresh_token=xxx
      const fragment = url.split('#')[1] ?? '';
      const fragParams = new URLSearchParams(fragment);
      const accessToken = fragParams.get('access_token');
      const refreshToken = fragParams.get('refresh_token');
      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } catch (e) {
          console.error('[DeepLink] setSession failed:', e);
        }
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Navigate to the reset-password screen when Supabase fires PASSWORD_RECOVERY.
  // This is the single authoritative navigation trigger for both PKCE and
  // implicit flows — fired after exchangeCodeForSession / setSession above.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Install a global handler so any API call that returns 403 PAYWALL pushes
  // the user to the paywall — defence-in-depth for screens that don't already
  // surface the response themselves.
  useEffect(() => {
    setPaywallListener(() => {
      // Throttle so a burst of paywall responses (e.g. parallel queries)
      // doesn't push the screen multiple times in a row.
      const now = Date.now();
      if (now - lastPaywallNavAt.current < 1500) return;
      lastPaywallNavAt.current = now;
      router.push('/paywall');
    });
    return () => setPaywallListener(null);
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.gold} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="conversation/[id]" 
              options={{ 
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }} 
            />
            <Stack.Screen 
              name="mode-setup" 
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }} 
            />
        <Stack.Screen 
          name="placement-test" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="quick-mission" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="workout/[week]" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="story/[episode]" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="journal" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="grammar/[topic]" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="paywall" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <RootLayoutNav />
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});

