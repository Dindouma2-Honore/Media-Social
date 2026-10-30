import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayer } from '@/components/VideoPlayer';
import { timeAgo } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type UserPost = {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

type Props = {
  userId: string;
  title?: string;
};

// Liste en lecture seule des dernières publications d'une personne (profil).
export function UserPosts({ userId, title = 'Publications' }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Recharge chaque fois que l'écran reprend le focus (ex : après avoir publié).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data } = await supabase
          .from('posts')
          .select('id, content, image_url, video_url, created_at, likes(user_id), comments(count)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (active) {
          setPosts((data as unknown as UserPost[] | null) ?? []);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [userId])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>Aucune publication pour le moment.</Text>
      ) : (
        posts.map((post) => (
          <View key={post.id} style={styles.card}>
            <Text style={styles.date}>{timeAgo(post.created_at)}</Text>
            {post.content ? <Text style={styles.content}>{post.content}</Text> : null}
            {post.image_url ? (
              <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
            ) : null}
            {post.video_url ? <VideoPlayer uri={post.video_url} style={styles.image} /> : null}
            <View style={styles.likes}>
              <Ionicons name="heart" size={16} color={colors.danger} />
              <Text style={styles.likeCount}>{post.likes.length}</Text>
              <Ionicons
                name="chatbubble-outline"
                size={15}
                color={colors.textMuted}
                style={styles.commentIcon}
              />
              <Text style={styles.likeCount}>{post.comments?.[0]?.count ?? 0}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  loader: {
    marginTop: 20,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginTop: 6,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.sm,
    marginTop: 10,
    backgroundColor: colors.primaryLight,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentIcon: {
    marginLeft: 16,
  },
  likeCount: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  });
}
