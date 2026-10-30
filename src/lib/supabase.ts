import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase n'est pas configuré. Vérifie les variables du fichier .env."
  );
}

// Sur le Web, le stockage navigateur n'est utilisé que côté client.
// Sur Android/iOS, AsyncStorage conserve la session.
const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

const authStorage = {
  getItem: async (key: string) => {
    if (isSSR) return null;

    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }

    return AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string) => {
    if (isSSR) return;

    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string) => {
    if (isSSR) return;

    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Gestion du renouvellement automatique sur Android et iOS.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
