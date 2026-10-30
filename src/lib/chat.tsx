import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { ConversationItem, PublicProfile } from './types';

const SELECT =
  'id, user_a, user_b, last_message_at, last_message_preview, ' +
  'a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_url), ' +
  'b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_url)';

type RawConversation = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  last_message_preview: string | null;
  a: PublicProfile | null;
  b: PublicProfile | null;
};

type ChatContextType = {
  conversations: ConversationItem[];
  unreadTotal: number;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Ouvre (ou crée) la conversation avec un contact. Retourne son id, ou un message d'erreur. */
  startConversation: (otherId: string) => Promise<{ id: string | null; error: string | null }>;
  /** Marque comme lus les messages reçus dans cette conversation. */
  markRead: (conversationId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;

    // Deux requêtes en parallèle : les conversations, et mes messages non lus.
    const [convResult, unreadResult] = await Promise.all([
      supabase.from('conversations').select(SELECT).order('last_message_at', { ascending: false }),
      supabase.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', userId),
    ]);

    if (!convResult.error) {
      // Compte des messages non lus par conversation.
      const unreadByConversation: Record<string, number> = {};
      for (const row of (unreadResult.data ?? []) as { conversation_id: string }[]) {
        unreadByConversation[row.conversation_id] = (unreadByConversation[row.conversation_id] ?? 0) + 1;
      }

      const list: ConversationItem[] = [];
      for (const r of convResult.data as unknown as RawConversation[]) {
        const other = r.user_a === userId ? r.b : r.a;
        if (!other) continue;
        list.push({
          id: r.id,
          other,
          last_message_at: r.last_message_at,
          last_message_preview: r.last_message_preview,
          unread_count: unreadByConversation[r.id] ?? 0,
        });
      }
      setConversations(list);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setConversations([]);
      setLoading(true);
    }
  }, [userId, refresh]);

  // Temps réel : dès qu'un message qui nous concerne est créé, on recharge la liste.
  // (La sécurité RLS garantit qu'on ne reçoit que les messages de nos conversations.)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const startConversation = useCallback(
    async (otherId: string) => {
      const { data, error } = await supabase.rpc('start_conversation', { other_id: otherId });
      if (error) {
        const message = error.message.includes('not_connected')
          ? 'Vous devez être en contact pour discuter.'
          : "Impossible d'ouvrir la conversation.";
        return { id: null, error: message };
      }
      await refresh();
      return { id: data as string, error: null };
    },
    [refresh]
  );

  const markRead = useCallback(
    async (conversationId: string) => {
      await supabase.rpc('mark_conversation_read', { conv_id: conversationId });
      await refresh();
    },
    [refresh]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread_count, 0),
    [conversations]
  );

  const value = useMemo(
    () => ({ conversations, unreadTotal, loading, refresh, startConversation, markRead }),
    [conversations, unreadTotal, loading, refresh, startConversation, markRead]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat doit être utilisé à l’intérieur de <ChatProvider>.');
  return ctx;
}
