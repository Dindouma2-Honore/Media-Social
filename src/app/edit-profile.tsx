import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { USERNAME_HELP, USERNAME_REGEX } from '@/lib/validation';
import { colors, radius } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setNewImage(result.assets[0]);
    }
  };

  const save = async () => {
    if (!session) return;

    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError(USERNAME_HELP);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      // 1) Envoyer la nouvelle photo dans Supabase Storage (si l'utilisateur en a choisi une).
      if (newImage) {
        const mime = newImage.mimeType ?? 'image/jpeg';
        const ext = mime.split('/')[1] ?? 'jpg';
        // Le fichier est rangé dans un dossier portant l'identifiant de l'utilisateur
        // (c'est ce que vérifie la règle de sécurité côté SQL).
        const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

        const response = await fetch(newImage.uri);
        const bytes = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, bytes, { contentType: mime });
        if (uploadError) throw uploadError;

        avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }

      // 2) Mettre à jour la ligne du profil.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          username: cleanUsername,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq('id', session.user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      router.back();
    } catch (e) {
      // 23505 = violation de contrainte d'unicité (nom d'utilisateur déjà pris)
      if ((e as { code?: string })?.code === '23505') {
        setError("Ce nom d'utilisateur est déjà pris.");
      } else {
        setError("Impossible d'enregistrer les modifications. Réessaie.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={pickImage} style={styles.avatarWrapper}>
          <Avatar
            uri={newImage?.uri ?? profile?.avatar_url}
            name={fullName || username}
            size={110}
          />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={18} color={colors.white} />
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Touche la photo pour la changer</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Input label="Nom complet" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Input
          label="Nom d'utilisateur"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          label={`Biographie (${bio.length}/160)`}
          value={bio}
          onChangeText={setBio}
          placeholder="Parle un peu de toi…"
          multiline
          maxLength={160}
          textAlignVertical="top"
          style={styles.bioInput}
        />

        <Button title="Enregistrer" onPress={save} loading={saving} style={styles.save} />
        <Button title="Annuler" variant="outline" onPress={() => router.back()} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarWrapper: {
    alignSelf: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  bioInput: {
    minHeight: 90,
  },
  save: {
    marginTop: 8,
    marginBottom: 12,
  },
});
