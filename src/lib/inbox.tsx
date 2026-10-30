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
import { AppNotification, PublicProfile } from './types';

// La notification + la personne qui a publié + un extrait de la publication.
// Le nom de la relation est précisé (notifications_actor_id_fkey) car la table
// possède deux liens vers "profiles" (le destinataire et l'auteur).
const SELECT =
  'id, type, post_id, created_at, read_at, ' +
  'actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url), ' +
  'post:posts!notifications_post_id_fkey(content, image_url, video_url)';

type RawNotification = {
  id: string;
  type: 'post';
  post_id: string | null;
  created_at: string;
  read_at: string | null;
  actor: PublicProfile | null;
  post: { content: string; image_url: string | null; video_url: string | null } | null;
};

function describe(post: RawNotification['post']): string {
  if (post?.content) {
    const short = post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content;
    return `a publié : « ${short} »`;
  }
  if (post?.video_url) return 'a publié une vidéo.';
  if (post?.image_url) return 'a publié une photo.';
  return 'a fait une nouvelle publication.';
}

type InboxContextType = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const InboxContext = createContext<InboxContextType | undefined>(undefined);

export function InboxProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      const list: AppNotification[] = [];
      for (const r of data as unknown as RawNotification[]) {
        if (!r.actor) continue;
        list.push({
          id: r.id,
          type: r.type,
          post_id: r.post_id,
          created_at: r.created_at,
          read_at: r.read_at,
          actor: r.actor,
          text: describe(r.post),
        });
      }
      setItems(list);
    } else {
      console.warn('Notifications : chargement impossible', error);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setItems([]);
      setLoading(true);
    }
  }, [userId, refresh]);

  // Temps réel : une nouvelle notification arrive, on recharge la liste (le badge se met à jour).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
    await supabase.from('notifications').update({ read_at: now }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
  }, [userId]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, loading, refresh, markRead, markAllRead }),
    [items, unreadCount, loading, refresh, markRead, markAllRead]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextType {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox doit être utilisé à l’intérieur de <InboxProvider>.');
  return ctx;
}
