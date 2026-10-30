import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { UserRow } from '@/components/UserRow';
import { useAuth } from '@/lib/auth';
import { useFollows } from '@/lib/follows';
import { supabase } from '@/lib/supabase';
import { PublicProfile } from '@/lib/types';
import { AppColors } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

// "Mes abonnements" : la liste des personnes que je suis, avec un bouton pour ne plus les suivre.
export function FollowingList() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { followingIds, toggleFollow } = useFollows();

  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    // Le nom de la relation est précisé : la table "follows" a deux liens vers "profiles".
    const { data, error } = await supabase
      .from('follows')
      .select('created_at, profile:profiles!follows_following_id_fkey(id, username, full_name, avatar_url)')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (!error) {
      const rows = data as unknown as { profile: PublicProfile | null }[];
      setPeople(rows.flatMap((r) => (r.profile ? [r.profile] : [])));
    } else {
      console.warn('Abonnements : chargement impossible', error);
    }
    setLoading(false);
  }, [userId]);

  // Recharge à l'ouverture, et à chaque changement d'abonnement.
  useEffect(() => {
    load();
  }, [load, followingIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmUnfollow = (person: PublicProfile) => {
    const name = person.full_name || person.username;
    Alert.alert('Ne plus suivre', `Ne plus suivre ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Ne plus suivre',
        style: 'destructive',
        onPress: async () => {
          const error = await toggleFollow(person.id);
          if (error) Alert.alert('Oups', error);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={people}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <UserRow profile={item} onPress={() => router.push(`/user/${item.id}`)}>
          <View style={styles.actions}>
            <Button small variant="outline" title="Suivi" onPress={() => confirmUnfollow(item)} />
          </View>
        </UserRow>
      )}
      ListHeaderComponent={
        people.length > 0 ? <Text style={styles.title}>Mes abonnements ({people.length})</Text> : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="person-add-outline"
          title="Aucun abonnement"
          text="Touche « Suivre » sur une publication pour retrouver ici les personnes qui t'intéressent."
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      contentContainerStyle={people.length === 0 ? styles.emptyContent : styles.content}
    />
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginHorizontal: 16,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
  },
  });
}
