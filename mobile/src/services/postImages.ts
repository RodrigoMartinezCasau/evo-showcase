/**
 * postImages
 *
 * Subida y moderación de fotos para publicaciones (frases / reflexiones).
 *
 * Flujo (moderación BLOQUEANTE antes de publicar):
 *   1. El usuario elige una foto de la galería  → `pickPostImage()`
 *   2. Se comprime y se sube al bucket `post-images/<userId>/<id>.jpg`
 *   3. Se invoca la Edge Function `moderate-image` (AWS Rekognition; bucket `post-images`)
 *      - aprobada  → devolvemos la URL pública para adjuntarla al post
 *      - rechazada → la función borra el objeto; devolvemos el motivo
 *
 * Reusa el mismo patrón que la subida de avatar (`profile-editor.tsx`):
 * expo-image-picker → expo-image-manipulator → supabase.storage.upload.
 *
 * Ver `supabase_post_images.sql` y `supabase/functions/moderate-image/`.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../mobile/lib/supabase';

const POST_IMAGE_BUCKET = 'post-images';

// Lado máximo tras comprimir. Las fotos se muestran a ancho de tarjeta / pantalla;
// 1280px es nítido en retina y mantiene el archivo pequeño (~150-400 KB).
const POST_IMAGE_MAX_DIMENSION = 1280;
const POST_IMAGE_COMPRESSION = 0.8;

export type PickedPostImage = {
  uri: string;
  width: number;
  height: number;
};

export type PostImageModerationResult =
  | { approved: true; imageUrl: string; width: number; height: number }
  | { approved: false; message: string };

/** Abre la galería y devuelve la foto elegida (o null si se cancela). */
export async function pickPostImage(): Promise<PickedPostImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('PERMISSION_DENIED');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    width: a.width ?? POST_IMAGE_MAX_DIMENSION,
    height: a.height ?? POST_IMAGE_MAX_DIMENSION,
  };
}

async function compress(localUri: string): Promise<{ uri: string; width: number; height: number }> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: POST_IMAGE_MAX_DIMENSION } }],
      { compress: POST_IMAGE_COMPRESSION, format: ImageManipulator.SaveFormat.JPEG },
    );
    return { uri: result.uri, width: result.width, height: result.height };
  } catch {
    return { uri: localUri, width: POST_IMAGE_MAX_DIMENSION, height: POST_IMAGE_MAX_DIMENSION };
  }
}

function randomFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Sube la foto y la modera. Devuelve la URL pública SOLO si AWS la aprueba.
 * Si la rechaza (o el moderador falla), no se debe adjuntar al post.
 */
export async function uploadAndModeratePostImage(
  userId: string,
  picked: PickedPostImage,
): Promise<PostImageModerationResult> {
  const processed = await compress(picked.uri);
  const path = `${userId}/${randomFileId()}.jpg`;

  // 1. Subir al bucket
  const response = await fetch(processed.uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    return { approved: false, message: 'No se pudo subir la foto. Inténtalo de nuevo.' };
  }

  // 2. Moderar (Edge Function → AWS Rekognition). Bloqueante.
  let approved = false;
  let message = 'La imagen no cumple las normas de la comunidad.';
  try {
    const { data, error } = await supabase.functions.invoke('moderate-image', {
      body: { path },
    });
    if (error) {
      // Fallo del moderador → borrar la subida y abortar (fail-safe).
      await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]).catch(() => {});
      return {
        approved: false,
        message: 'No se pudo verificar la foto ahora mismo. Inténtalo más tarde.',
      };
    }
    approved = data?.approved === true;
    if (data?.message) message = data.message;
  } catch {
    await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]).catch(() => {});
    return {
      approved: false,
      message: 'No se pudo verificar la foto ahora mismo. Inténtalo más tarde.',
    };
  }

  if (!approved) {
    // La Edge Function ya borra el objeto al rechazarlo; por si acaso, reintentamos.
    await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]).catch(() => {});
    return { approved: false, message };
  }

  const { data: pub } = supabase.storage.from(POST_IMAGE_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) {
    return { approved: false, message: 'No se pudo obtener la foto subida.' };
  }
  return {
    approved: true,
    imageUrl: pub.publicUrl,
    width: processed.width,
    height: processed.height,
  };
}
