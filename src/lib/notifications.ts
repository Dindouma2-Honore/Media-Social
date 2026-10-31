import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let currentToken: string | null = null;
let handlerConfigured = false;

function loadNotifications(): typeof import('expo-notifications') | null {
  if (isExpoGo) {
    console.log('Push : ignoré (Expo Go)');
    return null;
  }
  if (!Device.isDevice) {
    console.log('Push : ignoré (émulateur)');
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

/** Demande la permission, récupère le token du téléphone et l'enregistre dans Supabase. */
export async function registerForPushNotifications(): Promise<void> {
  console.log('Push : début de l’enregistrement');
  try {
    const Notifications = loadNotifications();
    if (!Notifications) return;

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
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1D4ED8',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    console.log('Push : permission =', status);
    if (status !== 'granted') {
      console.warn('Push : permission refusée (Paramètres Android > Applications > Notifications)');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    console.log('Push : projectId =', projectId);
    if (!projectId) {
      console.warn("Push : projectId EAS introuvable. Vérifie 'extra.eas.projectId' dans app.json.");
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Push : token obtenu =', token);
    currentToken = token;

    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error) {
      console.warn('Push : Supabase a refusé le token :', error.message);
    } else {
      console.log('Push : token enregistré dans Supabase');
    }
  } catch (e) {
    console.warn('Push : ÉCHEC =', (e as { message?: string })?.message ?? e);
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