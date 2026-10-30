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

type FollowsContextType = {
  /** Identifiants des personnes que je suis. */
  followingIds: Set<string>;
  isFollowing: (userId: string) => boolean;
  /** Suit ou ne suit plus la personne. Retourne un message d'erreur, ou null si tout va bien. */
  toggleFollow: (userId: string) => Promise<string | null>;
  refresh: () => Promise<void>;
};

const FollowsContext = createContext<FollowsContextType | undefined>(undefined);

export function FollowsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!userId) return;
    // On filtre sur follower_id : la table contient aussi les lignes où d'autres me suivent.
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!error) {
      setFollowingIds(new Set((data as { following_id: string }[]).map((r) => r.following_id)));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setFollowingIds(new Set());
    }
  }, [userId, refresh]);

  const isFollowing = useCallback((id: string) => followingIds.has(id), [followingIds]);

  // Mise à jour immédiate de l'écran, puis confirmation côté serveur (retour en arrière si échec).
  const toggleFollow = useCallback(
    async (targetId: string): Promise<string | null> => {
      if (!userId || targetId === userId) return null;
      const follow = !followingIds.has(targetId);

      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (follow) next.add(targetId);
        else next.delete(targetId);
        return next;
      });

      const { error } = follow
        ? await supabase.from('follows').insert({ follower_id: userId, following_id: targetId })
        : await supabase
            .from('follows')
            .delete()
            .eq('follower_id', userId)
            .eq('following_id', targetId);

      // 23505 = déjà suivi (double appui) : ce n'est pas une vraie erreur.
      if (error && error.code !== '23505') {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (follow) next.delete(targetId);
          else next.add(targetId);
          return next;
        });
        return follow ? "Impossible de suivre cette personne." : "Impossible de ne plus suivre cette personne.";
      }
      return null;
    },
    [userId, followingIds]
  );

  const value = useMemo(
    () => ({ followingIds, isFollowing, toggleFollow, refresh }),
    [followingIds, isFollowing, toggleFollow, refresh]
  );

  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows(): FollowsContextType {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error('useFollows doit être utilisé à l’intérieur de <FollowsProvider>.');
  return ctx;
}
