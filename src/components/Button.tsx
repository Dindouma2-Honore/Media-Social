import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Variant = 'primary' | 'accent' | 'outline' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Version compacte, utilisée dans les listes. */
  small?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  small = false,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const palette: Record<Variant, { bg: string; text: string; border: string }> = {
    primary: { bg: colors.primary, text: colors.white, border: colors.primary },
    accent: { bg: colors.accent, text: colors.textOnAccent, border: colors.accent },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    danger: { bg: 'transparent', text: colors.danger, border: colors.danger },
  };
  const p = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        small && styles.baseSmall,
        {
          backgroundColor: p.bg,
          borderColor: p.border,
          opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.text} size={small ? 'small' : undefined} />
      ) : (
        <Text style={[styles.text, small && styles.textSmall, { color: p.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  baseSmall: {
    height: 36,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 14,
  },
});
