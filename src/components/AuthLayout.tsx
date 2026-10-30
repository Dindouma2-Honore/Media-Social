import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { appName, colors, radius } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

// Mise en page commune aux écrans de connexion et d'inscription :
// bandeau bleu en haut avec le logo, carte blanche avec le formulaire.
export function AuthLayout({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 32 }]}>
          <View style={styles.logo}>
            <Ionicons name="chatbubbles" size={34} color={colors.primaryDark} />
          </View>
          <Text style={styles.appName}>{appName}</Text>
          <View style={styles.stripe} />
        </View>

        <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  stripe: {
    marginTop: 10,
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.danger, // petite touche rouge
  },
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 22,
  },
});
