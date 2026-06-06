/**
 * avatarImages — subida y moderación de foto de perfil (mismo flujo que postImages).
 *
 * 1. Sube a `avatars/<userId>.pending.jpg` (no toca el avatar publicado).
 * 2. Edge Function `moderate-image` → AWS Rekognition.
 * 3. Si aprueba → promueve a `<userId>.jpg` y devuelve URL pública.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../mobile/lib/supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_DIMENSION = 512;
const AVATAR_COMPRESSION = 0.8;

export type AvatarModerationResult =
  | { approved: true; publicUrl: string }
  | { approved: false; message: string };

async function compressAvatar(localUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: AVATAR_MAX_DIMENSION, height: AVATAR_MAX_DIMENSION } }],
      {
        compress: AVATAR_COMPRESSION,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return result.uri;
  } catch {
    return localUri;
  }
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Response(blob).arrayBuffer();
}

/**
 * Sube, modera y publica el avatar. Solo actualiza Storage si AWS aprueba.
 */
export async function uploadAndModerateAvatar(
  userId: string,
  localUri: string,
): Promise<AvatarModerationResult> {
  const processedUri = await compressAvatar(localUri);
  const pendingPath = `${userId}.pending.jpg`;
  const finalPath = `${userId}.jpg`;

  const arrayBuffer = await uriToArrayBuffer(processedUri);

  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(pendingPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    return { approved: false, message: 'No se pudo subir la foto. Inténtalo de nuevo.' };
  }

  let approved = false;
  let message = 'La imagen no cumple las normas de la comunidad.';
  try {
    const { data, error } = await supabase.functions.invoke('moderate-image', {
      body: { bucket: AVATAR_BUCKET, path: pendingPath },
    });
    if (error) {
      await supabase.storage.from(AVATAR_BUCKET).remove([pendingPath]).catch(() => {});
      return {
        approved: false,
        message: 'No se pudo verificar la foto ahora mismo. Inténtalo más tarde.',
      };
    }
    approved = data?.approved === true;
    if (data?.message) message = data.message;
  } catch {
    await supabase.storage.from(AVATAR_BUCKET).remove([pendingPath]).catch(() => {});
    return {
      approved: false,
      message: 'No se pudo verificar la foto ahora mismo. Inténtalo más tarde.',
    };
  }

  if (!approved) {
    await supabase.storage.from(AVATAR_BUCKET).remove([pendingPath]).catch(() => {});
    return { approved: false, message };
  }

  const { error: promoteErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(finalPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  await supabase.storage.from(AVATAR_BUCKET).remove([pendingPath]).catch(() => {});

  if (promoteErr) {
    return { approved: false, message: 'No se pudo guardar la foto. Inténtalo de nuevo.' };
  }

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(finalPath);
  if (!pub?.publicUrl) {
    return { approved: false, message: 'No se pudo obtener la foto subida.' };
  }

  return { approved: true, publicUrl: `${pub.publicUrl}?t=${Date.now()}` };
}
