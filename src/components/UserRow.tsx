import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PublicProfile } from '@/lib/types';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Props = {
  profile: PublicProfile;
  onPress: () => void;
  /** Contenu affiché sous le nom (boutons d'action). */
  children?: ReactNode;
};

export function UserRow({ profile, onPress, children }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const name = profile.full_name || profile.username;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar uri={profile.avatar_url} name={name} size={52} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{profile.username}
        </Text>
        {children ? <View style={styles.actions}>{children}</View> : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  username: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  actions: {
    marginTop: 10,
  },
  });
}
