import { Image, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

// Affiche la photo de profil, ou l'initiale du nom si aucune photo n'est définie.
export function Avatar({ uri, name, size = 80 }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const box = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.ring, box]}>
      {uri ? (
        <Image source={{ uri }} style={styles.fill} />
      ) : (
        <View style={[styles.fill, styles.fallback]}>
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  ring: {
    borderWidth: 3,
    borderColor: colors.accent, // anneau jaune
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  initial: {
    color: colors.primary,
    fontWeight: '800',
  },
  });
}
