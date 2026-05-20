import { Alert, Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import type { RefObject } from 'react';
import type ViewShot from 'react-native-view-shot';
import {
  getAppProfileOpenUrl,
  getPublicProfileWebUrl,
} from '@evoconn/utils/appShareLinks';

function buildShareMessage(username: string, userId: string): string {
  const web = getPublicProfileWebUrl(userId);
  const app = getAppProfileOpenUrl(userId);
  return `Mira el perfil de ${username} en EVO\n\n${web}\n\nAbrir en la app:\n${app}`;
}

async function waitForCaptureReady(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((r) => setTimeout(r, 200));
}

/**
 * Captura un View (tarjeta de perfil) y abre el diálogo nativo de compartir con PNG + enlace.
 */
export async function captureAndShareProfileCard(
  viewRef: RefObject<ViewShot | null>,
  options: { username: string; userId: string },
): Promise<void> {
  if (!viewRef.current) {
    Alert.alert('Error', 'No se pudo preparar la imagen del perfil.');
    return;
  }

  await waitForCaptureReady();

  let pngUri: string;
  try {
    pngUri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  } catch (e) {
    if (__DEV__) console.warn('[shareProfile] capture failed:', e);
    const msg = e instanceof Error ? e.message : String(e);
    const nativeMissing =
      /native module|RNCViewShot|ViewShot|not found|undefined/i.test(msg);
    Alert.alert(
      'No se pudo generar la imagen',
      nativeMissing
        ? 'Falta el módulo nativo de captura. Haz un build con npx expo run:ios (simulador) o instala la build nueva de TestFlight — no funciona en Expo Go.'
        : 'Inténtalo de nuevo en unos segundos.',
    );
    return;
  }

  const message = buildShareMessage(options.username, options.userId);

  try {
    const title = `Perfil de ${options.username}`;

    if (Platform.OS === 'ios') {
      await Share.share({ url: pngUri, message, title });
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pngUri, {
        mimeType: 'image/png',
        dialogTitle: title,
        UTI: 'public.png',
      });
      return;
    }

    await Share.share({ message, title });
  } catch (e) {
    const err = e as { message?: string };
    if (err?.message?.toLowerCase().includes('cancel')) return;
    Alert.alert('Error', 'No se pudo abrir el menú de compartir.');
  }
}

/** Guarda el PNG en la galería (opcional, p. ej. desde ajustes). */
export async function saveProfileCaptureToGallery(
  viewRef: RefObject<ViewShot | null>,
): Promise<boolean> {
  if (!viewRef.current) return false;

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso necesario', 'Activa el acceso a fotos para guardar la imagen.');
    return false;
  }

  await waitForCaptureReady();
  const uri = await captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' });
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
