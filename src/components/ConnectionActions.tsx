import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { useNetwork } from '@/lib/network';

type Props = {
  /** Identifiant de l'autre personne. */
  userId: string;
  /** Boutons compacts (listes) ou pleine largeur (page de profil). */
  small?: boolean;
};

// Affiche les bons boutons selon la relation avec la personne :
//   aucune relation       → [Inviter]
//   invitation envoyée    → [Annuler]
//   invitation reçue      → [Accepter] [Refuser]
//   en contact            → [Retirer]
export function ConnectionActions({ userId, small = true }: Props) {
  const { connectionWith, sendInvitation, accept, remove } = useNetwork();
  const [busy, setBusy] = useState(false);
  const connection = connectionWith(userId);
  const grow = small ? undefined : styles.grow;

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    const error = await action();
    setBusy(false);
    if (error) Alert.alert('Oups', error);
  };

  const confirmRemove = (title: string, message: string, confirmLabel: string, id: string) => {
    Alert.alert(title, message, [
      { text: 'Non', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: () => run(() => remove(id)) },
    ]);
  };

  // Aucune relation
  if (!connection) {
    return (
      <View style={styles.row}>
        <Button
          small={small}
          title="Inviter"
          onPress={() => run(() => sendInvitation(userId))}
          loading={busy}
          style={grow}
        />
      </View>
    );
  }

  // En contact
  if (connection.status === 'accepted') {
    return (
      <View style={styles.row}>
        <Button
          small={small}
          variant="danger"
          title="Retirer des contacts"
          onPress={() =>
            confirmRemove('Retirer ce contact', 'Vous ne serez plus en contact.', 'Retirer', connection.id)
          }
          loading={busy}
          style={grow}
        />
      </View>
    );
  }

  // Invitation envoyée par moi
  if (connection.direction === 'sent') {
    return (
      <View style={styles.row}>
        <Button
          small={small}
          variant="outline"
          title="Annuler l'invitation"
          onPress={() => run(() => remove(connection.id))}
          loading={busy}
          style={grow}
        />
      </View>
    );
  }

  // Invitation reçue
  return (
    <View style={styles.row}>
      <Button
        small={small}
        title="Accepter"
        onPress={() => run(() => accept(connection.id))}
        loading={busy}
        style={grow}
      />
      <Button
        small={small}
        variant="danger"
        title="Refuser"
        onPress={() => run(() => remove(connection.id))}
        disabled={busy}
        style={grow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
});
