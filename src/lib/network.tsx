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
import { Connection, PublicProfile } from './types';

// On charge chaque relation avec le profil des deux personnes.
// Il y a deux liens vers "profiles" : on précise lequel avec le nom de la contrainte.
const SELECT =
  'id, requester_id, receiver_id, status, created_at, ' +
  'requester:profiles!connections_requester_id_fkey(id, username, full_name, avatar_url), ' +
  'receiver:profiles!connections_receiver_id_fkey(id, username, full_name, avatar_url)';

type RawConnection = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  requester: PublicProfile | null;
  receiver: PublicProfile | null;
};

type NetworkContextType = {
  loading: boolean;
  contacts: Connection[]; // relations acceptées
  received: Connection[]; // invitations reçues, en attente
  sent: Connection[]; // invitations envoyées, en attente
  connectionWith: (userId: string) => Connection | undefined;
  refresh: () => Promise<void>;
  // Les actions retournent un message d'erreur, ou null si tout s'est bien passé.
  sendInvitation: (userId: string) => Promise<string | null>;
  accept: (connectionId: string) => Promise<string | null>;
  remove: (connectionId: string) => Promise<string | null>;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('connections')
      .select(SELECT)
      .order('created_at', { ascending: false });

    if (!error) {
      const rows = data as unknown as RawConnection[];
      const list: Connection[] = [];
      for (const r of rows) {
        const direction = r.requester_id === userId ? 'sent' : 'received';
        const other = direction === 'sent' ? r.receiver : r.requester;
        if (!other) continue;
        list.push({ id: r.id, status: r.status, direction, other, created_at: r.created_at });
      }
      setConnections(list);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setConnections([]);
      setLoading(true);
    }
  }, [userId, refresh]);

  const contacts = useMemo(() => connections.filter((c) => c.status === 'accepted'), [connections]);
  const received = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.direction === 'received'),
    [connections]
  );
  const sent = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.direction === 'sent'),
    [connections]
  );

  const connectionWith = useCallback(
    (otherId: string) => connections.find((c) => c.other.id === otherId),
    [connections]
  );

  const sendInvitation = useCallback(
    async (otherId: string) => {
      if (!userId) return 'Tu dois être connecté.';
      const { error } = await supabase
        .from('connections')
        .insert({ requester_id: userId, receiver_id: otherId });
      if (error) {
        // 23505 = une relation existe déjà (par exemple l'autre personne t'a invité entre-temps)
        await refresh();
        return error.code === '23505'
          ? 'Une invitation existe déjà avec cette personne.'
          : "Impossible d'envoyer l'invitation.";
      }
      await refresh();
      return null;
    },
    [userId, refresh]
  );

  const accept = useCallback(
    async (connectionId: string) => {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);
      await refresh();
      return error ? "Impossible d'accepter l'invitation." : null;
    },
    [refresh]
  );

  // Sert à refuser, annuler une invitation envoyée, ou retirer un contact.
  const remove = useCallback(
    async (connectionId: string) => {
      const { error } = await supabase.from('connections').delete().eq('id', connectionId);
      await refresh();
      return error ? "L'action a échoué. Réessaie." : null;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({ loading, contacts, received, sent, connectionWith, refresh, sendInvitation, accept, remove }),
    [loading, contacts, received, sent, connectionWith, refresh, sendInvitation, accept, remove]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextType {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork doit être utilisé à l’intérieur de <NetworkProvider>.');
  return ctx;
}
