import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { useChat } from '@/lib/chat';
import { useInbox } from '@/lib/inbox';
import { useNetwork } from '@/lib/network';
import { FeedScope, usePosts } from '@/lib/posts';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export type HomeSection = 'feed' | 'following' | 'profile';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  section: HomeSection;
  onSelectSection: (section: HomeSection) => void;
  onClose: () => void;
};

type ItemProps = {
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: number;
  danger?: boolean;
  onPress: () => void;
};

function MenuItem({ colors, styles, icon, label, active, badge, danger, onPress }: ItemProps) {
  return (
    <Pressable style={[styles.item, active && styles.itemActive]} onPress={onPress}>
      <View style={[styles.itemIcon, active && styles.itemIconActive]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.danger : active ? colors.primaryDark : colors.primary}
        />
      </View>
      <Text style={[styles.itemLabel, active && styles.itemLabelActive, danger && styles.dangerText]}>
        {label}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const FILTERS: { scope: FeedScope; label: string }[] = [
  { scope: 'all', label: 'Tous' },
  { scope: 'contacts', label: 'Mes contacts' },
  { scope: 'following', label: 'Abonnements' },
];

// Contenu du menu latéral de l'Accueil (style Facebook / tableau de bord).
export function HomeMenu({ section, onSelectSection, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const { scope, setScope } = usePosts();
  const { received } = useNetwork();
  const { unreadTotal } = useChat();
  const { unreadCount } = useInbox();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = createStyles(colors);

  const name = profile?.full_name || profile?.username || '';

  const go = (target: HomeSection) => {
    onSelectSection(target);
    onClose();
  };

  const pickFilter = (value: FeedScope) => {
    setScope(value);
    go('feed');
  };

  // Raccourcis vers les autres onglets de la barre du bas.
  const openTab = (path: '/network' | '/messages' | '/notifications') => {
    onClose();
    router.navigate(path);
  };

  const confirmSignOut = () => {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          onClose();
          signOut();
        },
      },
    ]);
  };

  return (
      <View style={styles.container}>
      {/* En-tête : photo, nom, accès au profil */}
      <Pressable style={[styles.header, { paddingTop: insets.top + 20 }]} onPress={() => go('profile')}>
        <Avatar uri={profile?.avatar_url} name={name} size={68} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{profile?.username} · Voir mon profil
        </Text>
      </Pressable>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <MenuItem
          colors={colors}
          styles={styles}
          icon="newspaper-outline"
          label="Fil d'actualité"
          active={section === 'feed'}
          onPress={() => go('feed')}
        />
        <MenuItem
          colors={colors}
          styles={styles}
          icon="person-add-outline"
          label="Mes abonnements"
          active={section === 'following'}
          onPress={() => go('following')}
        />
        <MenuItem
          colors={colors}
          styles={styles}
          icon="person-outline"
          label="Mon profil"
          active={section === 'profile'}
          onPress={() => go('profile')}
        />

        <Text style={styles.sectionTitle}>Filtrer le fil</Text>
        {FILTERS.map((f) => {
          const selected = section === 'feed' && scope === f.scope;
          return (
            <MenuItem
              colors={colors}
              styles={styles}
              key={f.scope}
              icon={selected ? 'radio-button-on' : 'radio-button-off'}
              label={f.label}
              active={selected}
              onPress={() => pickFilter(f.scope)}
            />
          );
        })}

        <Text style={styles.sectionTitle}>Raccourcis</Text>
        <MenuItem
          colors={colors}
          styles={styles}
          icon="people-outline"
          label="Réseau"
          badge={received.length}
          onPress={() => openTab('/network')}
        />
        <MenuItem
          colors={colors}
          styles={styles}
          icon="chatbubbles-outline"
          label="Messages"
          badge={unreadTotal}
          onPress={() => openTab('/messages')}
        />
        <MenuItem
          colors={colors}
          styles={styles}
          icon="notifications-outline"
          label="Notifications"
          badge={unreadCount}
          onPress={() => openTab('/notifications')}
        />

        <View style={styles.separator} />
        <Pressable
          style={styles.themeToggle}
          onPress={toggleTheme}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
          accessibilityLabel={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          <View style={styles.themeIcon}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
          </View>
          <View style={styles.themeCopy}>
            <Text style={styles.itemLabel}>{isDark ? 'Mode clair' : 'Mode sombre'}</Text>
            <Text style={styles.themeHint}>{isDark ? 'Thème sombre activé' : 'Thème clair activé'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.separator} />
        <MenuItem colors={colors} styles={styles} icon="log-out-outline" label="Se déconnecter" danger onPress={confirmSignOut} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent, // liseré jaune sous l'en-tête
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  username: {
    marginTop: 2,
    fontSize: 13,
    color: colors.primaryLight,
  },
  content: {
    paddingHorizontal: 12,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  itemActive: {
    backgroundColor: colors.primaryLight,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconActive: {
    backgroundColor: colors.accent,
  },
  itemLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemLabelActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  dangerText: {
    color: colors.danger,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  themeToggle: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  themeIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCopy: {
    flex: 1,
    marginLeft: 12,
  },
  themeHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  });
}
