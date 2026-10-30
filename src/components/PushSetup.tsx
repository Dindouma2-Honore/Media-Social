import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';

type NotificationData = { type?: string; conversation_id?: string; post_id?: string };

// Composant invisible, chargé uniquement dans un vrai build (pas dans Expo Go) :
//  1) enregistre le téléphone pour les notifications dès qu'on est connecté
//  2) ouvre le bon écran quand on touche une notification
export function PushSetup() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  // Dernière notification touchée (fonctionne aussi si l'app était fermée).
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (userId) registerForPushNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId || !lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return; // déjà traitée
    handled.current = id;

    const data = lastResponse.notification.request.content.data as NotificationData;
    if (data.type === 'message' && data.conversation_id) {
      router.push({ pathname: '/chat/[id]', params: { id: data.conversation_id } });
    } else if (data.type === 'invitation' || data.type === 'accepted') {
      router.push('/network');
    }  else if (data.type === 'comment' && data.post_id) {
     router.push({ pathname: '/comments/[postId]', params: { postId: data.post_id } });
   }
  }, [lastResponse, userId, router]);

  return null;
}
