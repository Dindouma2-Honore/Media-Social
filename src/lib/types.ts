// Une ligne de la table "profiles" dans Supabase.
export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

// La partie "publique et courte" d'un profil, utilisée dans les listes.
export type PublicProfile = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;

// Une publication telle qu'affichée dans le fil d'actualité.
export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  author: PublicProfile;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

// Un commentaire (principal, ou réponse si parent_id est rempli).
export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: PublicProfile;
  like_count: number;
  liked_by_me: boolean;
};

// Une notification affichée dans l'onglet Notifications.
// (nommée AppNotification pour ne pas confondre avec le type Notification du navigateur)
export type AppNotification = {
  id: string;
  type: 'post';
  post_id: string | null;
  created_at: string;
  read_at: string | null;
  actor: PublicProfile;
  /** Texte déjà prêt, ex : « a publié : « Bonjour » » */
  text: string;
};

// Une relation avec une autre personne (invitation en attente ou contact).
export type Connection = {
  id: string;
  status: 'pending' | 'accepted';
  /** 'sent' = c'est moi qui ai invité, 'received' = c'est l'autre qui m'a invité */
  direction: 'sent' | 'received';
  other: PublicProfile;
  created_at: string;
};

// Un message dans une conversation.
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

// Une ligne de la liste des conversations.
export type ConversationItem = {
  id: string;
  other: PublicProfile;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
};
