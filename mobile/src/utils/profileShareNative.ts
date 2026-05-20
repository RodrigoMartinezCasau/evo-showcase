import Constants from 'expo-constants';

/** Expo Go no incluye react-native-view-shot ni otros módulos nativos custom. */
export function isExpoGoClient(): boolean {
  return Constants.appOwnership === 'expo';
}

export const PROFILE_SHARE_EXPO_GO_MESSAGE =
  'Compartir el perfil como imagen no está disponible en Expo Go. Prueba con:\n\n' +
  '• Simulador/dispositivo: npx expo run:ios (o run:android) en mobile/mobile\n' +
  '• O la nueva build de TestFlight / internal testing';
