import { useCallback, useEffect, useState } from 'react';
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
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '@/components/MessageBubble';
import { useAuth } from '@/lib/auth';
import { useChat } from '@/lib/chat';
import { supabase } from '@/lib/supabase';
import { Message, PublicProfile } from '@/lib/types';
import { colors, radius } from '@/constants/theme';

const PAGE_SIZE = 30;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { markRead } = useChat();
  const insets = useSafeAreaInsets();
  const me = session?.user.id;

  const [other, setOther] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // du plus récent au plus ancien
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Sert à retirer la marge du bas (zone sûre) quand le clavier est ouvert.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 1) Chargement initial : l'autre personne + les derniers messages.
  useEffect(() => {
    if (!id || !me) return;
    let active = true;

    (async () => {
      const { data: conv } = await supabase
        .from('conversations')
        .select(
          'user_a, user_b, ' +
            'a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_url), ' +
            'b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_url)'
        )
        .eq('id', id)
        .maybeSingle();

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!active) return;

      if (conv) {
        const row = conv as unknown as {
          user_a: string;
          a: PublicProfile | null;
          b: PublicProfile | null;
        };
        setOther(row.user_a === me ? row.b : row.a);
      }
      const list = (msgs ?? []) as unknown as Message[];
      setMessages(list);
      setHasMore(list.length === PAGE_SIZE);
      setLoading(false);
      markRead(id);
    })();

    return () => {
      active = false;
    };
  }, [id, me, markRead]);

  // 2) Temps réel : les nouveaux messages de cette conversation arrivent tout seuls.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const msg = payload.new as unknown as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]));
          if (msg.sender_id !== me) markRead(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, me, markRead]);

  // 3) Charger les messages plus anciens quand on remonte dans la conversation.
  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1].created_at;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const older = (data ?? []) as unknown as Message[];
    setHasMore(older.length === PAGE_SIZE);
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      return [...prev, ...older.filter((m) => !ids.has(m.id))];
    });
    setLoadingMore(false);
  }, [id, loadingMore, hasMore, messages]);

  // 4) Envoyer un message.
  const send = async () => {
    const content = text.trim();
    if (!content || !me || sending) return;

    setSending(true);
    setText('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: me, content })
      .select()
      .single();

    setSending(false);

    if (error) {
      setText(content); // on remet le texte pour ne rien perdre
      Alert.alert('Message non envoyé', "Vérifie ta connexion, et que vous êtes toujours en contact.");
      return;
    }

    // Le message apparaît tout de suite (le temps réel ne le dupliquera pas : on compare les id).
    const msg = data as unknown as Message;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]));
  };

  const title = other ? other.full_name || other.username : 'Conversation';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <Stack.Screen options={{ title }} />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.primary} />
          <Text style={styles.emptyText}>Aucun message pour l'instant. Dis bonjour !</Text>
        </View>
      ) : (
        <FlatList
          // "inverted" : la liste se lit de bas en haut, comme dans toutes les messageries.
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} mine={item.sender_id === me} />}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.more} color={colors.primary} /> : undefined}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          placeholder="Écris un message…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={20} color={colors.primaryDark} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  loader: {
    flex: 1,
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
  listContent: {
    padding: 12,
  },
  more: {
    marginVertical: 12,
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
    backgroundColor: colors.accent, // bouton d'envoi jaune
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
