import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '@/lib/types';
import { colors } from '@/constants/theme';

type Props = {
  message: Message;
  mine: boolean;
};

// Bulle de message : bleue à droite pour moi, blanche à gauche pour l'autre personne.
export const MessageBubble = memo(function MessageBubble({ message, mine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
      <Text style={[styles.time, mine && styles.timeMine]}>{time}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginVertical: 3,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  textMine: {
    color: colors.white,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
});
