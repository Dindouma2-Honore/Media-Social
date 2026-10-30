import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Expo Go ne gère plus les notifications push (Android). On les active seulement
// dans un vrai build (développement ou preview), voir README-partie5.md.
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let currentToken: string | null = null;
let handlerConfigured = false;

// On charge "expo-notifications" à la demande (et pas en haut du fichier)
// pour ne rien casser dans Expo Go.
function loadNotifications(): typeof import('expo-notifications') | null {
  if (isExpoGo || !Device.isDevice) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

/** Demande la permission, récupère le token du téléphone et l'enregistre dans Supabase. */
export async function registerForPushNotifications(): Promise<void> {
  try {
    const Notifications = loadNotifications();
    if (!Notifications) return;

    // Affiche les notifications même quand l'application est ouverte.
    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.MAX,
        lightColor: '#1D4ED8',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    // L'identifiant du projet EAS est créé par la commande "eas init".
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Notifications : projectId EAS introuvable. Lance 'eas init' (voir README-partie5.md).");
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    currentToken = token;
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  } catch (e) {
    // Les notifications sont un bonus : une erreur ici ne doit jamais bloquer l'application.
    console.warn('Notifications : enregistrement impossible', e);
  }
}

/** À appeler avant la déconnexion : ce téléphone ne reçoit plus les notifications de ce compte. */
export async function unregisterPushToken(): Promise<void> {
  if (!currentToken) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: currentToken });
  } catch {
    // on ignore : la déconnexion doit toujours fonctionner
  }
  currentToken = null;
}
