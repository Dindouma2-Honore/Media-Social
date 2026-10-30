import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Menu latéral qui glisse depuis la gauche, avec un fond sombre cliquable pour le fermer.
// Aucune bibliothèque supplémentaire : juste Modal + Animated.
export function Drawer({ visible, onClose, children }: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const drawerWidth = Math.min(width * 0.84, 340);

  const progress = useRef(new Animated.Value(0)).current; // 0 = fermé, 1 = ouvert
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        }
      );
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.panel, { width: drawerWidth, transform: [{ translateX }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.background,
  },
  });
}
