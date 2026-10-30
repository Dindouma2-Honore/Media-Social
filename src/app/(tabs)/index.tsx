import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from '@/components/Drawer';
import { FeedView } from '@/components/FeedView';
import { FollowingList } from '@/components/FollowingList';
import { HomeMenu, HomeSection } from '@/components/HomeMenu';
import { ProfileView } from '@/components/ProfileView';
import { AppColors, appName } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

const TITLES: Record<HomeSection, string> = {
  feed: appName,
  following: 'Mes abonnements',
  profile: 'Mon profil',
};

// Écran d'accueil : un en-tête avec le bouton menu (☰) qui ouvre le menu latéral,
// et en dessous la section choisie (fil, abonnements ou profil).
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [section, setSection] = useState<HomeSection>('feed');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)} hitSlop={8}>
          <Ionicons name="menu" size={28} color={colors.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {TITLES[section]}
        </Text>
        <View style={styles.menuButton} />
      </View>

      {/* Le fil reste monté (simplement caché) pour garder sa position de défilement. */}
      <View style={[styles.flex, section !== 'feed' && styles.hidden]}>
        <FeedView />
      </View>

      {section === 'following' ? <FollowingList /> : null}
      {section === 'profile' ? <ProfileView /> : null}

      <Drawer visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <HomeMenu
          section={section}
          onSelectSection={setSection}
          onClose={() => setMenuOpen(false)}
        />
      </Drawer>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  });
}
