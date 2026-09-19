import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { PROFILE_COLUMNS } from '@/lib/profileColumns';
import { queryClient } from '@/lib/queryClient';
import { uploadJpeg } from '@/lib/uploadImage';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

/**
 * A new object for every photo, never an overwrite of `<user_id>/avatar.jpg`.
 *
 * Everything that shows an avatar is keyed on its path: the signed-URL query,
 * the image cache behind the URL, and your partner's copy of your profile row.
 * Overwriting in place changes none of those, so the old face would keep
 * showing — on both phones — until each cache happened to expire. A new path
 * is a change every one of them can see.
 */
export function newAvatarPath(userId: string): string {
  return `${userId}/avatar-${Date.now()}.jpg`;
}

/** Opens the photo library on a square crop. Resolves null if the user backs out. */
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/**
 * Replaces an existing profile's photo: upload, point the row at it, then
 * publish the new row to the query cache and the store so every `Avatar`
 * re-renders without a refetch.
 *
 * The order matters. The row is only updated once the upload has succeeded, so
 * it never names an object that is not there; the old object is only removed
 * once the row has moved off it, so a failure part-way leaves the old photo
 * intact rather than a broken one.
 */
export async function changeAvatar(userId: string, localUri: string): Promise<Profile> {
  const previousPath = useProfileStore.getState().ownProfile?.avatar_url ?? null;
  const path = await uploadJpeg('avatars', newAvatarPath(userId), localUri);

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    // Nothing refers to the new object; don't leave it behind.
    void supabase.storage
      .from('avatars')
      .remove([path])
      .catch(() => {});
    throw error;
  }

  const profile = data as Profile;
  // Both, and in this order: useProfile copies the query's data into the store
  // whenever it changes, so setting only the store would be undone by the next
  // refetch-driven render, and setting only the cache waits for that effect.
  queryClient.setQueryData(['profile', userId], profile);
  useProfileStore.getState().setOwnProfile(profile);

  if (previousPath && previousPath !== path) {
    // Best effort. A leftover file costs storage, not correctness.
    void supabase.storage
      .from('avatars')
      .remove([previousPath])
      .catch(() => {});
  }

  return profile;
}
