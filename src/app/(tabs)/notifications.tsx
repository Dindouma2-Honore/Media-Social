import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useInbox } from '@/lib/inbox';
import { timeAgo } from '@/lib/date';
import { AppNotification } from '@/lib/types';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { items, unreadCount, loading, refresh, markRead, markAllRead } = useInbox();
  const [refreshing, setRefreshing] = useState(false);

  // Recharge la liste chaque fois qu'on ouvre l'onglet.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Toucher une notification : on la marque comme lue et on ouvre le profil de la personne,
  // où l'on voit sa publication.
  const open = (item: AppNotification) => {
    markRead(item.id);
    router.push(`/user/${item.actor.id}`);
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: AppNotification }) => {
    const name = item.actor.full_name || item.actor.username;
    const unread = !item.read_at;

    return (
      <Pressable style={[styles.row, unread && styles.rowUnread]} onPress={() => open(item)}>
        <Avatar uri={item.actor.avatar_url} name={name} size={48} />
        <View style={styles.body}>
          <Text style={styles.text}>
            <Text style={styles.name}>{name}</Text> {item.text}
          </Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {unread ? <View style={styles.dot} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {unreadCount > 0 ? (
        <Pressable style={styles.markAll} onPress={markAllRead}>
          <Text style={styles.markAllText}>Tout marquer comme lu ({unreadCount})</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="Aucune notification"
            text="Touche « Suivre » sur une publication pour être prévenu quand cette personne publie."
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.content}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  markAll: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  rowUnread: {
    backgroundColor: colors.primaryLight,
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  name: {
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
    backgroundColor: colors.danger, // point rouge = non lue
  },
  });
}
