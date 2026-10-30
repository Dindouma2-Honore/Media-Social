import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { UserPosts } from '@/components/UserPosts';
import { useAuth } from '@/lib/auth';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export function ProfileView() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Tirer l'écran vers le bas pour recharger le profil.
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const confirmSignOut = () => {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.card}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name || profile?.username} size={104} />
        <Text style={styles.name}>{profile?.full_name || 'Sans nom'}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
        <Text style={styles.email}>{session?.user.email}</Text>

        <Text style={[styles.bio, !profile?.bio && styles.bioEmpty]}>
          {profile?.bio || 'Aucune biographie pour le moment.'}
        </Text>
      </View>

      <Button
        title="Modifier le profil"
        variant="accent"
        onPress={() => router.push('/edit-profile')}
        style={styles.action}
      />
      <Button title="Se déconnecter" variant="danger" onPress={confirmSignOut} style={styles.action} />

      {session ? <UserPosts userId={session.user.id} title="Mes publications" /> : null}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    marginBottom: 16,
    borderTopWidth: 5,
    borderTopColor: colors.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 14,
  },
  username: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
  },
  bioEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  action: {
    marginBottom: 12,
  },
  });
}
