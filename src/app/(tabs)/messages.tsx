import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useChat } from '@/lib/chat';
import { timeAgo } from '@/lib/date';
import { ConversationItem } from '@/lib/types';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { conversations, loading, refresh } = useChat();
  const [refreshing, setRefreshing] = useState(false);

  // Recharge la liste quand on revient sur l'onglet.
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

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const name = item.other.full_name || item.other.username;
    const unread = item.unread_count > 0;

    return (
      <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
        <Avatar uri={item.other.avatar_url} name={name} size={52} />
        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
          </View>
          <View style={styles.bottomLine}>
            <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
              {item.last_message_preview ?? 'Nouvelle conversation'}
            </Text>
            {unread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Aucune conversation"
            text="Touche le bouton jaune pour écrire à l'un de tes contacts."
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyContent : styles.content}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/new-message')}
      >
        <Ionicons name="create-outline" size={28} color={colors.textOnAccent} />
      </Pressable>
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
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
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
  body: {
    flex: 1,
    marginLeft: 12,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  bold: {
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  previewUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    marginLeft: 8,
    backgroundColor: colors.danger, // pastille rouge = messages non lus
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabPressed: {
    opacity: 0.85,
  },
  });
}
