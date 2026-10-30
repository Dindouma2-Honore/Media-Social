import { ProfileView } from '@/components/ProfileView';

// Le profil s'affiche désormais dans l'onglet Accueil (barre du haut).
// Cet écran n'apparaît plus dans la barre du bas (voir app/(tabs)/_layout.tsx).
export default function ProfileScreen() {
  return <ProfileView />;
}
