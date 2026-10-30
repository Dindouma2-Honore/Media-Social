import { ComponentType } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/lib/auth';
import { ChatProvider } from '@/lib/chat';
import { NetworkProvider } from '@/lib/network';
import { PostsProvider } from '@/lib/posts';
import { FollowsProvider } from '@/lib/follows';
import { InboxProvider } from '@/lib/inbox';
import { ThemeProvider, useAppTheme } from '@/lib/theme';

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors } = useAppTheme();
  const blueHeader = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.white,
    headerTitleStyle: { fontWeight: '700' as const },
  };
  const modalHeader = { ...blueHeader, presentation: 'modal' as const };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" options={{ ...modalHeader, title: 'Modifier le profil' }} />
        <Stack.Screen name="new-post" options={{ ...modalHeader, title: 'Nouvelle publication' }} />
        <Stack.Screen name="new-message" options={{ ...modalHeader, title: 'Nouveau message' }} />
        <Stack.Screen name="user/[id]" options={{ ...blueHeader, title: 'Profil' }} />
        <Stack.Screen name="chat/[id]" options={{ ...blueHeader, title: 'Conversation' }} />
        <Stack.Screen name="comments/[postId]" options={{ ...blueHeader, title: 'Commentaires' }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedApp() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <PushSetupLoader />
    </>
  );
}

// Les notifications push ne marchent pas dans Expo Go : on tente de charger le module,
// et si l'environnement ne le permet pas, on ignore simplement la fonction.
let cachedPushSetup: ComponentType | null | undefined;

function loadPushSetup(): ComponentType | null {
  if (cachedPushSetup !== undefined) return cachedPushSetup;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedPushSetup = require('@/components/PushSetup').PushSetup ?? null;
  } catch {
    console.warn('Notifications push indisponibles ici (normal dans Expo Go).');
    cachedPushSetup = null;
  }
  return cachedPushSetup ?? null;
}

function PushSetupLoader() {
  // Désactivé par défaut. On ne l'active que dans un vrai build (voir README-partie5.md).
  if (Platform.OS === 'web' || process.env.EXPO_PUBLIC_ENABLE_PUSH !== 'true') return null;
  const PushSetup = loadPushSetup();
  return PushSetup ? <PushSetup /> : null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FollowsProvider>
          <InboxProvider>
            <NetworkProvider>
              <PostsProvider>
                <ChatProvider>
                  <ThemedApp />
                </ChatProvider>
              </PostsProvider>
            </NetworkProvider>
          </InboxProvider>
        </FollowsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
