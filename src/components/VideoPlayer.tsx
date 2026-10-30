import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

// Le vrai lecteur n'est créé qu'au moment où on touche la vidéo.
// Dans un fil avec beaucoup de vidéos, cela évite de charger des dizaines de lecteurs en même temps.
function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" />;
}

export function VideoPlayer({ uri, style }: Props) {
  const [started, setStarted] = useState(false);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, style]}>
      {started ? (
        <InlineVideo uri={uri} />
      ) : (
        <Pressable style={styles.poster} onPress={() => setStarted(true)}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={32} color={colors.primaryDark} />
          </View>
          <Text style={styles.label}>Toucher pour lire la vidéo</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    marginTop: 12,
  },
  poster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent, // bouton lecture jaune
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  label: {
    marginTop: 10,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  });
}
