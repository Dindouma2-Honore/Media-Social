import { memo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/date';
import { Comment } from '@/lib/types';
import { colors, radius } from '@/constants/theme';

type Props = {
  comment: Comment;
  isReply: boolean;
  canDelete: boolean;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
};

export const CommentItem = memo(function CommentItem({
  comment,
  isReply,
  canDelete,
  onLike,
  onReply,
  onDelete,
}: Props) {
  const name = comment.author.full_name || comment.author.username;

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer le commentaire',
      isReply ? 'Cette action est définitive.' : 'Les réponses à ce commentaire seront aussi supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(comment) },
      ]
    );
  };

  return (
    <View style={[styles.row, isReply && styles.replyRow]}>
      <Avatar uri={comment.author.avatar_url} name={name} size={isReply ? 32 : 40} />

      <View style={styles.main}>
        <View style={styles.bubble}>
          <Text style={styles.name} numberOfLines={1}>
            {name} <Text style={styles.time}>· {timeAgo(comment.created_at)}</Text>
          </Text>
          <Text style={styles.content}>{comment.content}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => onLike(comment)} hitSlop={8}>
            <Ionicons
              name={comment.liked_by_me ? 'heart' : 'heart-outline'}
              size={18}
              color={comment.liked_by_me ? colors.danger : colors.textMuted}
            />
            <Text style={[styles.actionText, comment.liked_by_me && styles.liked]}>
              {comment.like_count}
            </Text>
          </Pressable>

          <Pressable style={styles.action} onPress={() => onReply(comment)} hitSlop={8}>
            <Text style={styles.replyText}>Répondre</Text>
          </Pressable>

          {canDelete ? (
            <Pressable style={styles.action} onPress={confirmDelete} hitSlop={8}>
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  replyRow: {
    paddingLeft: 16 + 48, // les réponses sont décalées vers la droite
  },
  main: {
    flex: 1,
    marginLeft: 10,
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  liked: {
    color: colors.danger,
  },
  replyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
