import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommentItem } from '@/components/CommentItem';
import { useAuth } from '@/lib/auth';
import { useComments } from '@/lib/comments';
import { usePosts } from '@/lib/posts';
import { Comment } from '@/lib/types';
import { colors, radius } from '@/constants/theme';

type ReplyTarget = {
  rootId: string; // le commentaire principal auquel on rattache la réponse
  username: string; // la personne à qui on répond
};

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { session } = useAuth();
  const { adjustCommentCount } = usePosts();
  const insets = useSafeAreaInsets();
  const me = session?.user.id;

  const { comments, postOwnerId, loading, error, refresh, addComment, toggleLike, remove } =
    useComments(postId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList<Comment>>(null);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const startReply = (comment: Comment) => {
    // Il n'y a qu'un niveau de réponses : répondre à une réponse la rattache au commentaire principal,
    // et on ajoute @pseudo pour que l'on voie à qui on s'adresse.
    setReplyTo({ rootId: comment.parent_id ?? comment.id, username: comment.author.username });
    setText((prev) => (prev.trim() ? prev : comment.parent_id ? `@${comment.author.username} ` : ''));
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    const sendError = await addComment(content, replyTo?.rootId ?? null);
    setSending(false);

    if (sendError) {
      Alert.alert('Oups', sendError);
      return;
    }

    setText('');
    setReplyTo(null);
    adjustCommentCount(postId, 1);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const handleDelete = async (comment: Comment) => {
    const result = await remove(comment);
    if (result.error) {
      Alert.alert('Oups', result.error);
      return;
    }
    adjustCommentCount(postId, -result.removed);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              isReply={!!item.parent_id}
              // On peut supprimer ses propres commentaires, et ceux laissés sur sa propre publication.
              canDelete={item.user_id === me || postOwnerId === me}
              onLike={toggleLike}
              onReply={startReply}
              onDelete={handleDelete}
            />
          )}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            error ? undefined : (
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubble-outline" size={44} color={colors.primary} />
                <Text style={styles.emptyText}>Aucun commentaire pour l'instant. Lance la discussion !</Text>
              </View>
            )
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      )}

      {replyTo ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Réponse à <Text style={styles.replyBannerName}>@{replyTo.username}</Text>
          </Text>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={replyTo ? 'Écris ta réponse…' : 'Ajouter un commentaire…'}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Ionicons name="send" size={20} color={colors.primaryDark} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
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
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  replyBannerName: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
