import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuth } from '@/lib/auth';
import { usePosts } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

const MAX_LENGTH = 500;
const MAX_VIDEO_SECONDS = 60;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo (limite du plan gratuit Supabase)

export default function NewPostScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { refresh } = usePosts();

  const [content, setContent] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVideo = media?.type === 'video';
  const canPublish = content.trim().length > 0 || media !== null;

  // Une publication contient une photo OU une vidéo.
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];

    if (asset.type === 'video') {
      // asset.duration est en millisecondes
      if (asset.duration && asset.duration > MAX_VIDEO_SECONDS * 1000) {
        Alert.alert('Vidéo trop longue', `La durée maximale est de ${MAX_VIDEO_SECONDS} secondes.`);
        return;
      }
    }
    if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
      Alert.alert('Fichier trop lourd', 'La taille maximale est de 50 Mo.');
      return;
    }
    setMedia(asset);
  };

  const publish = async () => {
    if (!session || !canPublish) return;
    setPublishing(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      // 1) Envoyer la photo ou la vidéo dans le bucket "posts".
      if (media) {
        const mime = media.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
        const ext = mime === 'video/quicktime' ? 'mov' : mime.split('/')[1] ?? (isVideo ? 'mp4' : 'jpg');
        const path = `${session.user.id}/${Date.now()}.${ext}`;

        const response = await fetch(media.uri);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_FILE_BYTES) {
          throw new Error('file_too_large');
        }

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(path, bytes, { contentType: mime });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
        if (isVideo) videoUrl = publicUrl;
        else imageUrl = publicUrl;
      }

      // 2) Créer la publication.
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
      });
      if (insertError) throw insertError;

      // 3) Recharger le fil puis fermer la fenêtre.
      await refresh();
      router.back();
    } catch (e) {
      console.warn('Publication impossible', e);
      const message = (e as { message?: string })?.message ?? '';
      setError(
        message === 'file_too_large'
          ? 'Le fichier dépasse 50 Mo.'
          : `La publication a échoué. Vérifie ta connexion et réessaie.${message ? ` (${message})` : ''}`
      );
    } finally {
      setPublishing(false);
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
        <View style={styles.author}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name || profile?.username} size={44} />
          <Text style={styles.authorName}>{profile?.full_name || profile?.username}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Quoi de neuf ?"
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={MAX_LENGTH}
          textAlignVertical="top"
          autoFocus
        />
        <Text style={styles.counter}>
          {content.length}/{MAX_LENGTH}
        </Text>

        {media ? (
          <View style={styles.previewWrapper}>
            {isVideo ? (
              <VideoPlayer uri={media.uri} style={styles.videoPreview} />
            ) : (
              <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" />
            )}
            <Pressable
              style={styles.removeMedia}
              onPress={() => setMedia(null)}
              hitSlop={8}
              disabled={publishing}
            >
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addMedia} onPress={pickMedia}>
            <Ionicons name="images-outline" size={22} color={colors.primary} />
            <Text style={styles.addMediaText}>Ajouter une photo ou une vidéo</Text>
          </Pressable>
        )}
        {!media ? (
          <Text style={styles.hint}>Vidéo : 60 secondes et 50 Mo maximum.</Text>
        ) : null}

        {publishing && isVideo ? (
          <Text style={styles.uploading}>Envoi de la vidéo en cours, cela peut prendre un moment…</Text>
        ) : null}

        <Button
          title="Publier"
          onPress={publish}
          loading={publishing}
          disabled={!canPublish}
          style={styles.publish}
        />
        <Button title="Annuler" variant="outline" onPress={() => router.back()} disabled={publishing} />
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
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorName: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
  input: {
    minHeight: 130,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 17,
    color: colors.text,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
  addMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addMediaText: {
    marginLeft: 8,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
  previewWrapper: {
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  videoPreview: {
    marginTop: 0,
    borderRadius: radius.md,
  },
  removeMedia: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploading: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  publish: {
    marginBottom: 12,
  },
});
