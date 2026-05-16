import { NativeModules, Platform } from 'react-native';
import type { TopPhraseWidgetPayload } from './topPhraseWidgetPayload';

/** Keep identical in Swift (EvoWidgetBridge + widget `TimelineProvider`). */
export const IOS_WIDGET_APP_GROUP_ID = 'group.com.evoconn.evo.widget';
export const IOS_WIDGET_SNAPSHOT_USER_DEFAULTS_KEY = 'evoTopPhraseWidgetJSON';

/**
 * Native module available on iOS (Swift) and Android (Kotlin).
 * iOS: writes JSON to App Group UserDefaults + reloads WidgetKit timelines.
 * Android: writes JSON to SharedPreferences + triggers AppWidgetManager.updateAppWidget.
 */
type EvoWidgetBridgeNative = {
  setSnapshot: (json: string) => Promise<void>;
};

const native = NativeModules.EvoWidgetBridge as EvoWidgetBridgeNative | undefined;

export function isWidgetBridgeAvailable(): boolean {
  return typeof native?.setSnapshot === 'function';
}

/** @deprecated Use isWidgetBridgeAvailable() — now cross-platform. */
export function isIosWidgetBridgeAvailable(): boolean {
  return Platform.OS === 'ios' && isWidgetBridgeAvailable();
}

/**
 * Pushes the latest payload to the home-screen widget (iOS + Android).
 * Safe no-op when the native bridge is not available (Expo Go, web).
 */
export async function pushTopPhraseWidgetSnapshot(payload: TopPhraseWidgetPayload | null): Promise<void> {
  if (!isWidgetBridgeAvailable()) return;
  try {
    await native!.setSnapshot(JSON.stringify(payload ?? { kind: 'empty' }));
  } catch {
    // Native widget is best-effort; never break the app
  }
}
