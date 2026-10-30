import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { isValidEmail, USERNAME_HELP, USERNAME_REGEX } from '@/lib/validation';
import { colors, radius } from '@/constants/theme';

type Errors = Partial<Record<'fullName' | 'username' | 'email' | 'password' | 'confirm', string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (fullName.trim().length < 2) e.fullName = 'Indique ton nom.';
    if (!USERNAME_REGEX.test(username.trim().toLowerCase())) e.username = USERNAME_HELP;
    if (!isValidEmail(email)) e.email = "Format d'e-mail invalide.";
    if (password.length < 6) e.password = '6 caractères minimum.';
    if (confirm !== password) e.confirm = 'Les mots de passe ne correspondent pas.';
    return e;
  };

  const handleRegister = async () => {
    const e = validate();
    setErrors(e);
    setGlobalError(null);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    const cleanUsername = username.trim().toLowerCase();

    // Vérifie que le nom d'utilisateur n'est pas déjà pris.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      setErrors({ username: "Ce nom d'utilisateur est déjà pris." });
      setLoading(false);
      return;
    }

    const result = await signUp({
      email: email.trim(),
      password,
      username: cleanUsername,
      fullName: fullName.trim(),
    });
    setLoading(false);

    if (result.error) {
      setGlobalError(result.error);
      return;
    }

    if (result.needsConfirmation) {
      Alert.alert(
        'Compte créé',
        'Un e-mail de confirmation vient de t’être envoyé. Clique sur le lien, puis connecte-toi.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    }
    // Sinon : la session existe déjà, la redirection est automatique.
  };

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoins le réseau en quelques secondes.">
      {globalError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{globalError}</Text>
        </View>
      ) : null}

      <Input
        label="Nom complet"
        placeholder="Ex : Marie Dupont"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.fullName}
      />
      <Input
        label="Nom d'utilisateur"
        placeholder="marie_dupont"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.username}
      />
      <Input
        label="E-mail"
        placeholder="exemple@mail.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label="Mot de passe"
        placeholder="6 caractères minimum"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Input
        label="Confirmer le mot de passe"
        placeholder="Retape ton mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirm}
        onSubmitEditing={handleRegister}
      />

      <Button title="Créer mon compte" onPress={handleRegister} loading={loading} style={styles.button} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Déjà inscrit ? </Text>
        <Link href="/login" style={styles.link}>
          Se connecter
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
