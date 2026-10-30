import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { Comment, PublicProfile } from './types';

// Le commentaire + son auteur + la liste des personnes qui l'ont liké.
const SELECT =
  'id, post_id, user_id, parent_id, content, created_at, ' +
  'author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url), comment_likes(user_id)';

type RawComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: PublicProfile | null;
  comment_likes: { user_id: string }[];
};

function errorMessage(e: unknown): string {
  return (e as { message?: string })?.message ?? 'erreur inconnue';
}

// Gère tous les commentaires d'une publication.
export function useComments(postId: string) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [items, setItems] = useState<Comment[]>([]); // du plus ancien au plus récent
  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toComment = useCallback(
    (r: RawComment): Comment => ({
      id: r.id,
      post_id: r.post_id,
      user_id: r.user_id,
      parent_id: r.parent_id,
      content: r.content,
      created_at: r.created_at,
      author: r.author ?? { id: r.user_id, username: 'inconnu', full_name: null, avatar_url: null },
      like_count: r.comment_likes.length,
      liked_by_me: r.comment_likes.some((l) => l.user_id === userId),
    }),
    [userId]
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [commentsResult, postResult] = await Promise.all([
        supabase
          .from('comments')
          .select(SELECT)
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .limit(300),
        supabase.from('posts').select('user_id').eq('id', postId).maybeSingle(),
      ]);
      if (commentsResult.error) throw commentsResult.error;

      setItems((commentsResult.data as unknown as RawComment[]).map(toComment));
      setPostOwnerId((postResult.data as { user_id: string } | null)?.user_id ?? null);
    } catch (e) {
      console.warn('Commentaires : chargement impossible', e);
      setError(`Impossible de charger les commentaires : ${errorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  }, [postId, toComment]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Liste "à plat" prête à afficher : chaque commentaire principal suivi de ses réponses.
  const comments = useMemo(() => {
    const roots = items.filter((c) => !c.parent_id);
    const repliesByParent = new Map<string, Comment[]>();
    for (const c of items) {
      if (!c.parent_id) continue;
      const list = repliesByParent.get(c.parent_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_id, list);
    }
    const ordered: Comment[] = [];
    for (const root of roots) {
      ordered.push(root);
      ordered.push(...(repliesByParent.get(root.id) ?? []));
    }
    return ordered;
  }, [items]);

  /** Ajoute un commentaire (ou une réponse si parentId est fourni). Retourne une erreur éventuelle. */
  const addComment = useCallback(
    async (content: string, parentId: string | null): Promise<string | null> => {
      if (!userId) return 'Tu dois être connecté.';
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, parent_id: parentId, content })
        .select(SELECT)
        .single();

      if (insertError) {
        console.warn('Commentaires : envoi impossible', insertError);
        return "Impossible d'envoyer le commentaire. Réessaie.";
      }
      const created = toComment(data as unknown as RawComment);
      setItems((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
      return null;
    },
    [postId, userId, toComment]
  );

  // Like / retrait de like, avec mise à jour immédiate de l'écran.
  const toggleLike = useCallback(
    async (comment: Comment) => {
      if (!userId) return;
      const liked = !comment.liked_by_me;

      setItems((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, liked_by_me: liked, like_count: c.like_count + (liked ? 1 : -1) }
            : c
        )
      );

      const { error: likeError } = liked
        ? await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: userId })
        : await supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', comment.id)
            .eq('user_id', userId);

      if (likeError) {
        setItems((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
      }
    },
    [userId]
  );

  /** Supprime un commentaire (et ses réponses). Retourne le nombre de commentaires retirés. */
  const remove = useCallback(
    async (comment: Comment): Promise<{ error: string | null; removed: number }> => {
      const removed = items.filter((c) => c.id === comment.id || c.parent_id === comment.id).length;
      const { error: deleteError } = await supabase.from('comments').delete().eq('id', comment.id);
      if (deleteError) return { error: 'Suppression impossible.', removed: 0 };

      setItems((prev) => prev.filter((c) => c.id !== comment.id && c.parent_id !== comment.id));
      return { error: null, removed };
    },
    [items]
  );

  return { comments, postOwnerId, loading, error, refresh, addComment, toggleLike, remove };
}
