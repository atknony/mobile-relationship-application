import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { seedImage } from '@/lib/imageCache';

const JPEG = 'image/jpeg';

/**
 * Uploads a local JPEG into a private bucket and returns the storage path.
 *
 * Both call sites used to hand supabase-js the React Native
 * `{ uri, type, name }` shape. supabase-js only builds a multipart body for a
 * `Blob` or a `FormData`; anything else is forwarded to fetch untouched, and an
 * unrecognised object does not survive that trip — what reached the bucket was
 * a couple of hundred bytes describing the file rather than the file. The
 * upload returned 200, `data.path` came back, the row stored a valid-looking
 * path, and every `<Image>` pointed at a `text/plain` object. Nothing in the
 * app could report that, which is why photos "uploaded" and never appeared.
 *
 * So read the bytes and pass an ArrayBuffer, which React Native's networking
 * layer sends as binary. `contentType` then has to be set explicitly: the
 * supabase-js default is `text/plain;charset=UTF-8`, and that default is what
 * the broken objects were stored as.
 *
 * `expo-file-system`'s `File` implements Blob structurally but is not an
 * instance of the global `Blob`, so passing one directly would quietly take the
 * same wrong branch.
 */
export async function uploadJpeg(
  bucket: 'moments' | 'avatars',
  path: string,
  uri: string,
  { upsert = false }: { upsert?: boolean } = {}
): Promise<string> {
  // bytes(), not arrayBuffer(): the latter hands back `.buffer`, which is only
  // the file when the view happens to span the whole allocation.
  const bytes = await new File(uri).bytes();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: JPEG, upsert });

  if (error) throw error;
  // The sender already has these bytes; never make them download their own photo.
  await seedImage(bucket, data.path, uri);
  return data.path;
}
