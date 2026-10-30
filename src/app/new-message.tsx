import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { UserRow } from '@/components/UserRow';
import { useChat } from '@/lib/chat';
import { useNetwork } from '@/lib/network';
import { colors } from '@/constants/theme';

// Fenêtre "Nouveau message" : on choisit parmi ses contacts.
export default function NewMessageScreen() {
  const router = useRouter();
  const { contacts } = useNetwork();
  const { startConversation } = useChat();
  const [busy, setBusy] = useState(false);

  const open = async (userId: string) => {
    if (busy) return;
    setBusy(true);
    const { id, error } = await startConversation(userId);
    setBusy(false);

    if (error || !id) {
      Alert.alert('Oups', error ?? "Impossible d'ouvrir la conversation.");
      return;
    }
    // "replace" remplace cette fenêtre par la conversation (le retour ramène à la liste).
    router.replace(`/chat/${id}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserRow profile={item.other} onPress={() => open(item.other.id)} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucun contact"
            text="Tu peux écrire uniquement aux personnes en contact avec toi. Invite quelqu'un depuis l'onglet Réseau."
          />
        }
        contentContainerStyle={contacts.length === 0 ? styles.emptyContent : styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
});
