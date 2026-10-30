import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/lib/auth';
import { useFollows } from '@/lib/follows';
import { usePosts } from '@/lib/posts';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export function FeedView() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { session } = useAuth();
  const { followingIds, toggleFollow } = useFollows();
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    scope,
    setScope,
    refresh,
    loadMore,
    toggleLike,
    deletePost,
  } = usePosts();

  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scopeBar}>
        {(['all', 'contacts', 'following'] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.scopeChip, scope === s && styles.scopeChipActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
              {s === 'all' ? 'Tous' : s === 'contacts' ? 'Mes contacts' : 'Abonnements'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        extraData={followingIds}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isOwn={item.user_id === session?.user.id}
            following={followingIds.has(item.user_id)}
            onLike={toggleLike}
            onDelete={deletePost}
            onToggleFollow={toggleFollow}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        // Pagination : quand on approche de la fin de la liste, on charge la suite.
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="Aucune publication"
            text={
              scope === 'contacts'
                ? "Tes contacts n'ont encore rien publié. Passe sur « Tous » pour voir toutes les publications."
                : scope === 'following'
                  ? "Aucune publication de tes abonnements. Touche « Suivre » sur une publication pour commencer."
                  : 'Sois le premier à publier quelque chose avec le bouton jaune.'
            }
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : undefined
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContent : styles.content}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/new-post')}
      >
        <Ionicons name="add" size={32} color={colors.textOnAccent} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  scopeBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  scopeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  scopeTextActive: {
    color: colors.white,
  },
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
  footer: {
    marginVertical: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    padding: 12,
    margin: 16,
    marginBottom: 0,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent, // bouton jaune
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
