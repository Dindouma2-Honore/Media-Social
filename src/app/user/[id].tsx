import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ConnectionActions } from '@/components/ConnectionActions';
import { UserPosts } from '@/components/UserPosts';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useChat } from '@/lib/chat';
import { useFollows } from '@/lib/follows';
import { useNetwork } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { colors, radius } from '@/constants/theme';

// Profil d'une autre personne. "[id]" dans le nom du fichier = route dynamique : /user/<id>
export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { connectionWith } = useNetwork();
  const { startConversation } = useChat();
  const { isFollowing, toggleFollow } = useFollows();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (active) {
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <EmptyState icon="alert-circle-outline" title="Profil introuvable" text="Cette personne n'existe pas ou a supprimé son compte." />
    );
  }

  const name = profile.full_name || profile.username;
  const isMe = session?.user.id === profile.id;
  const isContact = connectionWith(profile.id)?.status === 'accepted';
  const since = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const following = isFollowing(profile.id);

  const handleFollow = () => {
    if (!following) {
      toggleFollow(profile.id);
      return;
    }
    Alert.alert('Ne plus suivre', `Ne plus suivre ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ne plus suivre', style: 'destructive', onPress: () => toggleFollow(profile.id) },
    ]);
  };

  const openChat = async () => {
    setOpening(true);
    const result = await startConversation(profile.id);
    setOpening(false);
    if (result.error || !result.id) {
      Alert.alert('Oups', result.error ?? "Impossible d'ouvrir la conversation.");
      return;
    }
    router.push(`/chat/${result.id}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Avatar uri={profile.avatar_url} name={name} size={104} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {isContact ? (
          <View style={styles.contactBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.contactText}>Dans tes contacts</Text>
          </View>
        ) : null}

        <Text style={[styles.bio, !profile.bio && styles.bioEmpty]}>
          {profile.bio || 'Aucune biographie.'}
        </Text>
        <Text style={styles.since}>Membre depuis {since}</Text>
      </View>

      {isContact && !isMe ? (
        <Button
          title="Envoyer un message"
          variant="accent"
          onPress={openChat}
          loading={opening}
          style={styles.messageButton}
        />
      ) : null}

      {!isMe ? (
        <Button
          title={following ? 'Suivi' : 'Suivre'}
          variant={following ? 'outline' : 'primary'}
          onPress={handleFollow}
          style={styles.messageButton}
        />
      ) : null}

      {!isMe ? <ConnectionActions userId={profile.id} small={false} /> : null}

      <UserPosts userId={profile.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
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
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  contactText: {
    marginLeft: 5,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
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
  since: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 14,
  },
  messageButton: {
    marginBottom: 12,
  },
});
