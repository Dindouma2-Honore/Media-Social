import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useFollows } from './follows';
import { useNetwork } from './network';
import { Post } from './types';

// Nombre de publications chargées à chaque fois (pagination).
// 'all' = toutes les publications, 'contacts' = les miennes + celles de mes contacts.
// 'following' = les publications des personnes que je suis.
export type FeedScope = 'all' | 'contacts' | 'following';

const PAGE_SIZE = 10;

// Ce qu'on demande à Supabase : la publication + son auteur (table profiles) + les likes.
// Pour un gros volume de likes, on remplacerait la liste par un simple compteur (étape d'optimisation).
const SELECT =
  'id, user_id, content, image_url, video_url, created_at, ' +
  'author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url), likes(user_id), comments(count)';

type RawPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  author: Post['author'] | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

type PostsContextType = {
  posts: Post[];
  loading: boolean; // premier chargement
  refreshing: boolean; // rechargement (pull-to-refresh)
  loadingMore: boolean; // chargement de la page suivante
  error: string | null;
  scope: FeedScope;
  setScope: (scope: FeedScope) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleLike: (post: Post) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  /** Met à jour le compteur de commentaires d'une publication (après un ajout ou une suppression). */
  adjustCommentCount: (postId: string, delta: number) => void;
};

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { contacts, loading: networkLoading } = useNetwork();
  const { followingIds } = useFollows();
  const [scope, setScope] = useState<FeedScope>('all');
  // Liste des contacts sous forme de texte : ne change que si les contacts changent vraiment.
  const contactKey = contacts
    .map((c) => c.other.id)
    .sort()
    .join(',');
  // Liste des abonnements, prise en compte seulement dans le filtre "Abonnements"
  // (suivre quelqu'un depuis le fil ne doit pas recharger le fil complet).
  const followKey = scope === 'following' ? Array.from(followingIds).sort().join(',') : '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextPage = useRef(0);

  // Charge une page de publications, de la plus récente à la plus ancienne.
  const fetchPage = useCallback(
    async (page: number): Promise<Post[]> => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('posts')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Mode "Contacts" : seulement mes publications et celles de mes contacts.
      if (scope === 'contacts') {
        const ids = [userId as string, ...(contactKey ? contactKey.split(',') : [])];
        query = query.in('user_id', ids);
      }

      // Mode "Abonnements" : seulement les personnes que je suis.
      if (scope === 'following') {
        if (!followKey) return [];
        query = query.in('user_id', followKey.split(','));
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      return (data as unknown as RawPost[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        image_url: r.image_url,
        video_url: r.video_url,
        created_at: r.created_at,
        author: r.author ?? { id: r.user_id, username: 'inconnu', full_name: null, avatar_url: null },
        like_count: r.likes.length,
        comment_count: r.comments?.[0]?.count ?? 0,
        liked_by_me: r.likes.some((l) => l.user_id === userId),
      }));
    },
    [userId, scope, contactKey, followKey]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    setError(null);
    try {
      const rows = await fetchPage(0);
      setPosts(rows);
      nextPage.current = 1;
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e) {
      console.warn('Fil : chargement impossible', e);
      setError(
        `Impossible de charger les publications : ${(e as { message?: string })?.message ?? 'erreur inconnue'}`
      );
      setHasMore(false); // évite que la liste redemande « la suite » en boucle
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [userId, fetchPage]);

  // Charge le fil dès qu'un utilisateur est connecté, le vide à la déconnexion.
  // (en mode "Contacts", on attend d'abord que la liste des contacts soit chargée)
  useEffect(() => {
    if (!userId) {
      setPosts([]);
      setHasMore(true);
      nextPage.current = 0;
      return;
    }
    if (networkLoading) return;
    setLoading(true);
    refresh();
  }, [userId, networkLoading, refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(nextPage.current);
      nextPage.current += 1;
      setHasMore(rows.length === PAGE_SIZE);
      // On évite les doublons si de nouvelles publications sont arrivées entre-temps.
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => !ids.has(r.id))];
      });
    } catch (e) {
      console.warn('Fil : suite impossible', e);
      setError(
        `Impossible de charger la suite : ${(e as { message?: string })?.message ?? 'erreur inconnue'}`
      );
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, refreshing, loading, hasMore, fetchPage]);

  // "Mise à jour optimiste" : on change l'écran tout de suite, puis on confirme côté serveur.
  const toggleLike = useCallback(
    async (post: Post) => {
      if (!userId) return;
      const liked = !post.liked_by_me;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) }
            : p
        )
      );

      const { error: likeError } = liked
        ? await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
        : await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId);

      if (likeError) {
        // En cas d'échec, on remet l'état précédent.
        setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      }
    },
    [userId]
  );

  const deletePost = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);
    if (deleteError) {
      setError('Suppression impossible.');
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const adjustCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p
      )
    );
  }, []);

  const value = useMemo(
    () => ({
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
      adjustCommentCount,
    }),
    [
      posts,
      loading,
      refreshing,
      loadingMore,
      error,
      scope,
      refresh,
      loadMore,
      toggleLike,
      deletePost,
      adjustCommentCount,
    ]
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts(): PostsContextType {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error('usePosts doit être utilisé à l’intérieur de <PostsProvider>.');
  return ctx;
}
