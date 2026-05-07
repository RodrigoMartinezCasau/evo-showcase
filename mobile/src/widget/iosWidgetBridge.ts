import { NativeModules, Platform } from 'react-native';
import type { TopPhraseWidgetPayload } from './topPhraseWidgetPayload';

/** Keep identical in Swift (EvoWidgetBridge + widget `TimelineProvider`). */
export const IOS_WIDGET_APP_GROUP_ID = 'group.com.evoconn.evo.widget';
export const IOS_WIDGET_SNAPSHOT_USER_DEFAULTS_KEY = 'evoTopPhraseWidgetJSON';

/**
 * Optional native module implemented in the iOS app target (not in Expo Go).
 * After you add the module + Widget extension in Xcode, implement:
 *   @objc func setSnapshot(_ json: String, …)
 * and write JSON into App Group UserDefaults, then WidgetCenter.shared.reloadTimelines(…).
 */
type EvoWidgetBridgeNative = {
  setSnapshot: (json: string) => Promise<void>;
};

const native = NativeModules.EvoWidgetBridge as EvoWidgetBridgeNative | undefined;

export function isIosWidgetBridgeAvailable(): boolean {
  return Platform.OS === 'ios' && typeof native?.setSnapshot === 'function';
}

/**
 * Pushes the latest payload to the widget layer. Safe no-op when the bridge is missing.
 */
export async function pushTopPhraseWidgetSnapshot(payload: TopPhraseWidgetPayload | null): Promise<void> {
  if (!isIosWidgetBridgeAvailable()) return;
  try {
    await native!.setSnapshot(JSON.stringify(payload ?? { kind: 'empty' }));
  } catch {
    // Native widget is best-effort; never break the app
  }
}
