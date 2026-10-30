import { memo } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { VideoPlayer } from '@/components/VideoPlayer';
import { timeAgo } from '@/lib/date';
import { Post } from '@/lib/types';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Props = {
  post: Post;
  isOwn: boolean;
  /** Est-ce que je suis déjà abonné à l'auteur de cette publication ? */
  following: boolean;
  onLike: (post: Post) => void;
  onDelete: (id: string) => void;
  onToggleFollow: (userId: string) => void;
};

// memo : la carte n'est redessinée que si ses props changent (important dans une longue liste).
export const PostCard = memo(function PostCard({
  post,
  isOwn,
  following,
  onLike,
  onDelete,
  onToggleFollow,
}: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const name = post.author.full_name || post.author.username;

  const confirmDelete = () => {
    Alert.alert('Supprimer la publication', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(post.id) },
    ]);
  };

  // Suivre : immédiat. Ne plus suivre : on demande confirmation.
  const handleFollow = () => {
    if (!following) {
      onToggleFollow(post.user_id);
      return;
    }
    Alert.alert('Ne plus suivre', `Ne plus suivre ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ne plus suivre', style: 'destructive', onPress: () => onToggleFollow(post.user_id) },
    ]);
  };

  // Toucher l'auteur ouvre son profil (sauf si c'est soi-même).
  const openAuthor = () => {
    if (!isOwn) router.push(`/user/${post.user_id}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.author} onPress={openAuthor}>
          <Avatar uri={post.author.avatar_url} name={name} size={44} />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              @{post.author.username} · {timeAgo(post.created_at)}
            </Text>
          </View>
        </Pressable>
        {isOwn ? (
          <Pressable onPress={confirmDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.followButton, following && styles.followingButton]}
            onPress={handleFollow}
            hitSlop={8}
          >
            <Ionicons
              name={following ? 'checkmark' : 'add'}
              size={14}
              color={following ? colors.primary : colors.text}
            />
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? 'Suivi' : 'Suivre'}
            </Text>
          </Pressable>
        )}
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {post.image_url ? (
        <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
      ) : null}

      {post.video_url ? <VideoPlayer uri={post.video_url} /> : null}

      <View style={styles.footer}>
        <Pressable style={styles.likeButton} onPress={() => onLike(post)} hitSlop={8}>
          <Ionicons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={24}
            color={post.liked_by_me ? colors.danger : colors.textMuted}
          />
          <Text style={[styles.likeCount, post.liked_by_me && styles.likeCountActive]}>
            {post.like_count}
          </Text>
        </Pressable>

        <Pressable
          style={styles.commentButton}
          onPress={() => router.push(`/comments/${post.id}`)}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.textMuted} />
          <Text style={styles.likeCount}>{post.comment_count}</Text>
        </Pressable>
      </View>
    </View>
  );
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accent, // "Suivre" en jaune
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginLeft: 8,
  },
  followingButton: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  followText: {
    marginLeft: 3,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  followingText: {
    color: colors.primary,
  },
  content: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
    marginTop: 12,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.sm,
    marginTop: 12,
    backgroundColor: colors.primaryLight,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
  },
  likeCount: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  likeCountActive: {
    color: colors.danger,
  },
  });
}
