import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '@/lib/chat';
import { useInbox } from '@/lib/inbox';
import { useNetwork } from '@/lib/network';
import { appName } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import type { ColorValue } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabBarIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return (
      <Ionicons
        name={focused ? active : inactive}
        size={size}
        color={typeof color === 'string' ? color : '#000000'}
      />
    );
  }

  return TabBarIcon;
}

export default function TabsLayout() {
  // Pastilles rouges : invitations reçues (Réseau) et messages non lus (Messages).
  const { received } = useNetwork();
  const { unreadTotal } = useChat();
  const { unreadCount } = useInbox();
  const { colors } = useAppTheme();
  const badgeStyle = { backgroundColor: colors.danger, color: colors.white };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: appName,
          tabBarLabel: 'Accueil',
          tabBarIcon: tabIcon('home', 'home-outline'),
          headerShown: false, // l'Accueil dessine son propre en-tête avec le bouton menu
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Réseau',
          tabBarIcon: tabIcon('people', 'people-outline'),
          tabBarBadge: received.length > 0 ? received.length : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unreadTotal > 0 ? unreadTotal : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarLabel: 'Alertes',
          tabBarIcon: tabIcon('notifications', 'notifications-outline'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      {/* Le profil est maintenant dans la barre du haut de l'Accueil : on le cache ici. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
