import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';
import { colors, radius } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!isValidEmail(email) || !password) {
      setError('Renseigne un e-mail valide et ton mot de passe.');
      return;
    }
    setLoading(true);
    setError(null);
    const message = await signIn(email.trim(), password);
    setLoading(false);
    // En cas de succès, rien à faire : le changement de session
    // redirige automatiquement vers les onglets (voir app/_layout.tsx).
    if (message) setError(message);
  };

  return (
    <AuthLayout title="Bon retour !" subtitle="Connecte-toi pour retrouver ton réseau.">
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Input
        label="E-mail"
        placeholder="exemple@mail.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Input
        label="Mot de passe"
        placeholder="Ton mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        onSubmitEditing={handleLogin}
      />

      <Button title="Se connecter" onPress={handleLogin} loading={loading} style={styles.button} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ? </Text>
        <Link href="/register" style={styles.link}>
          Créer un compte
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
