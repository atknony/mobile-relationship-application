import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  type TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadJpeg } from '@/lib/uploadImage';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { CameraGlyph } from '@/components/ui/CameraGlyph';
import { useToast } from '@/components/ui/Toast';
import type { Profile } from '@/types/database';

export default function ProfileSetupScreen() {
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const inputRef = useRef<RNTextInput>(null);
  const isRevealed = useAppStore((s) => s.isRevealed);

  // See the note in (auth)/phone.tsx — `autoFocus` opens the keyboard while the
  // startup cover is still up, and the keyboard draws over the cover.
  useEffect(() => {
    if (isRevealed) inputRef.current?.focus();
  }, [isRevealed]);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    const name = username.trim();
    if (!name || !userId) {
      showToast('Enter a name to continue', 'error');
      return;
    }

    setLoading(true);

    // Upload first: the bucket is private, so the column stores the path and
    // Avatar signs it at display time.
    let avatarPath: string | undefined;
    if (avatarUri) {
      try {
        avatarPath = await uploadJpeg('avatars', `${userId}/avatar.jpg`, avatarUri, {
          upsert: true,
        });
      } catch {
        // A missing photo should not block getting into the app.
        showToast('Could not save your photo — carrying on without it.', 'info');
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, username: name, ...(avatarPath ? { avatar_url: avatarPath } : {}) })
      .select()
      .single();
    setLoading(false);

    if (error) {
      showToast('Could not save profile. Try again.', 'error');
      return;
    }

    setOwnProfile(data as Profile);
    // Root layout sees ownProfile and moves on to pairing.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 bg-imm-bg justify-center"
        style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 24, gap: 32 }}
      >
        <View style={{ gap: 10 }}>
          <Text className="font-display text-imm-text" style={{ fontSize: 32 }}>
            What should they call you?
          </Text>
          <Text className="font-nunito text-imm-muted" style={{ fontSize: 15 }}>
            This is the only name in the app.
          </Text>
        </View>

        <View className="flex-row items-end" style={{ gap: 14 }}>
          <Pressable
            onPress={handlePickAvatar}
            accessibilityLabel="Choose a photo"
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.75)',
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(45,27,105,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 64, height: 64 }} />
            ) : (
              <CameraGlyph width={20} height={16} />
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Your name"
              maxLength={32}
              ref={inputRef}
            />
          </View>
        </View>

        <Button onPress={handleSave} loading={loading}>
          Continue
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
