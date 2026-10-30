import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from './types';
import { unregisterPushToken } from './notifications';

type SignUpParams = {
  email: string;
  password: string;
  username: string;
  fullName: string;
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Retourne un message d'erreur, ou null si tout s'est bien passé. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    params: SignUpParams
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Traduit les messages d'erreur courants de Supabase.
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))
    return "Ton e-mail n'est pas encore confirmé. Vérifie ta boîte de réception.";
  if (m.includes('already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (m.includes('at least')) return 'Le mot de passe est trop court (6 caractères minimum).';
  if (m.includes('invalid format') || m.includes('invalid email'))
    return "Le format de l'e-mail est invalide.";
  if (m.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Problème de connexion. Vérifie ton réseau.';
  return `Une erreur est survenue : ${message}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Au démarrage : récupérer la session sauvegardée, puis écouter les changements
  //    (connexion, déconnexion, renouvellement du jeton).
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2) Dès qu'un utilisateur est connecté : charger son profil.
  const userId = session?.user.id;

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile | null) ?? null);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? traduireErreur(error.message) : null;
  }, []);

  const signUp = useCallback(async ({ email, password, username, fullName }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Ces données sont lues par le trigger SQL qui crée le profil automatiquement.
      options: { data: { username, full_name: fullName } },
    });
    if (error) return { error: traduireErreur(error.message), needsConfirmation: false };
    // Si la confirmation par e-mail est activée, il n'y a pas encore de session.
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    // Ce téléphone ne doit plus recevoir les notifications de ce compte.
    await unregisterPushToken();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile: loadProfile }),
    [session, profile, loading, signIn, signUp, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.');
  return ctx;
}
