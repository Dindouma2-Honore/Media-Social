import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AppColors, colors as lightColors, darkColors } from '@/constants/theme';

type ThemePreference = 'system' | 'light' | 'dark';
type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'media-social.theme-preference';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active && (value === 'light' || value === 'dark' || value === 'system')) {
          setPreference(value);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setInitialized(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const mode: ThemeMode = isDark ? 'dark' : 'light';
  const palette = isDark ? darkColors : lightColors;

  useEffect(() => {
    if (!initialized) return;
    // React Native Web ne fournit pas Appearance.setColorScheme ; le thème de l'interface
    // est déjà géré par le contexte. La barre système ne concerne que les plateformes natives.
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
      void SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
    }
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => undefined);
  }, [initialized, preference, palette.background]);

  const toggleTheme = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark');
  }, [isDark]);

  const value = useMemo(
    () => ({ mode, isDark, colors: palette, toggleTheme }),
    [mode, isDark, palette, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useAppTheme doit être utilisé dans <ThemeProvider>.');
  return theme;
}
